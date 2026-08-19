import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { NoteEvent, NoteSegmentationUtil, PitchFrame, SegmentationOptions } from "../../utils/note-segmentation.util";
import { DetectedNote, PitchUtil } from "../../utils/pitch.util";
import { AubioLoaderService, AubioModule } from "./aubio-loader.service";

export type PitchDetectionStatus = "idle" | "loading" | "listening" | "analysing" | "error";

/**
 * One analysis window. 2048 samples is about 46 ms at 44.1 kHz — long enough to
 * contain a full cycle of the guitar's lowest note (82 Hz needs 12 ms) with
 * margin, short enough to follow a sung phrase.
 */
const BLOCK_SIZE = 2048;

/**
 * The Web Audio boundary. Nothing else in the app touches a microphone, an
 * AudioContext or aubio — which is what lets every piece of musical reasoning
 * live in `src/app/utils/` and be tested with plain arrays.
 *
 * aubio itself is fetched on demand by AubioLoaderService, so its 400 kB only
 * reaches a user who actually opens the pitch monitor.
 */
@Injectable({
  providedIn: "root",
})
export class PitchDetectionService {
  private readonly status$ = new BehaviorSubject<PitchDetectionStatus>("idle");
  private readonly currentNote$ = new BehaviorSubject<DetectedNote | null>(null);
  private readonly frames$ = new BehaviorSubject<PitchFrame[]>([]);
  private readonly errorMessage$ = new BehaviorSubject<string | null>(null);

  private readonly aubioLoaderService = inject(AubioLoaderService);

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  getStatus$(): Observable<PitchDetectionStatus> {
    return this.status$.asObservable();
  }

  getStatus(): PitchDetectionStatus {
    return this.status$.getValue();
  }

  getCurrentNote$(): Observable<DetectedNote | null> {
    return this.currentNote$.asObservable();
  }

  getCurrentNote(): DetectedNote | null {
    return this.currentNote$.getValue();
  }

  getFrames$(): Observable<PitchFrame[]> {
    return this.frames$.asObservable();
  }

  getFrames(): PitchFrame[] {
    return this.frames$.getValue();
  }

  getErrorMessage$(): Observable<string | null> {
    return this.errorMessage$.asObservable();
  }

  getErrorMessage(): string | null {
    return this.errorMessage$.getValue();
  }

  /** The frames heard so far, grouped into notes. */
  getNotes(options: SegmentationOptions = {}): NoteEvent[] {
    return NoteSegmentationUtil.segment(this.getFrames(), options);
  }

  async startMicrophone(): Promise<void> {
    if (this.getStatus() === "listening") return;

    this.errorMessage$.next(null);
    this.status$.next("loading");

    try {
      const aubio = await this.aubioLoaderService.load();
      // Raw audio: every one of these flags is on by default and every one
      // damages pitch detection. Noise suppression attacks a sustained tone as
      // if it were background hum, and automatic gain control changes amplitude
      // mid-note, which makes the onset detector invent attacks.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      this.mediaStream = stream;
      this.startGraph(aubio, stream);
      this.status$.next("listening");
    } catch (error: unknown) {
      console.error("[PitchDetectionService] startMicrophone failed:", error);
      this.stop();
      this.errorMessage$.next(PitchDetectionService.describe(error));
      this.status$.next("error");
    }
  }

  stop(): void {
    if (this.processor !== null) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    this.sourceNode?.disconnect();
    this.sourceNode = null;

    // Stopping the tracks is what turns the browser's recording indicator off.
    // Closing the context alone leaves it lit, which a user reasonably reads as
    // the app still listening.
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    this.audioContext?.close();
    this.audioContext = null;

    this.currentNote$.next(null);
    if (this.getStatus() !== "error") this.status$.next("idle");
  }

  /**
   * Reads a whole audio file through the same detectors.
   *
   * Offline the blocks are exactly contiguous and none are dropped, so this is
   * strictly better material for onset detection than the live path — the
   * transcription of a recording is more reliable than the live readout of the
   * same performance.
   *
   * What it cannot do is separate one instrument from a mix. Given a full
   * recording it will follow whatever is loudest from moment to moment, which
   * is not a melody. The interface says so; this is where the honesty has to
   * live, not in the algorithm.
   */
  async analyseFile(file: File): Promise<void> {
    this.errorMessage$.next(null);
    this.status$.next("loading");

    const audioContext = new AudioContext();

    try {
      const aubio = await this.aubioLoaderService.load();
      const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());

      this.status$.next("analysing");
      this.frames$.next(PitchDetectionService.analyseBuffer(aubio, audioBuffer));
      this.currentNote$.next(null);
      this.status$.next("idle");
    } catch (error: unknown) {
      console.error("[PitchDetectionService] analyseFile failed:", error);
      this.errorMessage$.next(PitchDetectionService.describeFile(error));
      this.status$.next("error");
    } finally {
      audioContext.close();
    }
  }

  /** Clears what was heard. The frames survive `stop()` so a take can be kept. */
  reset(): void {
    this.frames$.next([]);
    this.currentNote$.next(null);
    this.errorMessage$.next(null);
  }

  private startGraph(aubio: AubioModule, stream: MediaStream): void {
    const audioContext = new AudioContext();
    this.audioContext = audioContext;

    const pitchDetector = new aubio.Pitch("yinfft", BLOCK_SIZE, BLOCK_SIZE, audioContext.sampleRate);
    const onsetDetector = new aubio.Onset(BLOCK_SIZE, BLOCK_SIZE, audioContext.sampleRate);

    // A ScriptProcessorNode rather than an AnalyserNode read from
    // requestAnimationFrame, deliberately. An analyser hands back overlapping
    // snapshots and silently drops whatever falls between two frames, and
    // aubio's onset detection is built on the difference between *consecutive*
    // blocks — feeding it gapped, overlapping ones is exactly how you lose the
    // capability the dependency was taken on for. This node is deprecated;
    // an AudioWorklet is the eventual replacement, and it needs a separate
    // module file, which is the only reason it is not here yet.
    const processor = audioContext.createScriptProcessor(BLOCK_SIZE, 1, 1);
    this.processor = processor;

    // Time comes from the samples, not from the wall clock: blocks arrive at a
    // fixed rate, so the block index is exact, and it stays exact when the main
    // thread stalls. Note durations depend on this, and Date.now() would also
    // collapse to a single value whenever several blocks are handled inside one
    // millisecond.
    const millisecondsPerBlock = (BLOCK_SIZE / audioContext.sampleRate) * 1000;
    let blockIndex = 0;

    processor.onaudioprocess = (event) => {
      const samples = event.inputBuffer.getChannelData(0);
      const frequency = pitchDetector.do(samples);
      const isOnset = onsetDetector.do(samples) !== 0;

      this.pushFrame({ timeMs: blockIndex * millisecondsPerBlock, frequency, isOnset });
      blockIndex += 1;
    };

    const sourceNode = audioContext.createMediaStreamSource(stream);
    this.sourceNode = sourceNode;
    sourceNode.connect(processor);
    // A ScriptProcessorNode only fires once it is connected to a destination.
    // Nothing is written to the output buffer, so nothing is played back.
    processor.connect(audioContext.destination);
  }

  private pushFrame(frame: PitchFrame): void {
    this.frames$.next([...this.getFrames(), frame]);
    this.currentNote$.next(PitchUtil.frequencyToNote(frame.frequency));
  }

  private static analyseBuffer(aubio: AubioModule, audioBuffer: AudioBuffer): PitchFrame[] {
    const pitchDetector = new aubio.Pitch("yinfft", BLOCK_SIZE, BLOCK_SIZE, audioBuffer.sampleRate);
    const onsetDetector = new aubio.Onset(BLOCK_SIZE, BLOCK_SIZE, audioBuffer.sampleRate);

    const samples = audioBuffer.getChannelData(0);
    const millisecondsPerBlock = (BLOCK_SIZE / audioBuffer.sampleRate) * 1000;
    const frames: PitchFrame[] = [];

    // A partial final block is dropped rather than zero-padded: padding invents
    // a silence the detector would read as the end of a note.
    for (let blockIndex = 0; (blockIndex + 1) * BLOCK_SIZE <= samples.length; blockIndex += 1) {
      const block = samples.subarray(blockIndex * BLOCK_SIZE, (blockIndex + 1) * BLOCK_SIZE);

      frames.push({
        timeMs: blockIndex * millisecondsPerBlock,
        frequency: pitchDetector.do(block),
        isOnset: onsetDetector.do(block) !== 0,
      });
    }

    return frames;
  }

  private static describeFile(error: unknown): string {
    if (error instanceof Error && error.name === "EncodingError") {
      return "That audio file could not be decoded. Try a WAV, MP3 or M4A file.";
    }
    return error instanceof Error ? error.message : "That audio file could not be read.";
  }

  private static describe(error: unknown): string {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return "Microphone access was refused. Allow it in the browser, then try again.";
    }
    if (error instanceof Error && error.name === "NotFoundError") {
      return "No microphone was found.";
    }
    return error instanceof Error ? error.message : "The microphone could not be started.";
  }
}

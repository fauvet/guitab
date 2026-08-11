import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { NoteEvent, NoteSegmentationUtil, PitchFrame, SegmentationOptions } from "../../utils/note-segmentation.util";
import { DetectedNote, PitchUtil } from "../../utils/pitch.util";

export type PitchDetectionStatus = "idle" | "loading" | "listening" | "analysing" | "error";

/**
 * One analysis window. 2048 samples is about 46 ms at 44.1 kHz — long enough to
 * contain a full cycle of the guitar's lowest note (82 Hz needs 12 ms) with
 * margin, short enough to follow a sung phrase.
 */
const BLOCK_SIZE = 2048;

/** The minimal slice of aubio's API this service uses. See the aubiojs types. */
interface AubioDetector {
  do(buffer: Float32Array): number;
}

interface AubioModule {
  Pitch: new (method: string, bufferSize: number, hopSize: number, sampleRate: number) => AubioDetector;
  Onset: new (bufferSize: number, hopSize: number, sampleRate: number) => AubioDetector;
}

/**
 * The Web Audio boundary. Nothing else in the app touches a microphone, an
 * AudioContext or aubio — which is what lets every piece of musical reasoning
 * live in `src/app/utils/` and be tested with plain arrays.
 *
 * aubio is loaded with a dynamic `import()`, so its 400 kB of WebAssembly only
 * reaches a user who actually opens the pitch monitor. The binary is inlined in
 * the module as a data URI, so there is no separate file to fetch and nothing to
 * add to the service worker's asset list.
 */
@Injectable({
  providedIn: "root",
})
export class PitchDetectionService {
  private readonly status$ = new BehaviorSubject<PitchDetectionStatus>("idle");
  private readonly currentNote$ = new BehaviorSubject<DetectedNote | null>(null);
  private readonly frames$ = new BehaviorSubject<PitchFrame[]>([]);
  private readonly errorMessage$ = new BehaviorSubject<string | null>(null);

  private aubio: AubioModule | null = null;
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
      const aubio = await this.loadAubio();
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

  /**
   * Loaded once per session and kept: initialising the WebAssembly module takes
   * long enough to be visible, and a user toggling recording on and off should
   * not pay it every time.
   */
  private async loadAubio(): Promise<AubioModule> {
    if (this.aubio !== null) return this.aubio;

    const { default: initialiseAubio } = await import("aubiojs");
    this.aubio = (await initialiseAubio()) as unknown as AubioModule;
    return this.aubio;
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

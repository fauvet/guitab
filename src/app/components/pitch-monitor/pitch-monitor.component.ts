import { AsyncPipe, DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { PitchDetectionService, PitchDetectionStatus } from "../../services/pitch-detection/pitch-detection.service";
import { FretboardUtil } from "../../utils/fretboard.util";
import { NoteSegmentationUtil, PitchFrame } from "../../utils/note-segmentation.util";
import { GridLine, PitchTraceUtil, TraceViewport } from "../../utils/pitch-trace.util";
import { DetectedNote, PitchUtil } from "../../utils/pitch.util";
import { SoloTabInputUtil } from "../../utils/solo-tab-input.util";

/** `auto` lets the tool pick the octave; the rest are the player overriding it. */
export type OctaveChoice = "auto" | "-1" | "0" | "+1" | "+2";

const VIEWPORT: TraceViewport = {
  width: 600,
  height: 200,
  // C2 to C6: the whole guitar plus the range a person can comfortably hum.
  lowestMidi: 36,
  highestMidi: 84,
  windowMs: 6000,
};

@Component({
  selector: "app-pitch-monitor",
  imports: [
    AsyncPipe,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: "./pitch-monitor.component.html",
  styleUrl: "./pitch-monitor.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PitchMonitorComponent implements OnInit, OnDestroy {
  private readonly pitchDetectionService = inject(PitchDetectionService);
  private readonly unsubscribe$ = new Subject<void>();

  /** Emits the tab-editor lines for the phrase that was heard. */
  readonly transcribed = output<string>();

  readonly viewport = VIEWPORT;

  readonly status$ = new BehaviorSubject<PitchDetectionStatus>("idle");
  readonly currentNote$ = new BehaviorSubject<DetectedNote | null>(null);
  readonly errorMessage$ = new BehaviorSubject<string | null>(null);
  readonly traceSegments$ = new BehaviorSubject<string[]>([]);
  readonly noteNames$ = new BehaviorSubject<string[]>([]);

  readonly gridLines: GridLine[] = PitchTraceUtil.gridLines(VIEWPORT);

  octaveChoice: OctaveChoice = "auto";
  preferredFret = 12;

  ngOnInit(): void {
    this.pitchDetectionService
      .getStatus$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((status) => this.status$.next(status));

    this.pitchDetectionService
      .getCurrentNote$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((note) => this.currentNote$.next(note));

    this.pitchDetectionService
      .getErrorMessage$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((message) => this.errorMessage$.next(message));

    this.pitchDetectionService
      .getFrames$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((frames) => this.onFramesChanged(frames));
  }

  ngOnDestroy(): void {
    // Leaving the microphone open after the dialog closes would keep the
    // browser's recording indicator lit with nothing on screen to explain it.
    this.pitchDetectionService.stop();
    this.unsubscribe$.next();
  }

  /** The note being heard, as `A#3` — the octave is what disambiguates it. */
  formatNote(note: DetectedNote): string {
    return PitchUtil.formatNote(note);
  }

  isRecording(): boolean {
    return this.status$.getValue() === "listening";
  }

  isBusy(): boolean {
    const status = this.status$.getValue();
    return status === "loading" || status === "analysing";
  }

  async onRecordClicked(): Promise<void> {
    if (this.isRecording()) {
      this.pitchDetectionService.stop();
      return;
    }

    this.pitchDetectionService.reset();
    await this.pitchDetectionService.startMicrophone();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.pitchDetectionService.reset();
    await this.pitchDetectionService.analyseFile(file);
  }

  onClearClicked(): void {
    this.pitchDetectionService.reset();
  }

  /**
   * Turns what was heard into tab-editor lines and hands them up.
   *
   * The octave shift is applied *here*, not to the display: the monitor shows
   * the note actually sung so the player can see the tool heard them correctly,
   * and the transposition into guitar range happens only on the way to the tab.
   */
  onInsertClicked(): void {
    const midiNotes = NoteSegmentationUtil.toMidiSequence(
      NoteSegmentationUtil.segment(this.pitchDetectionService.getFrames()),
    );
    if (midiNotes.length === 0) return;

    const shifted = FretboardUtil.transpose(midiNotes, this.resolveOctaveShift(midiNotes));
    const positions = FretboardUtil.mapNotes(shifted, { preferredFret: this.preferredFret });

    this.transcribed.emit(SoloTabInputUtil.fromFretPositions(positions));
  }

  private resolveOctaveShift(midiNotes: number[]): number {
    if (this.octaveChoice === "auto") return FretboardUtil.chooseOctaveShift(midiNotes, this.preferredFret);
    return Number(this.octaveChoice);
  }

  private onFramesChanged(frames: PitchFrame[]): void {
    this.traceSegments$.next(PitchTraceUtil.toSegments(frames, VIEWPORT));
    this.noteNames$.next(
      NoteSegmentationUtil.segment(frames).map((note) => {
        const { name, octave } = PitchUtil.midiToNoteName(note.midi);
        return `${name}${octave}`;
      }),
    );
  }
}

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject } from "rxjs";
import { PitchDetectionService, PitchDetectionStatus } from "../../services/pitch-detection/pitch-detection.service";
import { PitchFrame } from "../../utils/note-segmentation.util";
import { DetectedNote, PitchUtil } from "../../utils/pitch.util";
import { PitchMonitorComponent } from "./pitch-monitor.component";

/** A run of frames at one pitch, 10 ms apart. */
const frames = (midi: number, count: number, startMs = 0, onsetAtFirst = false): PitchFrame[] =>
  Array.from({ length: count }, (_, index) => ({
    timeMs: startMs + index * 10,
    frequency: PitchUtil.midiToFrequency(midi),
    isOnset: index === 0 && onsetAtFirst,
  }));

describe("PitchMonitorComponent", () => {
  let component: PitchMonitorComponent;
  let fixture: ComponentFixture<PitchMonitorComponent>;
  let status$: BehaviorSubject<PitchDetectionStatus>;
  let currentNote$: BehaviorSubject<DetectedNote | null>;
  let errorMessage$: BehaviorSubject<string | null>;
  let frames$: BehaviorSubject<PitchFrame[]>;

  const pitchDetectionService = {
    getStatus$: vi.fn(),
    getCurrentNote$: vi.fn(),
    getErrorMessage$: vi.fn(),
    getFrames$: vi.fn(),
    getFrames: vi.fn(),
    startMicrophone: vi.fn(),
    analyseFile: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    status$ = new BehaviorSubject<PitchDetectionStatus>("idle");
    currentNote$ = new BehaviorSubject<DetectedNote | null>(null);
    errorMessage$ = new BehaviorSubject<string | null>(null);
    frames$ = new BehaviorSubject<PitchFrame[]>([]);

    pitchDetectionService.getStatus$.mockReturnValue(status$);
    pitchDetectionService.getCurrentNote$.mockReturnValue(currentNote$);
    pitchDetectionService.getErrorMessage$.mockReturnValue(errorMessage$);
    pitchDetectionService.getFrames$.mockReturnValue(frames$);
    pitchDetectionService.getFrames.mockReturnValue([]);
    pitchDetectionService.startMicrophone.mockResolvedValue(undefined);
    pitchDetectionService.analyseFile.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [PitchMonitorComponent, NoopAnimationsModule],
      providers: [{ provide: PitchDetectionService, useValue: pitchDetectionService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PitchMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("showing what is heard", () => {
    it("should show the note with its octave, so two A's read differently", () => {
      currentNote$.next({ name: "A", octave: 3, midi: 57, cents: 0 });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain("A3");
    });

    it("should show how far off the note is", () => {
      currentNote$.next({ name: "A", octave: 4, midi: 69, cents: 12 });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain("+12 cents");
    });

    it("should announce the reading to a screen reader as it settles", () => {
      currentNote$.next({ name: "A", octave: 4, midi: 69, cents: 0 });
      fixture.detectChanges();

      const reading = fixture.nativeElement.querySelector('[role="status"]');
      expect(reading.textContent).toContain("A4");
    });

    // The trace updates many times a second. Announcing it would drown out
    // everything else a screen reader has to say.
    it("should hide the scrolling trace from assistive technology", () => {
      const trace = fixture.nativeElement.querySelector('[data-testid="pitch-trace"]');

      expect(trace.getAttribute("aria-hidden")).toBe("true");
    });

    it("should draw a line once a pitch has been heard", () => {
      frames$.next(frames(69, 10));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll(".trace-line").length).toBeGreaterThan(0);
    });

    it("should list the notes it segmented, which is the accessible version of the trace", () => {
      frames$.next([...frames(69, 15), ...frames(71, 15, 150)]);
      fixture.detectChanges();

      expect(component.noteNames$.getValue()).toEqual(["A4", "B4"]);
    });
  });

  describe("recording", () => {
    it("should start listening when asked", async () => {
      await component.onRecordClicked();

      expect(pitchDetectionService.startMicrophone).toHaveBeenCalled();
    });

    it("should clear the previous take before starting a new one", async () => {
      await component.onRecordClicked();

      expect(pitchDetectionService.reset).toHaveBeenCalled();
    });

    it("should stop when asked again", async () => {
      status$.next("listening");

      await component.onRecordClicked();

      expect(pitchDetectionService.stop).toHaveBeenCalled();
      expect(pitchDetectionService.startMicrophone).not.toHaveBeenCalled();
    });

    // A microphone left open after the dialog closes lights the browser's
    // recording indicator with nothing on screen to explain it.
    it("should release the microphone when it goes away", () => {
      fixture.destroy();

      expect(pitchDetectionService.stop).toHaveBeenCalled();
    });

    it("should show an error when the microphone could not be started", () => {
      errorMessage$.next("Microphone access was refused.");
      fixture.detectChanges();

      const alert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert.textContent).toContain("refused");
    });

    it("should warn that an audio file has to hold a single melody line", () => {
      expect(fixture.nativeElement.textContent).toContain("single melody line");
    });
  });

  describe("handing the phrase to the editor", () => {
    it("should emit tab lines for what was heard", () => {
      pitchDetectionService.getFrames.mockReturnValue([...frames(69, 15), ...frames(71, 15, 150)]);
      const emitted: string[] = [];
      component.transcribed.subscribe((lines) => emitted.push(lines));

      component.onInsertClicked();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].split("\n")).toHaveLength(2);
    });

    it("should emit nothing when nothing was heard", () => {
      pitchDetectionService.getFrames.mockReturnValue([]);
      const emitted: string[] = [];
      component.transcribed.subscribe((lines) => emitted.push(lines));

      component.onInsertClicked();

      expect(emitted).toEqual([]);
    });

    // A voice sits one to two octaves below a lead guitar line, so the sung
    // register and the played register are not the same.
    it("should transpose a hummed phrase upwards under the auto setting", () => {
      pitchDetectionService.getFrames.mockReturnValue([...frames(45, 15), ...frames(47, 15, 150)]);
      component.octaveChoice = "auto";
      let lines = "";
      component.transcribed.subscribe((emitted) => (lines = emitted));

      component.onInsertClicked();

      // Sung at A2 and B2, played nowhere near the bottom of the neck.
      const firstFret = Number(
        lines
          .split("\n")[0]
          .split(" ")
          .find((column) => column !== "-"),
      );
      expect(firstFret).toBeGreaterThan(4);
    });

    it("should respect an explicit octave choice over the automatic one", () => {
      pitchDetectionService.getFrames.mockReturnValue(frames(64, 20));
      component.octaveChoice = "0";
      let lines = "";
      component.transcribed.subscribe((emitted) => (lines = emitted));

      component.onInsertClicked();

      // E4 is played as sung rather than lifted an octave, so it lands near the
      // preferred fret on one of the middle strings — never at the very top of
      // the neck, which is where the automatic shift would have put it.
      const fret = Number(lines.split(" ").find((column) => column !== "-"));
      expect(fret).toBeGreaterThanOrEqual(9);
      expect(fret).toBeLessThanOrEqual(14);
    });

    it("should put the phrase where the player asked for it on the neck", () => {
      pitchDetectionService.getFrames.mockReturnValue(frames(64, 20));
      component.octaveChoice = "0";
      component.preferredFret = 0;
      let lines = "";
      component.transcribed.subscribe((emitted) => (lines = emitted));

      component.onInsertClicked();

      expect(lines).toBe("0 - - - - -");
    });
  });
});

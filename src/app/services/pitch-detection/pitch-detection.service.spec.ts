import { TestBed } from "@angular/core/testing";
import { PitchDetectionService } from "./pitch-detection.service";
import { PitchUtil } from "../../utils/pitch.util";

// aubio is a WebAssembly module: it cannot run under jsdom, and its accuracy is
// not ours to re-test. What these tests check is the wiring around it — that
// frames reach the subjects, that onsets are carried through, and above all
// that stopping releases the microphone.
const { aubioState } = vi.hoisted(() => ({
  aubioState: {
    frequency: 0,
    onset: 0,
    initialised: 0,
  },
}));

vi.mock("aubiojs", () => ({
  default: vi.fn(async () => {
    aubioState.initialised += 1;
    return {
      Pitch: class {
        do(): number {
          return aubioState.frequency;
        }
      },
      Onset: class {
        do(): number {
          return aubioState.onset;
        }
      },
      Tempo: class {},
    };
  }),
}));

interface FakeProcessor {
  onaudioprocess: ((event: { inputBuffer: { getChannelData(channel: number): Float32Array } }) => void) | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

describe("PitchDetectionService", () => {
  let service: PitchDetectionService;
  let track: { stop: ReturnType<typeof vi.fn> };
  let processor: FakeProcessor;
  let audioContextClose: ReturnType<typeof vi.fn>;
  let getUserMedia: ReturnType<typeof vi.fn>;

  /** Pushes one block of samples through the fake audio graph. */
  const emitAudioBlock = (): void => {
    processor.onaudioprocess?.({ inputBuffer: { getChannelData: () => new Float32Array(2048) } });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    aubioState.frequency = 0;
    aubioState.onset = 0;
    aubioState.initialised = 0;

    track = { stop: vi.fn() };
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track] });
    audioContextClose = vi.fn().mockResolvedValue(undefined);

    processor = { onaudioprocess: null, connect: vi.fn(), disconnect: vi.fn() };

    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    // A class, not a vi.fn(): a mock function is not constructible, and `new`
    // on one throws a TypeError whose message is the function's own source —
    // which the service then reports as if the microphone had failed.
    vi.stubGlobal(
      "AudioContext",
      class {
        sampleRate = 44100;
        state = "running";
        destination = {};
        resume = vi.fn().mockResolvedValue(undefined);
        close = audioContextClose;
        createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
        createScriptProcessor = vi.fn(() => processor);
        decodeAudioData = vi.fn();
      },
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(PitchDetectionService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should start idle, with nothing detected", () => {
    expect(service.getStatus()).toBe("idle");
    expect(service.getCurrentNote()).toBeNull();
    expect(service.getFrames()).toEqual([]);
  });

  describe("starting the microphone", () => {
    it("should end up listening", async () => {
      await service.startMicrophone();

      expect(service.getErrorMessage()).toBeNull();
      expect(service.getStatus()).toBe("listening");
    });

    // Every one of these is on by default and every one damages pitch
    // detection: they are tuned for speech, not for sustained tones.
    it("should ask for raw audio, with the speech processing turned off", async () => {
      await service.startMicrophone();

      expect(getUserMedia).toHaveBeenCalledWith({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    });

    it("should report an error rather than throwing when permission is denied", async () => {
      getUserMedia.mockRejectedValue(new Error("Permission denied"));

      await service.startMicrophone();

      expect(service.getStatus()).toBe("error");
      expect(service.getErrorMessage()).toBeTruthy();
    });

    it("should not leave a half-open microphone after a failed start", async () => {
      getUserMedia.mockRejectedValue(new Error("Permission denied"));

      await service.startMicrophone();

      expect(track.stop).not.toHaveBeenCalled();
      expect(service.getStatus()).toBe("error");
    });
  });

  describe("while listening", () => {
    beforeEach(async () => {
      await service.startMicrophone();
    });

    it("should publish the note it hears", () => {
      aubioState.frequency = 440;

      emitAudioBlock();

      expect(service.getCurrentNote()?.name).toBe("A");
      expect(service.getCurrentNote()?.octave).toBe(4);
    });

    it("should publish nothing while it hears silence", () => {
      aubioState.frequency = 0;

      emitAudioBlock();

      expect(service.getCurrentNote()).toBeNull();
    });

    it("should record each block as a frame, with the time it arrived", () => {
      aubioState.frequency = 440;

      emitAudioBlock();
      emitAudioBlock();

      const frames = service.getFrames();
      expect(frames).toHaveLength(2);
      expect(frames[1].timeMs).toBeGreaterThan(frames[0].timeMs);
    });

    // Without this the segmentation cannot tell two repeated notes apart, which
    // is the whole reason aubio is a dependency.
    it("should carry the detector's attack flag through to the frame", () => {
      aubioState.frequency = 440;
      aubioState.onset = 1;

      emitAudioBlock();

      expect(service.getFrames()[0].isOnset).toBe(true);
    });

    it("should mark a block with no attack as such", () => {
      aubioState.frequency = 440;
      aubioState.onset = 0;

      emitAudioBlock();

      expect(service.getFrames()[0].isOnset).toBe(false);
    });

    it("should segment what it has heard into notes", () => {
      aubioState.frequency = PitchUtil.midiToFrequency(69);
      for (let block = 0; block < 10; block += 1) emitAudioBlock();

      expect(service.getNotes().map((note) => note.midi)).toEqual([69]);
    });
  });

  describe("stopping", () => {
    beforeEach(async () => {
      await service.startMicrophone();
    });

    // A track left running keeps the browser's recording indicator lit, which
    // a user reasonably reads as the app spying on them.
    it("should release the microphone", () => {
      service.stop();

      expect(track.stop).toHaveBeenCalled();
    });

    it("should close the audio context", () => {
      service.stop();

      expect(audioContextClose).toHaveBeenCalled();
    });

    it("should disconnect the processor so no callback survives", () => {
      service.stop();

      expect(processor.disconnect).toHaveBeenCalled();
    });

    it("should go back to idle", () => {
      service.stop();

      expect(service.getStatus()).toBe("idle");
    });

    it("should keep what was heard, so it can still be turned into a tab", () => {
      aubioState.frequency = 440;
      emitAudioBlock();

      service.stop();

      expect(service.getFrames()).toHaveLength(1);
    });

    it("should be safe to call when nothing was started", () => {
      service.stop();

      expect(() => service.stop()).not.toThrow();
    });
  });

  describe("reset", () => {
    it("should clear what was heard", async () => {
      await service.startMicrophone();
      aubioState.frequency = 440;
      emitAudioBlock();

      service.reset();

      expect(service.getFrames()).toEqual([]);
      expect(service.getCurrentNote()).toBeNull();
    });
  });

  describe("loading aubio", () => {
    it("should load the WebAssembly module only once across restarts", async () => {
      await service.startMicrophone();
      service.stop();
      await service.startMicrophone();

      expect(aubioState.initialised).toBe(1);
    });
  });
});

import { PitchUtil } from "./pitch.util";

describe("PitchUtil", () => {
  describe("frequencyToMidi", () => {
    it("should map the tuning reference A4 to MIDI 69", () => {
      expect(PitchUtil.frequencyToMidi(440)).toBeCloseTo(69, 6);
    });

    it("should map an octave below the reference to twelve semitones below", () => {
      expect(PitchUtil.frequencyToMidi(220)).toBeCloseTo(57, 6);
    });

    it("should return a fractional value for a pitch between two semitones", () => {
      expect(PitchUtil.frequencyToMidi(453)).toBeGreaterThan(69);
      expect(PitchUtil.frequencyToMidi(453)).toBeLessThan(70);
    });
  });

  describe("midiToFrequency", () => {
    it("should map MIDI 69 back to 440 Hz", () => {
      expect(PitchUtil.midiToFrequency(69)).toBeCloseTo(440, 6);
    });

    it("should round-trip any frequency through MIDI unchanged", () => {
      expect(PitchUtil.midiToFrequency(PitchUtil.frequencyToMidi(329.63))).toBeCloseTo(329.63, 4);
    });
  });

  describe("midiToNoteName", () => {
    it("should name middle C as C4, the convention this app displays", () => {
      expect(PitchUtil.midiToNoteName(60)).toEqual({ name: "C", octave: 4 });
    });

    it("should name the tuning reference as A4", () => {
      expect(PitchUtil.midiToNoteName(69)).toEqual({ name: "A", octave: 4 });
    });

    it("should name the guitar's lowest open string as E2", () => {
      expect(PitchUtil.midiToNoteName(40)).toEqual({ name: "E", octave: 2 });
    });

    // The octave must change at C, not at A. Getting it wrong shifts the whole
    // display consistently enough to look deliberate.
    it("should start a new octave at C rather than at A", () => {
      expect(PitchUtil.midiToNoteName(59)).toEqual({ name: "B", octave: 3 });
      expect(PitchUtil.midiToNoteName(60)).toEqual({ name: "C", octave: 4 });
    });

    it("should name accidentals with sharps", () => {
      expect(PitchUtil.midiToNoteName(70)).toEqual({ name: "A#", octave: 4 });
    });
  });

  describe("frequencyToNote", () => {
    it("should report a perfectly tuned A4 as being zero cents off", () => {
      expect(PitchUtil.frequencyToNote(440)).toEqual({ name: "A", octave: 4, midi: 69, cents: 0 });
    });

    it("should report a sharp pitch as positive cents off its nearest note", () => {
      const note = PitchUtil.frequencyToNote(445);

      expect(note?.name).toBe("A");
      expect(note?.octave).toBe(4);
      expect(note?.cents).toBeGreaterThan(0);
      expect(note?.cents).toBeLessThan(50);
    });

    it("should report a flat pitch as negative cents off its nearest note", () => {
      expect(PitchUtil.frequencyToNote(435)?.cents).toBeLessThan(0);
    });

    it("should snap to the nearer note across a semitone boundary", () => {
      // 452 Hz is nearer A#4 (466.16) than A4 (440)? No — it is still nearer A4.
      expect(PitchUtil.frequencyToNote(452)?.name).toBe("A");
      expect(PitchUtil.frequencyToNote(460)?.name).toBe("A#");
    });

    // aubio reports silence as 0 Hz. Feeding that through the logarithm would
    // yield -Infinity and display as a note, which is worse than nothing.
    it("should return null for the silence the detector reports as zero", () => {
      expect(PitchUtil.frequencyToNote(0)).toBeNull();
    });

    it("should return null rather than a note for a negative or unusable frequency", () => {
      expect(PitchUtil.frequencyToNote(-10)).toBeNull();
      expect(PitchUtil.frequencyToNote(Number.NaN)).toBeNull();
    });

    // Below and above these bounds a "detection" is octave-error noise rather
    // than a sung or played note, and showing it invites chasing a ghost.
    it("should return null below the range a person can sing or a guitar can sound", () => {
      expect(PitchUtil.frequencyToNote(20)).toBeNull();
    });

    it("should return null above that range", () => {
      expect(PitchUtil.frequencyToNote(6000)).toBeNull();
    });
  });

  describe("formatNote", () => {
    it("should join the note name and its octave, so two A's an octave apart read differently", () => {
      expect(PitchUtil.formatNote({ name: "A", octave: 4, midi: 69, cents: 0 })).toBe("A4");
      expect(PitchUtil.formatNote({ name: "A", octave: 2, midi: 45, cents: 0 })).toBe("A2");
    });
  });
});

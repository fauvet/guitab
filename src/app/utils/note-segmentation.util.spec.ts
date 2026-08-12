import { NoteSegmentationUtil, PitchFrame } from "./note-segmentation.util";
import { PitchUtil } from "./pitch.util";

/** Builds a run of frames at one pitch, 10 ms apart, starting at `startMs`. */
const frames = (
  midi: number | null,
  count: number,
  startMs = 0,
  options: { onsetAtFirst?: boolean } = {},
): PitchFrame[] =>
  Array.from({ length: count }, (_, index) => ({
    timeMs: startMs + index * 10,
    frequency: midi === null ? 0 : PitchUtil.midiToFrequency(midi),
    isOnset: index === 0 && options.onsetAtFirst === true,
  }));

describe("NoteSegmentationUtil", () => {
  describe("segment", () => {
    it("should emit nothing for silence", () => {
      expect(NoteSegmentationUtil.segment(frames(null, 20))).toEqual([]);
    });

    it("should emit one note for a steadily held pitch", () => {
      const notes = NoteSegmentationUtil.segment(frames(69, 20));

      expect(notes).toHaveLength(1);
      expect(notes[0].midi).toBe(69);
    });

    it("should report when the note started and ended", () => {
      const notes = NoteSegmentationUtil.segment(frames(69, 20, 500));

      expect(notes[0].startMs).toBe(500);
      expect(notes[0].endMs).toBeGreaterThanOrEqual(690);
    });

    it("should emit one note per pitch in a sung phrase", () => {
      const phrase = [...frames(69, 15), ...frames(71, 15, 150), ...frames(72, 15, 300)];

      expect(NoteSegmentationUtil.segment(phrase).map((note) => note.midi)).toEqual([69, 71, 72]);
    });

    // A voice is never exactly on a semitone. Rounding each frame independently
    // turns a single held note into a stutter of alternating ones, which is the
    // failure that makes naive segmentation useless on real humming.
    it("should hold one note through a wobble across a semitone boundary", () => {
      const wobbling: PitchFrame[] = Array.from({ length: 30 }, (_, index) => ({
        timeMs: index * 10,
        // Alternates just either side of the A4/A#4 boundary.
        frequency: PitchUtil.midiToFrequency(index % 2 === 0 ? 69.45 : 69.55),
        isOnset: false,
      }));

      expect(NoteSegmentationUtil.segment(wobbling)).toHaveLength(1);
    });

    it("should ignore a single-frame excursion in the middle of a held note", () => {
      const glitched = frames(69, 30);
      glitched[12].frequency = PitchUtil.midiToFrequency(81);

      expect(NoteSegmentationUtil.segment(glitched).map((note) => note.midi)).toEqual([69]);
    });

    it("should discard a run too short to be something a person meant to sing", () => {
      const blip = [...frames(69, 20), ...frames(76, 2, 200), ...frames(69, 20, 220)];

      expect(NoteSegmentationUtil.segment(blip).every((note) => note.midi === 69)).toBe(true);
    });

    it("should end a note when the sound stops", () => {
      const phrase = [...frames(69, 15), ...frames(null, 10, 150), ...frames(69, 15, 250)];

      expect(NoteSegmentationUtil.segment(phrase).map((note) => note.midi)).toEqual([69, 69]);
    });

    // This is the behaviour aubio's onset detection exists to provide, and the
    // reason the app took on a GPL dependency: pitch alone cannot tell a
    // repeated note from a held one, because the frequency does not change.
    it("should split a repeated note when the detector reports a new attack", () => {
      const repeated = [...frames(69, 15), ...frames(69, 15, 150, { onsetAtFirst: true })];

      expect(NoteSegmentationUtil.segment(repeated)).toHaveLength(2);
    });

    it("should keep one note when the same pitch continues with no attack", () => {
      const held = [...frames(69, 15), ...frames(69, 15, 150)];

      expect(NoteSegmentationUtil.segment(held)).toHaveLength(1);
    });

    it("should give both halves of a split note their own timing", () => {
      const repeated = [...frames(69, 15), ...frames(69, 15, 150, { onsetAtFirst: true })];
      const [first, second] = NoteSegmentationUtil.segment(repeated);

      expect(first.endMs).toBeLessThanOrEqual(second.startMs);
      expect(second.startMs).toBe(150);
    });

    it("should ignore an attack that arrives before any pitch, as at the very start", () => {
      const notes = NoteSegmentationUtil.segment(frames(69, 20, 0, { onsetAtFirst: true }));

      expect(notes).toHaveLength(1);
    });
  });

  describe("segment options", () => {
    // The right minimum duration depends on the voice and the room, so it has
    // to be a knob rather than a constant buried in the loop.
    it("should accept a shorter minimum duration when asked", () => {
      const short = [...frames(69, 20), ...frames(76, 4, 200), ...frames(69, 20, 240)];

      expect(NoteSegmentationUtil.segment(short, { minimumDurationMs: 20 }).map((note) => note.midi)).toEqual([
        69, 76, 69,
      ]);
    });

    it("should drop everything when the minimum duration exceeds the phrase", () => {
      expect(NoteSegmentationUtil.segment(frames(69, 20), { minimumDurationMs: 5000 })).toEqual([]);
    });
  });

  describe("toMidiSequence", () => {
    it("should reduce segmented notes to the pitches, in order", () => {
      const phrase = [...frames(69, 15), ...frames(71, 15, 150), ...frames(72, 15, 300)];

      expect(NoteSegmentationUtil.toMidiSequence(NoteSegmentationUtil.segment(phrase))).toEqual([69, 71, 72]);
    });
  });
});

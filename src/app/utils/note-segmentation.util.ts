import { PitchUtil } from "./pitch.util";

/** One analysis frame: what the detector heard, and when. */
export interface PitchFrame {
  timeMs: number;
  /** Fundamental frequency in Hz. Zero means the detector heard nothing. */
  frequency: number;
  /** True on the frame where the detector reports the start of a new note. */
  isOnset: boolean;
}

/** A note, once the frames have been grouped into one. */
export interface NoteEvent {
  midi: number;
  startMs: number;
  endMs: number;
}

export interface SegmentationOptions {
  /**
   * How long a pitch must hold before it counts as a note. Below roughly 70 ms
   * a run is detector noise rather than something a person meant to sing — but
   * the right value depends on the voice and the room, so it is a knob.
   */
  minimumDurationMs?: number;
  /**
   * Width of the median filter, in frames. Larger removes more noise and blurs
   * fast transitions; 5 frames is about 50 ms, short enough to keep a quick
   * phrase intact.
   */
  medianWindow?: number;
  /**
   * How far, in semitones, the pitch must move away from the note currently
   * sounding before it counts as a different note. See the hysteresis note
   * below — this must sit strictly between 0.5 and 1.
   */
  switchThresholdSemitones?: number;
}

const DEFAULT_OPTIONS: Required<SegmentationOptions> = {
  minimumDurationMs: 70,
  medianWindow: 5,
  switchThresholdSemitones: 0.7,
};

/**
 * Turns a stream of per-frame pitch estimates into discrete notes.
 *
 * This is the step the literature calls the weak link, and the naive version —
 * round every frame to the nearest semitone, group equal neighbours — does not
 * survive contact with a real voice: singers sit *between* semitones and drift
 * across the boundary, so a single held note comes out as a stutter of
 * alternating ones.
 *
 * Three defences, in order:
 *
 *   1. A **median filter** kills single-frame excursions — an octave error on
 *      one frame, a click. Median rather than mean, because a mean is dragged
 *      by the very outliers it is meant to remove and lands on a pitch nobody
 *      sang.
 *   2. **Hysteresis** decides when the note has actually changed. Once a note
 *      is sounding, the pitch must move more than `switchThresholdSemitones`
 *      away from it to start a different one. A median filter alone cannot do
 *      this: a pitch alternating either side of a boundary makes the median
 *      alternate too, and every frame starts a new note. The threshold has to
 *      be above 0.5 so a wobble around the boundary holds, and below 1.0 so a
 *      genuine semitone step still registers.
 *   3. A **minimum duration** discards what is left that is too short to be
 *      deliberate.
 *
 * And on top of those, the detector's own onset flag splits notes the pitch
 * cannot distinguish at all.
 */
export class NoteSegmentationUtil {
  static segment(pitchFrames: PitchFrame[], options: SegmentationOptions = {}): NoteEvent[] {
    const { minimumDurationMs, medianWindow, switchThresholdSemitones } = { ...DEFAULT_OPTIONS, ...options };

    // Fractional MIDI, keeping the distance from the nearest semitone that the
    // hysteresis needs. `null` is unvoiced — silence, or out of useful range.
    const exact = pitchFrames.map((frame) =>
      PitchUtil.frequencyToNote(frame.frequency) === null ? null : PitchUtil.frequencyToMidi(frame.frequency),
    );
    const smoothed = NoteSegmentationUtil.medianFilter(exact, medianWindow);

    const notes: NoteEvent[] = [];
    let current: NoteEvent | null = null;

    for (const [index, midi] of smoothed.entries()) {
      const frame = pitchFrames[index];

      // An attack always opens a new note, even at the same pitch. Without this
      // two hummed notes at one pitch merge into a single held one, and nothing
      // on screen says so. This is what the onset detector is here for.
      if (
        current !== null &&
        midi !== null &&
        !frame.isOnset &&
        Math.abs(midi - current.midi) <= switchThresholdSemitones
      ) {
        current.endMs = frame.timeMs;
        continue;
      }

      if (current !== null && frame.timeMs - current.startMs >= minimumDurationMs) notes.push(current);
      current = midi === null ? null : { midi: Math.round(midi), startMs: frame.timeMs, endMs: frame.timeMs };
    }

    const lastFrame = pitchFrames[pitchFrames.length - 1];
    if (current !== null && lastFrame !== undefined && lastFrame.timeMs - current.startMs >= minimumDurationMs) {
      notes.push(current);
    }

    return notes;
  }

  static toMidiSequence(notes: NoteEvent[]): number[] {
    return notes.map((note) => note.midi);
  }

  private static medianFilter(values: (number | null)[], window: number): (number | null)[] {
    const halfWindow = Math.floor(window / 2);

    return values.map((value, index) => {
      if (value === null) return null;

      const neighbourhood = values
        .slice(Math.max(0, index - halfWindow), index + halfWindow + 1)
        .filter((neighbour): neighbour is number => neighbour !== null)
        .sort((first, second) => first - second);

      if (neighbourhood.length === 0) return null;
      return neighbourhood[Math.floor(neighbourhood.length / 2)];
    });
  }
}

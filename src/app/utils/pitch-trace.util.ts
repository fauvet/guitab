import { PitchFrame } from "./note-segmentation.util";
import { PitchUtil } from "./pitch.util";

export interface TraceViewport {
  width: number;
  height: number;
  /** Lowest and highest MIDI note shown, bottom and top of the plot. */
  lowestMidi: number;
  highestMidi: number;
  /** How much history is on screen, in milliseconds. */
  windowMs: number;
}

export interface GridLine {
  y: number;
  label: string;
}

const SEMITONES_PER_OCTAVE = 12;

/**
 * Geometry for the scrolling pitch trace, kept out of the component so it can
 * be tested without rendering anything.
 *
 * This is a *monitor*, not a tuner: it draws the fundamental continuously
 * against time, and never waits for the pitch to settle. That distinction is
 * the whole reason a tuner is the wrong instrument for reading a melody — a
 * tuner smooths and averages precisely so it can show one stable note, which is
 * why it makes you hold each note to see it.
 */
export class PitchTraceUtil {
  /**
   * Points as SVG `polyline` coordinate strings, one per unbroken stretch of
   * sound. Separate segments rather than one line, so a gap in the sound draws
   * as a gap: joining across silence would draw a slide the player never sang.
   */
  static toSegments(frames: PitchFrame[], viewport: TraceViewport): string[] {
    const latestMs = frames.reduce((latest, frame) => Math.max(latest, frame.timeMs), 0);
    const earliestVisibleMs = latestMs - viewport.windowMs;

    const segments: string[] = [];
    let current: string[] = [];

    const closeCurrent = (): void => {
      // A single point cannot be drawn as a line, and a dot at a pitch heard
      // for one frame is noise dressed up as information.
      if (current.length >= 2) segments.push(current.join(" "));
      current = [];
    };

    for (const frame of frames) {
      if (frame.timeMs < earliestVisibleMs) continue;

      const note = PitchUtil.frequencyToNote(frame.frequency);
      if (note === null) {
        closeCurrent();
        continue;
      }

      const midi = PitchUtil.frequencyToMidi(frame.frequency);
      const x = PitchTraceUtil.toX(frame.timeMs, latestMs, viewport);
      const y = PitchTraceUtil.toY(midi, viewport);

      current.push(`${PitchTraceUtil.round(x)},${PitchTraceUtil.round(y)}`);
    }

    closeCurrent();
    return segments;
  }

  /** One labelled line per C, which is what makes an octave readable at a glance. */
  static gridLines(viewport: TraceViewport): GridLine[] {
    const lines: GridLine[] = [];
    const firstC = Math.ceil(viewport.lowestMidi / SEMITONES_PER_OCTAVE) * SEMITONES_PER_OCTAVE;

    for (let midi = firstC; midi <= viewport.highestMidi; midi += SEMITONES_PER_OCTAVE) {
      const { name, octave } = PitchUtil.midiToNoteName(midi);
      lines.push({ y: PitchTraceUtil.round(PitchTraceUtil.toY(midi, viewport)), label: `${name}${octave}` });
    }

    return lines;
  }

  private static toX(timeMs: number, latestMs: number, viewport: TraceViewport): number {
    // The newest sound sits at the right edge and everything older slides left,
    // so the eye always finds "now" in the same place.
    const age = latestMs - timeMs;
    return viewport.width * (1 - age / viewport.windowMs);
  }

  private static toY(midi: number, viewport: TraceViewport): number {
    const span = viewport.highestMidi - viewport.lowestMidi;
    const position = (midi - viewport.lowestMidi) / span;
    // SVG's y grows downwards; a higher pitch must sit nearer the top.
    const y = viewport.height * (1 - position);

    return Math.min(viewport.height, Math.max(0, y));
  }

  private static round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

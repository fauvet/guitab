import { FretPosition } from "./fretboard.util";

const STRING_COUNT = 6;

/**
 * Renders fret positions in the line-per-moment format the solo tab editor
 * already accepts: one line per note, six space-separated columns, a dash where
 * nothing sounds.
 *
 * Deliberately stopping here rather than emitting a finished tab. `SoloTabUtil`
 * already turns this into one, so the detection feeds the editor's existing
 * pipeline — which means the transcription lands in the textarea where the
 * player can correct a wrong note *before* it becomes a tab. Given that
 * realtime detection makes occasional octave errors, that editing step is not a
 * nicety.
 */
export class SoloTabInputUtil {
  static fromFretPositions(positions: FretPosition[]): string {
    return positions.map((position) => SoloTabInputUtil.toLine(position)).join("\n");
  }

  private static toLine(position: FretPosition): string {
    const columns = new Array<string>(STRING_COUNT).fill("-");
    columns[position.stringIndex] = String(position.fret);

    // All six columns, including the trailing dashes. SoloTabUtil counts the
    // columns to decide how many strings the tab has, so trimming them would
    // silently produce a two-string tab.
    return columns.join(" ");
  }
}

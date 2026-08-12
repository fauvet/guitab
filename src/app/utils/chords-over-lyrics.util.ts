// Regex matching a single chord token (e.g. Am, C/G, Bbmaj7, F#sus4)
const CHORD_TOKEN_REGEX =
  /^[A-G][b#]?(maj|maj7|maj9|m(?!aj)|min|dim|aug|sus[24]?|add[0-9]+|[0-9]+)?[0-9]*(\/[A-G][b#]?)?$/;

// Section header formats used by Ultimate Guitar / Chords-over-Lyrics sources
const SECTION_HEADER_REGEX = /^\[(.+?)\]$/;

type LineKind = "chord" | "lyric" | "section" | "blank";

interface ClassifiedLine {
  kind: LineKind;
  raw: string;
}

export class ChordsOverLyricsUtil {
  /**
   * Converts a "chords over lyrics" (Ultimate Guitar / La Boîte à Chanson) text
   * into ChordPro format.
   *
   * Algorithm:
   *  1. Classify every line as chord/lyric/section/blank
   *  2. When a chord line is immediately followed by a lyric line, merge them
   *     by inserting [Chord] tokens at the correct character positions in the
   *     lyric string (adjusting the offset after each insertion).
   *  3. Section headers are converted to ChordPro environment directives.
   *  4. Chord-only lines not followed by lyrics are emitted as inline chords.
   */
  static convert(input: string): string {
    const rawLines = input.split("\n");
    const classified = rawLines.map((line) => ChordsOverLyricsUtil.classifyLine(line));

    const outputLines: string[] = [];
    let currentSection: string | null = null;
    let i = 0;

    while (i < classified.length) {
      const line = classified[i];

      if (line.kind === "blank") {
        outputLines.push("");
        i++;
        continue;
      }

      if (line.kind === "section") {
        // Close previous section first
        if (currentSection !== null) {
          outputLines.push(ChordsOverLyricsUtil.endDirective(currentSection));
          currentSection = null;
        }
        const headerLabel = SECTION_HEADER_REGEX.exec(line.raw)![1];
        const directive = ChordsOverLyricsUtil.sectionToDirective(headerLabel);
        if (directive) {
          outputLines.push(directive.start);
          currentSection = directive.type;
        } else {
          outputLines.push(`{comment: ${headerLabel}}`);
        }
        i++;
        continue;
      }

      if (line.kind === "chord") {
        const next = classified[i + 1];
        if (next && next.kind === "lyric") {
          // Merge: embed chords inline into the lyric line
          outputLines.push(ChordsOverLyricsUtil.mergeChordAndLyricLine(line.raw, next.raw));
          i += 2;
        } else {
          // Chord-only line (instrumental / no following lyric)
          outputLines.push(ChordsOverLyricsUtil.chordLineToInline(line.raw));
          i++;
        }
        continue;
      }

      // Plain lyric line (no chord above)
      outputLines.push(line.raw);
      i++;
    }

    // Close any open section
    if (currentSection !== null) {
      outputLines.push(ChordsOverLyricsUtil.endDirective(currentSection));
    }

    return outputLines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static classifyLine(line: string): ClassifiedLine {
    if (line.trim() === "") {
      return { kind: "blank", raw: line };
    }

    if (SECTION_HEADER_REGEX.test(line.trim())) {
      return { kind: "section", raw: line.trim() };
    }

    if (ChordsOverLyricsUtil.isChordLine(line)) {
      return { kind: "chord", raw: line };
    }

    return { kind: "lyric", raw: line };
  }

  /**
   * A line is a chord line when every non-empty whitespace-separated token
   * is a valid chord name.
   */
  private static isChordLine(line: string): boolean {
    const tokens = line
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return false;
    return tokens.every((token) => CHORD_TOKEN_REGEX.test(token));
  }

  /**
   * Inserts [Chord] markers into the lyric string at the positions
   * indicated by the chord line (both using the same monospace column).
   *
   * The offset variable compensates for the extra characters inserted
   * so far (`[Chord]` for each chord already embedded).
   */
  private static mergeChordAndLyricLine(chordLine: string, lyricLine: string): string {
    // Find all chords and their column positions in the chord line
    const chords = ChordsOverLyricsUtil.extractChordsWithPositions(chordLine);

    // Pad the lyric line so we can always insert at the right column
    let result = lyricLine;
    let offset = 0;

    for (const { chord, col } of chords) {
      const insertAt = Math.min(col + offset, result.length);
      const token = `[${chord}]`;
      result = result.slice(0, insertAt) + token + result.slice(insertAt);
      offset += token.length;
    }

    return result.trimEnd();
  }

  /** Extract chord names and their starting column from a chord line. */
  private static extractChordsWithPositions(chordLine: string): { chord: string; col: number }[] {
    const results: { chord: string; col: number }[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(chordLine)) !== null) {
      results.push({ chord: match[0], col: match.index });
    }

    return results;
  }

  /** Convert a chord-only line (no following lyrics) to inline ChordPro tokens. */
  private static chordLineToInline(chordLine: string): string {
    const chords = chordLine
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return chords.map((c) => `[${c}]`).join("");
  }

  // ---------------------------------------------------------------------------
  // Section directive helpers
  // ---------------------------------------------------------------------------

  private static sectionToDirective(label: string): { start: string; type: string } | null {
    const lower = label.toLowerCase();

    if (lower.startsWith("chorus") || lower.startsWith("refrain")) {
      return { start: `{start_of_chorus: ${label}}`, type: "chorus" };
    }
    if (lower.startsWith("verse") || lower.startsWith("couplet")) {
      return { start: `{start_of_verse: ${label}}`, type: "verse" };
    }
    if (lower.startsWith("bridge") || lower.startsWith("pont")) {
      return { start: `{start_of_bridge: ${label}}`, type: "bridge" };
    }
    if (lower.startsWith("intro")) {
      return { start: `{comment: ${label}}`, type: null! };
    }
    if (lower.startsWith("outro")) {
      return { start: `{comment: ${label}}`, type: null! };
    }
    if (lower.startsWith("tab") || lower.startsWith("solo") || lower.startsWith("interlude")) {
      return { start: `{start_of_tab: ${label}}`, type: "tab" };
    }

    return null;
  }

  private static endDirective(sectionType: string): string {
    switch (sectionType) {
      case "chorus":
        return "{end_of_chorus}";
      case "verse":
        return "{end_of_verse}";
      case "bridge":
        return "{end_of_bridge}";
      case "tab":
        return "{end_of_tab}";
      default:
        return "";
    }
  }
}

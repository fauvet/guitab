import { ChordsOverLyricsUtil } from "./chords-over-lyrics.util";

describe("ChordsOverLyricsUtil", () => {
  describe("convert", () => {
    it("should merge a basic chord+lyric pair", () => {
      // Am at col 0, C at col 6 (where 'world' starts in 'Hello world')
      const input = ["Am    C", "Hello world"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe("[Am]Hello [C]world");
    });

    it("should handle a chord positioned past the end of the lyric line", () => {
      const input = ["Am    C", "Hi"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      // [Am] at 0, [C] at 6 — lyric is only 2 chars long, so [C] appended at end
      expect(result).toBe("[Am]Hi[C]");
    });

    it("should pass through a lyric-only line unchanged", () => {
      const input = "Just some lyrics with no chords";
      expect(ChordsOverLyricsUtil.convert(input)).toBe(input);
    });

    it("should preserve blank lines", () => {
      const input = ["Am", "Hello", "", "G", "World"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe(["[Am]Hello", "", "[G]World"].join("\n"));
    });

    it("should convert a chord-only line with no following lyric to inline chords", () => {
      const input = "Am G C F";
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe("[Am][G][C][F]");
    });

    it("should convert a chord-only line followed by a blank line to inline chords", () => {
      const input = ["Am G C F", ""].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe(["[Am][G][C][F]", ""].join("\n"));
    });

    it("should handle slash chords correctly (C/G, G/B)", () => {
      // C/G at col 0, G/B at col 5 (where 'lyrics' starts in 'Some lyrics here')
      const input = ["C/G  G/B", "Some lyrics here"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe("[C/G]Some [G/B]lyrics here");
    });

    it("should handle sharp and flat chords (F#, Bb, Ebmaj7)", () => {
      // F# at col 0, Bb at col 3 ('la ' = 3 chars), Ebmaj7 at col 6 ('la la ' = 6 chars)
      const input = ["F# Bb Ebmaj7", "la la la"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toBe("[F#]la [Bb]la [Ebmaj7]la");
    });

    it("should convert [Chorus] header to {start_of_chorus}", () => {
      // Am at col 0, G at col 4 (where 'it' starts in 'Let it be')
      const input = ["[Chorus]", "Am  G", "Let it be"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{start_of_chorus: Chorus}");
      expect(result).toContain("[Am]Let [G]it be");
      expect(result).toContain("{end_of_chorus}");
    });

    it("should convert [Verse 1] header to {start_of_verse}", () => {
      const input = ["[Verse 1]", "G", "Amazing grace"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{start_of_verse: Verse 1}");
      expect(result).toContain("{end_of_verse}");
    });

    it("should convert [Bridge] header to {start_of_bridge}", () => {
      const input = ["[Bridge]", "D", "Some bridge lyrics"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{start_of_bridge: Bridge}");
      expect(result).toContain("{end_of_bridge}");
    });

    it("should convert [Intro] to a comment directive (no close tag)", () => {
      const input = ["[Intro]", "Am G"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{comment: Intro}");
      expect(result).not.toContain("{end_of_");
    });

    it("should convert [Solo] to {start_of_tab}", () => {
      const input = ["[Solo]", "Am G"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{start_of_tab: Solo}");
      expect(result).toContain("{end_of_tab}");
    });

    it("should convert unknown section headers to {comment:}", () => {
      const input = ["[Pre-Chorus]", "Am", "Word"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{comment: Pre-Chorus}");
    });

    it("should close a previous section before opening a new one", () => {
      const input = ["[Verse 1]", "G", "Line one", "[Chorus]", "Am", "Line two"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      const lines = result.split("\n");
      const verseEndIdx = lines.indexOf("{end_of_verse}");
      const chorusStartIdx = lines.findIndex((l) => l.startsWith("{start_of_chorus"));
      expect(verseEndIdx).toBeGreaterThan(-1);
      expect(chorusStartIdx).toBeGreaterThan(verseEndIdx);
    });

    it("should handle multiple chord-lyric pairs in sequence", () => {
      // G at col 0, D at col 6 (where 'line' starts in 'First line')
      // Em at col 0, C at col 7 (where 'line' starts in 'Second line')
      const input = ["G     D", "First line", "Em     C", "Second line"].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      const lines = result.split("\n");
      expect(lines[0]).toBe("[G]First [D]line");
      expect(lines[1]).toBe("[Em]Second [C]line");
    });

    it("should handle a full song structure", () => {
      // G at col 0, G7 at col 8 ('Amazing ' = 8 chars), C at col 14 ('Amazing grace ' = 14 chars)
      // G at col 0, D at col 4 ('Let ' = 4 chars)
      const input = [
        "[Verse 1]",
        "G       G7    C",
        "Amazing grace how sweet the sound",
        "",
        "[Chorus]",
        "G   D",
        "Let it be",
      ].join("\n");
      const result = ChordsOverLyricsUtil.convert(input);
      expect(result).toContain("{start_of_verse: Verse 1}");
      expect(result).toContain("{end_of_verse}");
      expect(result).toContain("{start_of_chorus: Chorus}");
      expect(result).toContain("{end_of_chorus}");
      expect(result).toContain("[G]Amazing [G7]grace [C]how sweet the sound");
      expect(result).toContain("[G]Let [D]it be");
    });
  });
});

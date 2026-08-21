import { ChordproUtil } from "./chordpro.util";

describe("ChordproUtil", () => {
  describe("buildChordName", () => {
    it("should return an empty string for a null/undefined input", () => {
      expect(ChordproUtil.buildChordName(null)).toBe("");
      expect(ChordproUtil.buildChordName(undefined)).toBe("");
    });

    it("should concatenate key and suffix", () => {
      expect(ChordproUtil.buildChordName({ key: "A", suffix: "m" })).toBe("Am");
    });

    it("should handle an empty suffix (major chord)", () => {
      expect(ChordproUtil.buildChordName({ key: "G", suffix: "" })).toBe("G");
    });

    it("should handle complex suffixes", () => {
      expect(ChordproUtil.buildChordName({ key: "C", suffix: "maj7" })).toBe("Cmaj7");
    });
  });

  describe("buildFileBaseName", () => {
    it("should return 'title (artist)' when both are present", () => {
      const content = "{title: Hotel California}\n{artist: Eagles}";
      expect(ChordproUtil.buildFileBaseName(content)).toBe("Hotel California (Eagles)");
    });

    it("should return 'Untitled' when neither title nor artist is present and no fallback is given", () => {
      expect(ChordproUtil.buildFileBaseName("some content without directives")).toBe("Untitled");
    });

    it("should return the fallback name when neither title nor artist is present", () => {
      expect(ChordproUtil.buildFileBaseName("some content without directives", "my-song")).toBe("my-song");
    });

    it("should return just the title when only the title is present", () => {
      expect(ChordproUtil.buildFileBaseName("{title: Hotel California}")).toBe("Hotel California");
    });

    it("should return just the artist when only the artist is present", () => {
      expect(ChordproUtil.buildFileBaseName("{artist: Eagles}")).toBe("Eagles");
    });

    it("should trim whitespace around title and artist", () => {
      const content = "{title:  My Song  }\n{artist:  My Artist  }";
      expect(ChordproUtil.buildFileBaseName(content)).toBe("My Song (My Artist)");
    });
  });

  describe("buildFileName", () => {
    it("should append the .cho extension to the base name", () => {
      const content = "{title: My Song}\n{artist: My Artist}";
      expect(ChordproUtil.buildFileName(content)).toBe("My Song (My Artist).cho");
    });

    it("should use .cho as the preferred extension", () => {
      expect(ChordproUtil.PREFERRED_EXTENSION).toBe(".cho");
    });

    it("should append the extension to the fallback name when there is no title or artist", () => {
      expect(ChordproUtil.buildFileName("no directives here", "my-song")).toBe("my-song.cho");
    });
  });

  describe("findCustomVariant", () => {
    const defineWithFingers = "{define: Am base-fret 1 frets x 0 2 2 1 0 fingers x x 2 3 1 x}";
    const defineWithoutFingers = "{define: G base-fret 1 frets 3 2 0 0 0 3}";
    const defineHighBaseFret = "{define: Bm base-fret 2 frets x x 4 4 3 2 fingers x x 3 4 2 1}";

    it("should return null when no define directive is found", () => {
      expect(ChordproUtil.findCustomVariant("no define here", "Am")).toBeNull();
    });

    it("should return null when chord name does not match", () => {
      expect(ChordproUtil.findCustomVariant(defineWithFingers, "G")).toBeNull();
    });

    it("should parse baseFret correctly", () => {
      const variant = ChordproUtil.findCustomVariant(defineWithFingers, "Am");
      expect(variant?.baseFret).toBe(1);
    });

    it("should parse frets array correctly", () => {
      const variant = ChordproUtil.findCustomVariant(defineWithFingers, "Am");
      expect(variant?.frets).toEqual(["x", "0", "2", "2", "1", "0"]);
    });

    it("should parse fingers array correctly", () => {
      const variant = ChordproUtil.findCustomVariant(defineWithFingers, "Am");
      expect(variant?.fingers[2]).toBe("2");
      expect(variant?.fingers[3]).toBe("3");
    });

    it("should return a variant without fingers when no fingers group is present", () => {
      const variant = ChordproUtil.findCustomVariant(defineWithoutFingers, "G");
      expect(variant).not.toBeNull();
      expect(variant?.baseFret).toBe(1);
      expect(variant?.frets).toEqual(["3", "2", "0", "0", "0", "3"]);
    });

    it("should include empty barres, capo false, and midi []", () => {
      const variant = ChordproUtil.findCustomVariant(defineWithFingers, "Am");
      expect(variant?.barres).toEqual([]);
      expect(variant?.capo).toBe(false);
      expect(variant?.midi).toEqual([]);
    });

    it("should handle a higher baseFret", () => {
      const variant = ChordproUtil.findCustomVariant(defineHighBaseFret, "Bm");
      expect(variant?.baseFret).toBe(2);
    });

    it("should work with chord names containing special regex characters like D#", () => {
      const content = "{define: D# base-fret 1 frets x x 1 3 3 2}";
      const variant = ChordproUtil.findCustomVariant(content, "D#");
      expect(variant).not.toBeNull();
      expect(variant?.baseFret).toBe(1);
    });
  });

  describe("findChordNames", () => {
    it("should return an empty array when no chords are found", () => {
      expect(ChordproUtil.findChordNames("no chords here")).toEqual([]);
    });

    it("should return an empty array for empty content", () => {
      expect(ChordproUtil.findChordNames("")).toEqual([]);
    });

    it("should find a single chord", () => {
      expect(ChordproUtil.findChordNames("[Am]")).toEqual(["Am"]);
    });

    it("should find multiple chords on the same line", () => {
      expect(ChordproUtil.findChordNames("[Am] some lyrics [G] more lyrics [C]")).toEqual(["Am", "G", "C"]);
    });

    it("should trim spaces around chord names", () => {
      expect(ChordproUtil.findChordNames("[ Am ]")).toEqual(["Am"]);
    });

    it("should find chords across multiple lines", () => {
      const content = "[Am] first line\n[G] second line";
      expect(ChordproUtil.findChordNames(content)).toEqual(["Am", "G"]);
    });

    it("should return duplicate chord names (not deduplicated)", () => {
      expect(ChordproUtil.findChordNames("[Am] [G] [Am]")).toEqual(["Am", "G", "Am"]);
    });
  });

  describe("findIndexFromCoordinates", () => {
    const content = "hello\nworld\nfoo";

    it("should return 0 for row 0, column 0", () => {
      expect(ChordproUtil.findIndexFromCoordinates(content, 0, 0)).toBe(0);
    });

    it("should return the correct column offset on the first line", () => {
      expect(ChordproUtil.findIndexFromCoordinates(content, 0, 3)).toBe(3);
    });

    it("should account for the newline when computing row 1 start", () => {
      // "hello\n" = 6 chars, so row 1 col 0 = index 6
      expect(ChordproUtil.findIndexFromCoordinates(content, 1, 0)).toBe(6);
    });

    it("should compute index for row 2 correctly", () => {
      // "hello\n" (6) + "world\n" (6) = 12, so row 2 col 0 = 12
      expect(ChordproUtil.findIndexFromCoordinates(content, 2, 0)).toBe(12);
    });
  });

  describe("findCoordinatesFromIndex", () => {
    const content = "hello\nworld\nfoo";

    it("should return row 0, column 0 for index 0", () => {
      expect(ChordproUtil.findCoordinatesFromIndex(content, 0)).toEqual({ row: 0, column: 0 });
    });

    it("should return the correct column on the first line", () => {
      expect(ChordproUtil.findCoordinatesFromIndex(content, 3)).toEqual({ row: 0, column: 3 });
    });

    it("should return row 1 when index is past the first newline", () => {
      expect(ChordproUtil.findCoordinatesFromIndex(content, 6)).toEqual({ row: 1, column: 0 });
    });

    it("should return { row: -1, column: -1 } for an out-of-bounds index", () => {
      expect(ChordproUtil.findCoordinatesFromIndex(content, 999)).toEqual({ row: -1, column: -1 });
    });

    it("should be consistent with findIndexFromCoordinates (round-trip)", () => {
      const index = ChordproUtil.findIndexFromCoordinates(content, 1, 3);
      const coords = ChordproUtil.findCoordinatesFromIndex(content, index);
      expect(coords).toEqual({ row: 1, column: 3 });
    });
  });
});

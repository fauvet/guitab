import { SvgGuitarUtil } from "./svg-guitar.util";
import Variant from "../types/variant.type";

// Am chord — no barre, one muted string, two open strings
const AM_VARIANT: Variant = {
  frets: ["x", "0", "2", "2", "1", "0"],
  fingers: ["x", "x", "2", "3", "1", "x"],
  barres: [],
  capo: false,
  baseFret: 1,
  midi: [],
};

// Bm chord — one barre on finger 1 across strings 5→1
const BM_VARIANT: Variant = {
  frets: ["x", "2", "4", "4", "3", "2"],
  fingers: ["x", "1", "3", "4", "2", "1"],
  barres: [],
  capo: false,
  baseFret: 2,
  midi: [],
};

describe("SvgGuitarUtil", () => {
  describe("buildChord", () => {
    it("should return null for an unknown chord name", () => {
      expect(SvgGuitarUtil.buildChord("", "ZZZ")).toBeNull();
    });

    it("should return null for an empty string chord name", () => {
      expect(SvgGuitarUtil.buildChord("", "")).toBeNull();
    });

    it("should return a chord from the built-in guitar.json for 'Am'", () => {
      const chord = SvgGuitarUtil.buildChord("", "Am");
      expect(chord).not.toBeNull();
      expect(chord?.title).toBe("Am");
    });

    it("should use a custom variant from the content when present", () => {
      const content = "{define: Am base-fret 5 frets x x 2 2 1 0}";
      const chord = SvgGuitarUtil.buildChord(content, "Am");
      expect(chord?.position).toBe(5);
    });

    describe("chord name normalization", () => {
      it("should find 'D#' via its normalized name 'Eb'", () => {
        expect(SvgGuitarUtil.buildChord("", "D#")).not.toBeNull();
      });

      it("should find 'G#' via its normalized name 'Ab'", () => {
        expect(SvgGuitarUtil.buildChord("", "G#")).not.toBeNull();
      });

      it("should find 'A#' via its normalized name 'Bb'", () => {
        expect(SvgGuitarUtil.buildChord("", "A#")).not.toBeNull();
      });

      it("should find 'Db' via its normalized name 'C#'", () => {
        expect(SvgGuitarUtil.buildChord("", "Db")).not.toBeNull();
      });

      it("should find 'Gb' via its normalized name 'F#'", () => {
        expect(SvgGuitarUtil.buildChord("", "Gb")).not.toBeNull();
      });

      it("should preserve the original chord name as the title (not the normalized name)", () => {
        const chord = SvgGuitarUtil.buildChord("", "D#");
        expect(chord?.title).toBe("D#");
      });
    });
  });

  describe("buildChord for the ukulele", () => {
    it("should draw 'C' from the ukulele database on four strings", () => {
      const chord = SvgGuitarUtil.buildChord("", "C", "ukulele");
      expect(chord?.title).toBe("C");
      // G C E A open, third fret on the A string — the only fretted note.
      expect(chord?.fingers).toEqual([[1, "3", "3"]]);
    });

    it("should find a minor chord under the guitar database's suffix", () => {
      expect(SvgGuitarUtil.buildChord("", "Am", "ukulele")?.fingers).toEqual([[4, "2", "2"]]);
    });

    it("should apply the same enharmonic normalization", () => {
      expect(SvgGuitarUtil.buildChord("", "Db", "ukulele")).not.toBeNull();
      expect(SvgGuitarUtil.buildChord("", "G#m", "ukulele")).not.toBeNull();
    });

    it("should ignore a six-string {define:}, which is a guitar fingering", () => {
      const content = "{define: C base-fret 5 frets x 3 2 0 1 0}";
      expect(SvgGuitarUtil.buildChord(content, "C", "ukulele")?.position).toBe(1);
    });

    it("should use a four-string {define:}", () => {
      const content = "{define: C base-fret 5 frets 0 0 0 3}";
      expect(SvgGuitarUtil.buildChord(content, "C", "ukulele")?.position).toBe(5);
    });

    it("should ignore a four-string {define:} on the guitar", () => {
      const content = "{define: C base-fret 5 frets 0 0 0 3}";
      expect(SvgGuitarUtil.buildChord(content, "C", "guitar")?.position).toBe(1);
    });

    it("should stand in the chord above the bass for a slash chord the database lacks", () => {
      const chord = SvgGuitarUtil.buildChord("", "C/G", "ukulele");
      expect(chord?.title).toBe("C/G");
      expect(chord?.fingers).toEqual(SvgGuitarUtil.buildChord("", "C", "ukulele")?.fingers);
    });

    it("should still return null for a slash chord whose upper chord is unknown", () => {
      expect(SvgGuitarUtil.buildChord("", "ZZZ/G", "ukulele")).toBeNull();
    });
  });

  describe("getChordEntries", () => {
    it("should list the twelve keys of each instrument", () => {
      expect(SvgGuitarUtil.getChordEntries("guitar").map(([key]) => key)).toHaveLength(12);
      expect(SvgGuitarUtil.getChordEntries("ukulele").map(([key]) => key)).toEqual(
        SvgGuitarUtil.getChordEntries("guitar").map(([key]) => key),
      );
    });

    it("should only hold four-string fingerings for the ukulele", () => {
      const stringCounts = SvgGuitarUtil.getChordEntries("ukulele")
        .flatMap(([, chordObjects]) => chordObjects)
        .flatMap((chordObject) => chordObject.variants)
        .map((variant) => variant.frets.length);
      expect(new Set(stringCounts)).toEqual(new Set([4]));
    });
  });

  describe("toChord", () => {
    it("should number four strings from the A string down to the G string", () => {
      // Ukulele G7: 0 2 1 2, with no barre.
      const chord = SvgGuitarUtil.toChord("G7", {
        frets: ["0", "2", "1", "2"],
        fingers: ["x", "2", "1", "3"],
        barres: [],
        baseFret: 1,
        midi: [],
      });
      expect(chord.fingers).toEqual([
        [3, "2", "2"],
        [2, "1", "1"],
        [1, "2", "3"],
      ]);
    });

    it("should place a four-string barre between the right strings", () => {
      // Ukulele C at the third fret: 3 2 1 1, finger 1 barring the E and A strings.
      const chord = SvgGuitarUtil.toChord("C", {
        frets: ["3", "2", "1", "1"],
        fingers: ["3", "2", "1", "1"],
        barres: [1],
        baseFret: 3,
        midi: [],
      });
      expect(chord.barres).toEqual([{ fromString: 2, toString: 1, fret: 1, text: "1" }]);
    });

    describe("title and position", () => {
      it("should set the chord title to the provided chord name", () => {
        const chord = SvgGuitarUtil.toChord("Am", AM_VARIANT);
        expect(chord.title).toBe("Am");
      });

      it("should set the position to the variant baseFret", () => {
        const chord = SvgGuitarUtil.toChord("Bm", BM_VARIANT);
        expect(chord.position).toBe(2);
      });
    });

    describe("without barre (Am)", () => {
      it("should have no barres", () => {
        const chord = SvgGuitarUtil.toChord("Am", AM_VARIANT);
        expect(chord.barres).toEqual([]);
      });

      it("should include muted strings as [string, 'x']", () => {
        const chord = SvgGuitarUtil.toChord("Am", AM_VARIANT);
        const mutedStrings = chord.fingers.filter((f) => f[1] === "x");
        expect(mutedStrings.length).toBe(1);
        expect(mutedStrings[0][0]).toBe(6); // 6th string is muted
      });

      it("should exclude open strings from fingers", () => {
        const chord = SvgGuitarUtil.toChord("Am", AM_VARIANT);
        // Am has open strings at index 1 (string 5) and index 5 (string 1)
        const stringNumbers = chord.fingers.map((f) => f[0]);
        expect(stringNumbers).not.toContain(5);
        expect(stringNumbers).not.toContain(1);
      });

      it("should include the three fretted fingers with correct [string, fret, finger] tuples", () => {
        const chord = SvgGuitarUtil.toChord("Am", AM_VARIANT);
        const fretted = chord.fingers.filter((f) => f[1] !== "x");
        expect(fretted).toContainEqual([4, "2", "2"]);
        expect(fretted).toContainEqual([3, "2", "3"]);
        expect(fretted).toContainEqual([2, "1", "1"]);
      });
    });

    describe("with barre (Bm)", () => {
      it("should detect the barre for finger '1' spanning strings 5 to 1", () => {
        const chord = SvgGuitarUtil.toChord("Bm", BM_VARIANT);
        expect(chord.barres.length).toBe(1);
        expect(chord.barres[0]).toEqual({ fromString: 5, toString: 1, fret: 2, text: "1" });
      });

      it("should exclude strings covered by the barre from fingers", () => {
        const chord = SvgGuitarUtil.toChord("Bm", BM_VARIANT);
        // Strings 5 (index 1) and 1 (index 5) both have finger "1" → belong to barre
        const stringNumbers = chord.fingers.map((f) => f[0]);
        expect(stringNumbers).not.toContain(5);
        expect(stringNumbers).not.toContain(1);
      });

      it("should include the three non-barre fretted fingers", () => {
        const chord = SvgGuitarUtil.toChord("Bm", BM_VARIANT);
        const fretted = chord.fingers.filter((f) => f[1] !== "x");
        expect(fretted).toContainEqual([4, "4", "3"]);
        expect(fretted).toContainEqual([3, "4", "4"]);
        expect(fretted).toContainEqual([2, "3", "2"]);
      });

      it("should include the muted 6th string as [6, 'x']", () => {
        const chord = SvgGuitarUtil.toChord("Bm", BM_VARIANT);
        expect(chord.fingers).toContainEqual([6, "x"]);
      });
    });

    describe("finger label edge cases", () => {
      it("should use an empty string as the finger label when the finger value is 'x'", () => {
        // A fretted string (non-open, non-muted) with finger "x" should get label ""
        const variant: Variant = {
          frets: ["1", "x", "x", "x", "x", "x"],
          fingers: ["x", "x", "x", "x", "x", "x"],
          barres: [],
          capo: false,
          baseFret: 1,
          midi: [],
        };
        const chord = SvgGuitarUtil.toChord("Test", variant);
        const fretted = chord.fingers.filter((f) => f[1] !== "x");
        expect(fretted.length).toBe(1);
        expect(fretted[0]).toEqual([6, "1", ""]); // finger label is empty string
      });
    });
  });
});

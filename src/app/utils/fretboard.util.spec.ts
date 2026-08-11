import { FretboardUtil } from "./fretboard.util";

describe("FretboardUtil", () => {
  describe("STANDARD_TUNING_MIDI", () => {
    // SoloTabUtil writes string 0 first and its header reads "e B G D A E", so
    // index 0 must be the high E. Reversing this silently mirrors every tab.
    it("should be ordered high E first, matching the tab writer", () => {
      expect(FretboardUtil.STANDARD_TUNING_MIDI[0]).toBe(64);
      expect(FretboardUtil.STANDARD_TUNING_MIDI[5]).toBe(40);
    });
  });

  describe("positionsFor", () => {
    it("should find the open high E string for E4", () => {
      expect(FretboardUtil.positionsFor(64)).toContainEqual({ stringIndex: 0, fret: 0 });
    });

    it("should also find E4 on the B string at the fifth fret", () => {
      expect(FretboardUtil.positionsFor(64)).toContainEqual({ stringIndex: 1, fret: 5 });
    });

    it("should find the single position for the lowest note on the instrument", () => {
      expect(FretboardUtil.positionsFor(40)).toEqual([{ stringIndex: 5, fret: 0 }]);
    });

    it("should find nothing below the open low E", () => {
      expect(FretboardUtil.positionsFor(39)).toEqual([]);
    });

    it("should find nothing above the last fret", () => {
      expect(FretboardUtil.positionsFor(200)).toEqual([]);
    });

    it("should respect a shorter neck when asked", () => {
      expect(FretboardUtil.positionsFor(64, { maximumFret: 4 })).toEqual([{ stringIndex: 0, fret: 0 }]);
    });
  });

  describe("mapNotes", () => {
    // Solos sit around the twelfth fret because that is where the guitar cuts
    // through a mix. It is the default, not a rule — hence the parameter.
    it("should prefer the position nearest the preferred fret", () => {
      const [position] = FretboardUtil.mapNotes([64], { preferredFret: 12 });

      expect(position.fret).toBeGreaterThan(4);
    });

    it("should prefer an open position when asked to play near the nut", () => {
      const [position] = FretboardUtil.mapNotes([64], { preferredFret: 0 });

      expect(position).toEqual({ stringIndex: 0, fret: 0 });
    });

    it("should keep a phrase in one hand position rather than leaping about", () => {
      const positions = FretboardUtil.mapNotes([64, 65, 67, 69], { preferredFret: 12 });
      const frets = positions.map((position) => position.fret);

      expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(5);
    });

    it("should map every note it is given", () => {
      expect(FretboardUtil.mapNotes([64, 66, 68])).toHaveLength(3);
    });

    it("should skip a note that cannot be played at all", () => {
      expect(FretboardUtil.mapNotes([64, 20, 66])).toHaveLength(2);
    });

    it("should return nothing for an empty phrase", () => {
      expect(FretboardUtil.mapNotes([])).toEqual([]);
    });
  });

  describe("chooseOctaveShift", () => {
    // A voice sits one to two octaves below a lead guitar line, so a hummed
    // solo has the right shape and the wrong register.
    it("should lift a hummed phrase into guitar range", () => {
      // A3, B3, C4 — a comfortable male humming range.
      expect(FretboardUtil.chooseOctaveShift([57, 59, 60], 12)).toBeGreaterThan(0);
    });

    it("should leave a phrase already at the preferred position alone", () => {
      // Around the twelfth fret of the high E string.
      expect(FretboardUtil.chooseOctaveShift([76, 77, 79], 12)).toBe(0);
    });

    it("should shift in whole octaves, so the melody is unchanged", () => {
      const shift = FretboardUtil.chooseOctaveShift([45, 47, 48], 12);

      expect(Number.isInteger(shift)).toBe(true);
    });

    it("should return no shift for an empty phrase", () => {
      expect(FretboardUtil.chooseOctaveShift([], 12)).toBe(0);
    });
  });

  describe("transpose", () => {
    it("should move every note by the same number of octaves", () => {
      expect(FretboardUtil.transpose([57, 59, 60], 2)).toEqual([81, 83, 84]);
    });

    it("should leave the phrase untouched for a zero shift", () => {
      expect(FretboardUtil.transpose([57, 59], 0)).toEqual([57, 59]);
    });
  });
});

import { SoloTabInputUtil } from "./solo-tab-input.util";
import { SoloTabUtil } from "./solo-tab.util";

describe("SoloTabInputUtil", () => {
  describe("fromFretPositions", () => {
    it("should write a note on the high E string in the first column", () => {
      expect(SoloTabInputUtil.fromFretPositions([{ stringIndex: 0, fret: 12 }])).toBe("12 - - - - -");
    });

    it("should write a note on the B string in the second column", () => {
      expect(SoloTabInputUtil.fromFretPositions([{ stringIndex: 1, fret: 13 }])).toBe("- 13 - - - -");
    });

    it("should write the low E string in the sixth column", () => {
      expect(SoloTabInputUtil.fromFretPositions([{ stringIndex: 5, fret: 3 }])).toBe("- - - - - 3");
    });

    // Every line carries all six columns even when five are empty: the
    // converter counts columns to decide how many strings the tab has.
    it("should always write six columns", () => {
      const line = SoloTabInputUtil.fromFretPositions([{ stringIndex: 0, fret: 12 }]);

      expect(line.split(" ")).toHaveLength(6);
    });

    it("should give each note its own line, so notes sound one after another", () => {
      const lines = SoloTabInputUtil.fromFretPositions([
        { stringIndex: 0, fret: 12 },
        { stringIndex: 1, fret: 13 },
      ]).split("\n");

      expect(lines).toEqual(["12 - - - - -", "- 13 - - - -"]);
    });

    it("should produce nothing for an empty phrase", () => {
      expect(SoloTabInputUtil.fromFretPositions([])).toBe("");
    });
  });

  // The point of emitting this format rather than a tab directly: the dialog's
  // existing converter already turns it into an ASCII tab, and the user can
  // still edit the notes by hand before it does.
  describe("feeding the existing converter", () => {
    it("should produce input the tab converter renders as a six-string tab", () => {
      const input = SoloTabInputUtil.fromFretPositions([
        { stringIndex: 0, fret: 12 },
        { stringIndex: 1, fret: 13 },
        { stringIndex: 0, fret: 15 },
      ]);

      const { generatedSoloTab } = SoloTabUtil.convert(input);

      expect(generatedSoloTab.split("\n")).toEqual(["12--15", "--13--", "------", "------", "------", "------"]);
    });

    it("should keep a two-digit fret aligned with its neighbours", () => {
      const { generatedSoloTab } = SoloTabUtil.convert(
        SoloTabInputUtil.fromFretPositions([
          { stringIndex: 0, fret: 5 },
          { stringIndex: 0, fret: 12 },
        ]),
      );

      const [highEString] = generatedSoloTab.split("\n");
      expect(highEString).toBe("512");
    });
  });
});

import { SoloTabUtil } from "./solo-tab.util";

describe("SoloTabUtil", () => {
  describe("convert", () => {
    describe("generatedSoloTab — transposition", () => {
      it("should produce one line per string from the header line", () => {
        const result = SoloTabUtil.convert("e B G D A E");
        expect(result.generatedSoloTab.split("\n").length).toBe(6);
      });

      it("should transpose columns into rows correctly", () => {
        // 2 lines, 3 strings each → 3 output lines of 2 chars
        const result = SoloTabUtil.convert("0 2 2\n1 3 3");
        const lines = result.generatedSoloTab.split("\n");
        expect(lines[0]).toBe("01");
        expect(lines[1]).toBe("23");
        expect(lines[2]).toBe("23");
      });

      it("should handle a | bar separator — all strings get '|'", () => {
        const result = SoloTabUtil.convert("0 2 2\n|\n0 2 2");
        const lines = result.generatedSoloTab.split("\n");
        // each output string line should contain exactly one '|' from the bar row
        lines.forEach((line) => expect(line).toContain("|"));
      });

      it("should handle a .. dot notation — middle two strings get '•'", () => {
        // 4 strings: index = round(4/2)-1 = 1, so strings[1] and [2] get '•'
        const result = SoloTabUtil.convert("0 0 0 0\n..");
        const lines = result.generatedSoloTab.split("\n");
        expect(lines[1]).toContain("•");
        expect(lines[2]).toContain("•");
        expect(lines[0]).not.toContain("•");
        expect(lines[3]).not.toContain("•");
      });

      it("should pad shorter values with dashes to match the longest value on a line", () => {
        // "10" is length 2, "2" and "3" are length 1 → padded to "2-" "3-"
        const result = SoloTabUtil.convert("10 2 3");
        const lines = result.generatedSoloTab.split("\n");
        expect(lines[0]).toBe("10");
        expect(lines[1]).toBe("2-");
        expect(lines[2]).toBe("3-");
      });

      it("should treat an empty string value as a dash", () => {
        // "0  2" has two spaces → middle string is empty → becomes "-"
        const result = SoloTabUtil.convert("0  2");
        const lines = result.generatedSoloTab.split("\n");
        expect(lines[1]).toBe("-");
      });

      it("should handle a single-string single-line input", () => {
        const result = SoloTabUtil.convert("5");
        expect(result.generatedSoloTab).toBe("5");
      });
    });

    describe("handyRows — deduplication", () => {
      it("should include each unique input line as a handy row", () => {
        const result = SoloTabUtil.convert("0 2 2\n1 3 3");
        expect(result.handyRows.length).toBe(2);
      });

      it("should deduplicate repeated input lines", () => {
        const result = SoloTabUtil.convert("0 2 2\n0 2 2\n1 3 3");
        expect(result.handyRows.length).toBe(2);
        expect(result.handyRows[0].input).toBe("0 2 2");
        expect(result.handyRows[1].input).toBe("1 3 3");
      });

      it("should keep the first occurrence when deduplicating", () => {
        const result = SoloTabUtil.convert("0 2 2\n1 3 3\n0 2 2");
        expect(result.handyRows[0].input).toBe("0 2 2");
        expect(result.handyRows[1].input).toBe("1 3 3");
        expect(result.handyRows.length).toBe(2);
      });

      it("should store the correct output array for each handy row", () => {
        const result = SoloTabUtil.convert("0 2\n|");
        const barRow = result.handyRows.find((r) => r.input === "|");
        expect(barRow?.output).toEqual(["|", "|"]);
      });

      it("should include | and .. as handy rows", () => {
        const result = SoloTabUtil.convert("0 2\n|\n..");
        const inputs = result.handyRows.map((r) => r.input);
        expect(inputs).toContain("|");
        expect(inputs).toContain("..");
      });
    });

    describe("edge cases", () => {
      it("should trim trailing spaces from each line", () => {
        const result = SoloTabUtil.convert("0 2   ");
        // trimEnd removes trailing spaces, so only 2 strings
        expect(result.generatedSoloTab.split("\n").length).toBe(2);
      });

      it("should handle the default initial value used by the component", () => {
        const defaultInput = "e B G D A E\n|\n";
        const result = SoloTabUtil.convert(defaultInput);
        expect(result.generatedSoloTab.split("\n").length).toBe(6);
        expect(result.handyRows.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});

import _ from "lodash";

export type HandyRow = {
  input: string;
  output: string[];
};

export type SoloTabResult = {
  generatedSoloTab: string;
  handyRows: HandyRow[];
};

export class SoloTabUtil {
  /**
   * Converts a raw solo-tab input (space-separated string values per line)
   * into a transposed, per-string tab output and a deduplicated list of handy rows.
   */
  static convert(soloTab: string): SoloTabResult {
    const lines = soloTab.split("\n").map((line) => line.trimEnd());
    const nbStrings = Math.max(...lines.map((line) => line.split(" ").length));

    const matrix = lines.map((line) => {
      const row: string[] = new Array(nbStrings);

      if (line === "|") {
        row.fill("|");
        return row;
      }

      row.fill("-");

      if (line === "..") {
        const index = Math.round(nbStrings / 2) - 1;
        row[index] = "•";
        row[index + 1] = "•";
        return row;
      }

      const stringValues = line.split(" ").map((stringValue) => (stringValue === "" ? "-" : stringValue));
      Object.assign(row, stringValues);

      const maxStringValueLength = Math.max(...stringValues.map((stringValue) => stringValue.length));
      return row.map((stringValue) => stringValue.padEnd(maxStringValueLength, "-"));
    });

    const handyRows = _.range(lines.length)
      .map(
        (lineIndex): HandyRow => ({
          input: lines[lineIndex],
          output: matrix[lineIndex],
        }),
      )
      .filter(
        (handyRow, lineIndex, handyRows) =>
          !handyRows
            .slice(0, lineIndex)
            .map((h) => h.input)
            .includes(handyRow.input),
      );

    const generatedSoloTab = _.range(nbStrings)
      .map((stringIndex) => matrix.reduce((acc, row) => acc + row[stringIndex], ""))
      .join("\n");

    return { generatedSoloTab, handyRows };
  }
}

export class StringUtil {
  static findIndexFromCoordinates(string: string, rowIndex: number, columnIndex: number): number {
    const lines = string.split("\n");
    const truncatedLines = lines.slice(0, rowIndex);
    return truncatedLines.reduce((acc, line) => acc + line.length, 0) + columnIndex + truncatedLines.length;
  }

  static findFirst(
    string: string,
    startIndex: number,
    expectedChar: string,
    nbCharsLookArround: number,
    lookForward: boolean,
  ): number {
    for (let count = 0; count < nbCharsLookArround; count++) {
      const index = startIndex + (lookForward ? count : -count);
      const char = string[index];
      if (char === expectedChar) return index;
    }

    return -1;
  }
}

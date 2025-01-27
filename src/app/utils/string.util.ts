export class StringUtil {
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

  static escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

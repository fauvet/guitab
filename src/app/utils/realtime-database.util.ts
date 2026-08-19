export class RealtimeDatabaseUtil {
  /**
   * Realtime Database keys forbid `. # $ [ ]` — encodeURIComponent alone
   * leaves those untouched, so a title containing a period or a hash would
   * otherwise produce an invalid path.
   */
  static sanitizeKey(value: string): string {
    return encodeURIComponent(value).replace(
      /[.#$[\]]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }
}

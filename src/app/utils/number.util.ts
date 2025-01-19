export class NumberUtil {
  static isNaN(string: string): boolean {
    return !string || Number.isNaN(Number(string));
  }
}

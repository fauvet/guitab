export class ArrayUtil {
  static unique<T>(value: T, index: number, values: T[]): T[] {
    if (index != 0) return [];
    return [...new Set(values)];
  }
}

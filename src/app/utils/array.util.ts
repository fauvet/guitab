export class ArrayUtil {
  static unique<T>(value: T, index: number, values: T[]): T[] {
    if (index != 0) return [];
    return [...new Set(values)];
  }

  static findIndexes<T>(values: T[], value: T): number[] {
    const indexes: number[] = [];
    let lastIndex = -1;
    while ((lastIndex = values.indexOf(value, lastIndex + 1)) != -1) {
      indexes.push(lastIndex);
    }
    return indexes;
  }
}

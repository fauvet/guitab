import { ArrayUtil } from "./array.util";

describe("ArrayUtil", () => {
  describe("unique", () => {
    it("should deduplicate an array of numbers when used with flatMap", () => {
      const result = [1, 2, 1, 3].flatMap(ArrayUtil.unique);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should deduplicate an array of strings when used with flatMap", () => {
      const result = ["a", "b", "a", "c", "b"].flatMap(ArrayUtil.unique);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should preserve the first occurrence order", () => {
      const result = [3, 1, 2, 1, 3].flatMap(ArrayUtil.unique);
      expect(result).toEqual([3, 1, 2]);
    });

    it("should return an unchanged array when there are no duplicates", () => {
      const result = [1, 2, 3].flatMap(ArrayUtil.unique);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should return an empty array when input is empty", () => {
      const result = ([] as number[]).flatMap(ArrayUtil.unique);
      expect(result).toEqual([]);
    });

    it("should return a single-element array unchanged", () => {
      const result = [42].flatMap(ArrayUtil.unique);
      expect(result).toEqual([42]);
    });
  });

  describe("findIndexes", () => {
    it("should return all indexes where the value occurs", () => {
      expect(ArrayUtil.findIndexes([1, 2, 1, 3, 1], 1)).toEqual([0, 2, 4]);
    });

    it("should return a single index when the value appears once", () => {
      expect(ArrayUtil.findIndexes([1, 2, 3], 2)).toEqual([1]);
    });

    it("should return an empty array when the value is not found", () => {
      expect(ArrayUtil.findIndexes([1, 2, 3], 99)).toEqual([]);
    });

    it("should return an empty array for an empty input", () => {
      expect(ArrayUtil.findIndexes([], 1)).toEqual([]);
    });

    it("should handle adjacent duplicate values", () => {
      expect(ArrayUtil.findIndexes([5, 5, 5], 5)).toEqual([0, 1, 2]);
    });

    it("should work with string arrays", () => {
      expect(ArrayUtil.findIndexes(["a", "b", "a"], "a")).toEqual([0, 2]);
    });
  });
});

import { NumberUtil } from "./number.util";

describe("NumberUtil", () => {
  describe("isNaN", () => {
    it("should return true for an empty string", () => {
      expect(NumberUtil.isNaN("")).toBe(true);
    });

    it("should return true for a non-numeric string", () => {
      expect(NumberUtil.isNaN("abc")).toBe(true);
    });

    it("should return true for a string with letters mixed with digits", () => {
      expect(NumberUtil.isNaN("3x")).toBe(true);
    });

    it("should return false for a positive integer string", () => {
      expect(NumberUtil.isNaN("42")).toBe(false);
    });

    it("should return false for zero", () => {
      expect(NumberUtil.isNaN("0")).toBe(false);
    });

    it("should return false for a negative integer string", () => {
      expect(NumberUtil.isNaN("-3")).toBe(false);
    });

    it("should return false for a decimal string", () => {
      expect(NumberUtil.isNaN("3.14")).toBe(false);
    });

    it("should return true for 'x' (muted string notation)", () => {
      expect(NumberUtil.isNaN("x")).toBe(true);
    });
  });
});

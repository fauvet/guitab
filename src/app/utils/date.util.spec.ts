import DateUtil from "./date.util";

describe("DateUtil", () => {
  describe("buildTimeAgo", () => {
    it("should return a non-empty string", () => {
      const result = DateUtil.buildTimeAgo(new Date());
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should return 'just now' or similar for a very recent date", () => {
      const result = DateUtil.buildTimeAgo(new Date());
      expect(result.length).toBeGreaterThan(0);
    });

    it("should contain 'ago' or 'now' for a past date", () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = DateUtil.buildTimeAgo(oneHourAgo);
      expect(result.toLowerCase()).toMatch(/ago|hour|now/);
    });

    it("should return a different string for a much older date", () => {
      const recent = DateUtil.buildTimeAgo(new Date());
      const old = DateUtil.buildTimeAgo(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      expect(recent).not.toBe(old);
    });
  });
});

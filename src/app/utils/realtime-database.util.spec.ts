import { RealtimeDatabaseUtil } from "./realtime-database.util";

describe("RealtimeDatabaseUtil", () => {
  describe("sanitizeKey", () => {
    it("leaves an alphanumeric string untouched", () => {
      expect(RealtimeDatabaseUtil.sanitizeKey("HotelCalifornia")).toBe("HotelCalifornia");
    });

    it("escapes a period, which encodeURIComponent alone would leave in place", () => {
      const key = RealtimeDatabaseUtil.sanitizeKey("Mr. Blue Sky");
      expect(key).not.toContain(".");
    });

    it("escapes each of the five characters Realtime Database forbids in a key", () => {
      const key = RealtimeDatabaseUtil.sanitizeKey(".#$[]");
      expect(key).not.toMatch(/[.#$[\]]/);
    });

    it("still encodes a forward slash, same as encodeURIComponent", () => {
      const key = RealtimeDatabaseUtil.sanitizeKey("AC/DC");
      expect(key).not.toContain("/");
    });

    it("produces different keys for different titles, so entries don't collide", () => {
      const first = RealtimeDatabaseUtil.sanitizeKey("Song One (Artist)");
      const second = RealtimeDatabaseUtil.sanitizeKey("Song Two (Artist)");
      expect(first).not.toBe(second);
    });

    it("is stable — the same input always produces the same key", () => {
      const key = "Hotel California (Eagles)";
      expect(RealtimeDatabaseUtil.sanitizeKey(key)).toBe(RealtimeDatabaseUtil.sanitizeKey(key));
    });
  });
});

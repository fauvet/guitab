import { StringUtil } from "./string.util";

describe("StringUtil", () => {
  describe("findFirst", () => {
    describe("looking forward", () => {
      it("should find the character at the start index itself", () => {
        expect(StringUtil.findFirst("abcde", 2, "c", 3, true)).toBe(2);
      });

      it("should find the character ahead of the start index", () => {
        expect(StringUtil.findFirst("abcde", 1, "c", 5, true)).toBe(2);
      });

      it("should return -1 when the character is not within the look-around range", () => {
        expect(StringUtil.findFirst("abcde", 0, "e", 2, true)).toBe(-1);
      });

      it("should return -1 when the character is not in the string", () => {
        expect(StringUtil.findFirst("abcde", 0, "z", 10, true)).toBe(-1);
      });

      it("should respect the nbCharsLookAround limit exactly", () => {
        // "c" is at index 2, startIndex=0, limit=3 → indexes checked: 0,1,2 → found
        expect(StringUtil.findFirst("abcde", 0, "c", 3, true)).toBe(2);
        // same but limit=2 → indexes checked: 0,1 → not found
        expect(StringUtil.findFirst("abcde", 0, "c", 2, true)).toBe(-1);
      });
    });

    describe("looking backward", () => {
      it("should find the character at the start index itself", () => {
        expect(StringUtil.findFirst("abcde", 2, "c", 3, false)).toBe(2);
      });

      it("should find the character behind the start index", () => {
        expect(StringUtil.findFirst("abcde", 3, "b", 5, false)).toBe(1);
      });

      it("should return -1 when the character is not within the look-around range", () => {
        expect(StringUtil.findFirst("abcde", 4, "a", 2, false)).toBe(-1);
      });

      it("should return -1 when the character is not in the string", () => {
        expect(StringUtil.findFirst("abcde", 4, "z", 10, false)).toBe(-1);
      });
    });
  });

  describe("escapeRegExp", () => {
    it("should escape dots", () => {
      expect(StringUtil.escapeRegExp("a.b")).toBe("a\\.b");
    });

    it("should escape asterisks", () => {
      expect(StringUtil.escapeRegExp("a*b")).toBe("a\\*b");
    });

    it("should escape all special regex characters", () => {
      const special = ".*+?^${}()|[]\\";
      const escaped = StringUtil.escapeRegExp(special);
      // every special char should now be safely usable in a RegExp
      expect(() => new RegExp(escaped)).not.toThrow();
    });

    it("should not alter strings with no special characters", () => {
      expect(StringUtil.escapeRegExp("hello world")).toBe("hello world");
    });

    it("should return an empty string unchanged", () => {
      expect(StringUtil.escapeRegExp("")).toBe("");
    });
  });

  describe("stripDiacritics", () => {
    it("should remove accents from characters", () => {
      expect(StringUtil.stripDiacritics("café")).toBe("cafe");
    });

    it("should leave strings with no accents unchanged", () => {
      expect(StringUtil.stripDiacritics("hello world")).toBe("hello world");
    });

    it("should return an empty string unchanged", () => {
      expect(StringUtil.stripDiacritics("")).toBe("");
    });
  });

  describe("insert", () => {
    it("should insert at the beginning (index 0)", () => {
      expect(StringUtil.insert("world", "hello ", 0)).toBe("hello world");
    });

    it("should insert at the end (index = string length)", () => {
      expect(StringUtil.insert("hello", "!", 5)).toBe("hello!");
    });

    it("should insert in the middle", () => {
      expect(StringUtil.insert("helloworld", " ", 5)).toBe("hello world");
    });

    it("should insert an empty string without modifying the original", () => {
      expect(StringUtil.insert("hello", "", 2)).toBe("hello");
    });

    it("should insert into an empty string at index 0", () => {
      expect(StringUtil.insert("", "abc", 0)).toBe("abc");
    });
  });
});

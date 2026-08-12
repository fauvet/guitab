import { YouTubeUtil } from "./youtube.util";

describe("YouTubeUtil", () => {
  describe("buildEmbedUrl", () => {
    it("should return null for an empty string", () => {
      expect(YouTubeUtil.buildEmbedUrl("")).toBeNull();
    });

    it("should convert a youtu.be short link to an embed URL", () => {
      expect(YouTubeUtil.buildEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://youtube.com/embed/dQw4w9WgXcQ");
    });

    it("should convert a /watch?v= URL to an embed URL", () => {
      expect(YouTubeUtil.buildEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
      );
    });

    it("should leave an already-embedded URL unchanged", () => {
      const embedUrl = "https://youtube.com/embed/dQw4w9WgXcQ";
      expect(YouTubeUtil.buildEmbedUrl(embedUrl)).toBe(embedUrl);
    });

    it("should handle a youtu.be URL without https prefix", () => {
      expect(YouTubeUtil.buildEmbedUrl("youtu.be/dQw4w9WgXcQ")).toBe("youtube.com/embed/dQw4w9WgXcQ");
    });

    it("should return the original string when no known pattern is found", () => {
      const arbitrary = "https://vimeo.com/12345";
      expect(YouTubeUtil.buildEmbedUrl(arbitrary)).toBe(arbitrary);
    });
  });
});

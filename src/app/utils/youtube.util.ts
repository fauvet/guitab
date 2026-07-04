export class YouTubeUtil {
  /**
   * Converts a YouTube URL (youtu.be short link or /watch?v= format)
   * to its embed URL equivalent.
   * Returns null for empty input.
   */
  static buildEmbedUrl(youTubeUrl: string): string | null {
    if (!youTubeUrl) return null;
    return youTubeUrl.replace("youtu.be/", "youtube.com/embed/").replace("/watch?v=", "/embed/");
  }
}

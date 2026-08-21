import CachedFile from "../types/cached-file.type";
import { StringUtil } from "./string.util";

export class CachedFileUtil {
  static filterByQuery(cachedFiles: readonly CachedFile[], query: string): CachedFile[] {
    const normalizedQuery = StringUtil.stripDiacritics(query.trim().toLowerCase());
    if (!normalizedQuery) return [...cachedFiles];

    return cachedFiles.filter((cachedFile) =>
      StringUtil.stripDiacritics(cachedFile.name.toLowerCase()).includes(normalizedQuery),
    );
  }
}

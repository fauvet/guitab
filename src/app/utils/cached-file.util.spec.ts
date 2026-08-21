import { CachedFileUtil } from "./cached-file.util";
import CachedFile from "../types/cached-file.type";

describe("CachedFileUtil", () => {
  const buildCachedFile = (name: string): CachedFile => ({
    id: name,
    name,
    chordproContent: "",
    date: new Date(),
  });

  describe("filterByQuery", () => {
    it("returns every file, in the same order, when the query is empty", () => {
      const cachedFiles = [buildCachedFile("Wonderwall (Oasis)"), buildCachedFile("Yesterday (The Beatles)")];

      expect(CachedFileUtil.filterByQuery(cachedFiles, "")).toEqual(cachedFiles);
    });

    it("returns every file when the query is only whitespace", () => {
      const cachedFiles = [buildCachedFile("Wonderwall (Oasis)")];

      expect(CachedFileUtil.filterByQuery(cachedFiles, "   ")).toEqual(cachedFiles);
    });

    it("keeps only files whose name contains the query", () => {
      const wonderwall = buildCachedFile("Wonderwall (Oasis)");
      const yesterday = buildCachedFile("Yesterday (The Beatles)");

      expect(CachedFileUtil.filterByQuery([wonderwall, yesterday], "Oasis")).toEqual([wonderwall]);
    });

    it("matches regardless of case", () => {
      const wonderwall = buildCachedFile("Wonderwall (Oasis)");

      expect(CachedFileUtil.filterByQuery([wonderwall], "oasis")).toEqual([wonderwall]);
      expect(CachedFileUtil.filterByQuery([wonderwall], "OASIS")).toEqual([wonderwall]);
    });

    it("matches regardless of diacritics, in the query or in the name", () => {
      const cafe = buildCachedFile("Café (Artist)");

      expect(CachedFileUtil.filterByQuery([cafe], "cafe")).toEqual([cafe]);
      expect(CachedFileUtil.filterByQuery([buildCachedFile("Cafe (Artist)")], "café")).toHaveLength(1);
    });

    it("returns an empty array when nothing matches", () => {
      const cachedFiles = [buildCachedFile("Wonderwall (Oasis)")];

      expect(CachedFileUtil.filterByQuery(cachedFiles, "no such song")).toEqual([]);
    });
  });
});

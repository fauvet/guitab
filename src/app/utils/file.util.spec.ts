import FileSaver from "file-saver";
import { FileUtil } from "./file.util";

// Note: FileReader and FileSystemFileHandle are not supported in the jsdom
// test environment. Tests that depend on them (File/FileSystemFileHandle reading)
// are covered indirectly through service-level tests with mocks.
describe("FileUtil", () => {
  describe("getFileContent", () => {
    it("should resolve to an empty string when file is null", async () => {
      const result = await FileUtil.getFileContent(null);
      expect(result).toBe("");
    });
  });

  describe("isFileSystemFileHandle", () => {
    // This is the guard itself: on a browser without the File System Access
    // API — every browser this test environment stands in for — the global
    // does not exist at all, so a bare `instanceof FileSystemFileHandle`
    // would throw instead of returning false. Proving this never throws is
    // the entire point of the test.
    it("returns false without throwing for a plain object, matching a browser without the File System Access API", () => {
      expect(() => FileUtil.isFileSystemFileHandle({})).not.toThrow();
      expect(FileUtil.isFileSystemFileHandle({})).toBe(false);
    });

    it("returns false without throwing for null", () => {
      expect(FileUtil.isFileSystemFileHandle(null)).toBe(false);
    });

    it("returns false without throwing for a real File instance", () => {
      const file = new File(["content"], "song.cho");
      expect(FileUtil.isFileSystemFileHandle(file)).toBe(false);
    });
  });

  describe("downloadBlob", () => {
    it("saves the given blob under the given file name", () => {
      const saveAsSpy = vi.spyOn(FileSaver, "saveAs").mockImplementation(() => {});
      const blob = new Blob(["content"]);

      FileUtil.downloadBlob(blob, "song.cho");

      expect(saveAsSpy).toHaveBeenCalledWith(blob, "song.cho");
    });
  });

  describe("downloadAsFile", () => {
    it("wraps the content in a text blob and saves it under the given file name", () => {
      const saveAsSpy = vi.spyOn(FileSaver, "saveAs").mockImplementation(() => {});

      FileUtil.downloadAsFile("{title: Song}", "song.cho");

      expect(saveAsSpy).toHaveBeenCalledWith(expect.any(Blob), "song.cho");
    });
  });

  describe("canOpenFilePicker", () => {
    afterEach(() => {
      delete (window as any).showOpenFilePicker;
    });

    it("should return false when showOpenFilePicker is not available in window", () => {
      expect(FileUtil.canOpenFilePicker()).toBe(false);
    });

    it("should return true when showOpenFilePicker is available in window", () => {
      (window as any).showOpenFilePicker = vi.fn();
      expect(FileUtil.canOpenFilePicker()).toBe(true);
    });
  });
});

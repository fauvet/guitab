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
});

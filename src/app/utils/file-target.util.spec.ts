import { FileTargetUtil } from "./file-target.util";
import { FileTarget } from "../types/file-target.type";

/**
 * The point of this util is that none of it needs a browser: jsdom has no
 * `FileSystemFileHandle`, and neither does an Android WebView. A plain object
 * with a `name` stands in for one, which is precisely the situation the tagged
 * union exists to make safe.
 */
const buildHandle = (name: string): FileSystemFileHandle => ({ name }) as FileSystemFileHandle;

describe("FileTargetUtil", () => {
  describe("getName", () => {
    it("should return an empty string when there is no target", () => {
      expect(FileTargetUtil.getName(null)).toBe("");
    });

    it("should read the name of a web file", () => {
      const target = FileTargetUtil.fromFile(new File(["{title: Song}"], "song.cho"));
      expect(FileTargetUtil.getName(target)).toBe("song.cho");
    });

    it("should read the name of a web handle", () => {
      const target = FileTargetUtil.fromHandle(buildHandle("song.cho"));
      expect(FileTargetUtil.getName(target)).toBe("song.cho");
    });

    it("should read the name of a native target", () => {
      const target = FileTargetUtil.fromNative("content://songs/1", "song.cho");
      expect(FileTargetUtil.getName(target)).toBe("song.cho");
    });
  });

  describe("isWritable", () => {
    it("should be false when there is no target", () => {
      expect(FileTargetUtil.isWritable(null)).toBe(false);
    });

    it("should be false for a web file, which the browser gives no way to write back to", () => {
      expect(FileTargetUtil.isWritable(FileTargetUtil.fromFile(new File([""], "song.cho")))).toBe(false);
    });

    it("should be true for a web handle", () => {
      expect(FileTargetUtil.isWritable(FileTargetUtil.fromHandle(buildHandle("song.cho")))).toBe(true);
    });

    it("should be true for a native target", () => {
      expect(FileTargetUtil.isWritable(FileTargetUtil.fromNative("content://songs/1", "song.cho"))).toBe(true);
    });

    // The regression this whole type exists for: the previous check was
    // `handle instanceof FileSystemFileHandle`, which throws rather than
    // returning false where the global is undefined.
    it("should not read FileSystemFileHandle from the global scope", () => {
      const original = Reflect.get(globalThis, "FileSystemFileHandle");
      Reflect.deleteProperty(globalThis, "FileSystemFileHandle");

      try {
        expect(() => FileTargetUtil.isWritable(FileTargetUtil.fromHandle(buildHandle("song.cho")))).not.toThrow();
      } finally {
        if (original !== undefined) Reflect.set(globalThis, "FileSystemFileHandle", original);
      }
    });
  });

  describe("areSame", () => {
    it("should treat two absent targets as the same", () => {
      expect(FileTargetUtil.areSame(null, null)).toBe(true);
    });

    it("should treat an absent and a present target as different", () => {
      expect(FileTargetUtil.areSame(null, FileTargetUtil.fromNative("content://songs/1", "song.cho"))).toBe(false);
    });

    it("should compare web files by reference, not by name", () => {
      const file = new File(["{title: Song}"], "song.cho");

      expect(FileTargetUtil.areSame(FileTargetUtil.fromFile(file), FileTargetUtil.fromFile(file))).toBe(true);
      expect(
        FileTargetUtil.areSame(
          FileTargetUtil.fromFile(file),
          FileTargetUtil.fromFile(new File(["{title: Song}"], "song.cho")),
        ),
      ).toBe(false);
    });

    it("should compare web handles by reference", () => {
      const handle = buildHandle("song.cho");

      expect(FileTargetUtil.areSame(FileTargetUtil.fromHandle(handle), FileTargetUtil.fromHandle(handle))).toBe(true);
      expect(
        FileTargetUtil.areSame(FileTargetUtil.fromHandle(handle), FileTargetUtil.fromHandle(buildHandle("song.cho"))),
      ).toBe(false);
    });

    // A native target is re-created from scratch on every launch intent, so
    // reference equality would report a different file each time the same one
    // is reopened. The URI is the identity the host guarantees.
    it("should compare native targets by uri", () => {
      expect(
        FileTargetUtil.areSame(
          FileTargetUtil.fromNative("content://songs/1", "song.cho"),
          FileTargetUtil.fromNative("content://songs/1", "renamed.cho"),
        ),
      ).toBe(true);
      expect(
        FileTargetUtil.areSame(
          FileTargetUtil.fromNative("content://songs/1", "song.cho"),
          FileTargetUtil.fromNative("content://songs/2", "song.cho"),
        ),
      ).toBe(false);
    });

    it("should treat targets of different kinds as different", () => {
      const target1: FileTarget = FileTargetUtil.fromFile(new File([""], "song.cho"));
      const target2: FileTarget = FileTargetUtil.fromHandle(buildHandle("song.cho"));

      expect(FileTargetUtil.areSame(target1, target2)).toBe(false);
    });
  });
});

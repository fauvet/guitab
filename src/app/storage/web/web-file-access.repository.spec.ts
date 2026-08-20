import { TestBed } from "@angular/core/testing";
import FileSaver from "file-saver";
import { WebFileAccessRepository } from "./web-file-access.repository";
import { FileUtil } from "../../utils/file.util";
import { FileTargetUtil } from "../../utils/file-target.util";

describe("WebFileAccessRepository", () => {
  let repository: WebFileAccessRepository;

  const setPicker = (name: "showOpenFilePicker" | "showSaveFilePicker", value: unknown): void => {
    if (value === undefined) {
      Reflect.deleteProperty(window, name);
      return;
    }
    Object.defineProperty(window, name, { value, configurable: true, writable: true });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(WebFileAccessRepository);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setPicker("showOpenFilePicker", undefined);
    setPicker("showSaveFilePicker", undefined);
  });

  describe("canPickOpen", () => {
    it("should be false when the browser has no open picker", () => {
      setPicker("showOpenFilePicker", undefined);
      expect(repository.canPickOpen()).toBe(false);
    });

    it("should be true when the browser has one", () => {
      setPicker("showOpenFilePicker", vi.fn());
      expect(repository.canPickOpen()).toBe(true);
    });
  });

  describe("openFile", () => {
    it("should read the file the picker returned", async () => {
      const handle = { name: "song.cho" } as FileSystemFileHandle;
      setPicker("showOpenFilePicker", vi.fn().mockResolvedValue([handle]));
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Song}");

      const picked = await repository.openFile(new Event("change"));

      expect(picked).toEqual({ fileTarget: FileTargetUtil.fromHandle(handle), content: "{title: Song}" });
    });

    it("should fall back to the input element when there is no picker", async () => {
      setPicker("showOpenFilePicker", undefined);
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Song}");
      const file = new File(["{title: Song}"], "song.cho");
      const event = { target: { files: [file] } } as unknown as Event;

      const picked = await repository.openFile(event);

      expect(picked?.fileTarget).toEqual(FileTargetUtil.fromFile(file));
    });

    // Backing out of a picker is a decision, not a failure: it must not reach
    // the user as an error, and it must be told apart from one that is.
    it("should return nothing when the user cancels the picker", async () => {
      setPicker("showOpenFilePicker", vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")));

      expect(await repository.openFile(new Event("change"))).toBeNull();
    });

    it("should throw a named Error when the picker fails for any other reason", async () => {
      setPicker("showOpenFilePicker", vi.fn().mockRejectedValue(new Error("boom")));

      await expect(repository.openFile(new Event("change"))).rejects.toThrow(/Could not open the file picker/);
    });

    it("should return nothing when the input element carries no file", async () => {
      setPicker("showOpenFilePicker", undefined);

      const picked = await repository.openFile({ target: { files: [] } } as unknown as Event);

      expect(picked).toBeNull();
    });
  });

  describe("writeFile", () => {
    it("should write through the handle and close it", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const handle = { name: "song.cho", createWritable: vi.fn().mockResolvedValue(writable) };

      await repository.writeFile(FileTargetUtil.fromHandle(handle as unknown as FileSystemFileHandle), "{title: Song}");

      expect(writable.write).toHaveBeenCalledWith("{title: Song}");
      expect(writable.close).toHaveBeenCalledTimes(1);
    });

    // Not a theoretical branch: this is what a native target reaching the web
    // strategy would look like, and silently doing nothing would report a save
    // that never happened.
    it("should refuse a target it cannot write to", async () => {
      const fileTarget = FileTargetUtil.fromFile(new File([""], "song.cho"));

      await expect(repository.writeFile(fileTarget, "{title: Song}")).rejects.toThrow(/cannot write/);
    });
  });

  describe("saveFileAs", () => {
    it("should write through the handle the save picker returned", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const handle = { name: "song.cho", createWritable: vi.fn().mockResolvedValue(writable) };
      setPicker("showSaveFilePicker", vi.fn().mockResolvedValue(handle));

      const result = await repository.saveFileAs("{title: Song}", "song.cho");

      expect(result).toEqual({
        outcome: "saved",
        fileTarget: FileTargetUtil.fromHandle(handle as unknown as FileSystemFileHandle),
      });
      expect(writable.write).toHaveBeenCalledWith("{title: Song}");
    });

    it("should report a cancelled save dialog as cancelled, not as a failure", async () => {
      setPicker("showSaveFilePicker", vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")));

      expect(await repository.saveFileAs("{title: Song}", "song.cho")).toEqual({ outcome: "cancelled" });
    });

    it("should throw a named Error when the save dialog fails for any other reason", async () => {
      setPicker("showSaveFilePicker", vi.fn().mockRejectedValue(new Error("boom")));

      await expect(repository.saveFileAs("{title: Song}", "song.cho")).rejects.toThrow(
        /Could not open the save dialog/,
      );
    });

    it("should name the file it could not write to", async () => {
      const handle = { name: "song.cho", createWritable: vi.fn().mockRejectedValue(new Error("boom")) };
      setPicker("showSaveFilePicker", vi.fn().mockResolvedValue(handle));

      await expect(repository.saveFileAs("{title: Song}", "song.cho")).rejects.toThrow(/Could not save "song.cho"/);
    });

    it("should report a confirmed download as saved, but with nothing to write back to", async () => {
      setPicker("showSaveFilePicker", undefined);
      const saveAs = vi.spyOn(FileSaver, "saveAs").mockImplementation(() => undefined);
      vi.spyOn(window, "confirm").mockReturnValue(true);

      const result = await repository.saveFileAs("{title: Song}", "song.cho");

      expect(saveAs).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ outcome: "saved", fileTarget: null });
    });

    it("should report a denied download as cancelled", async () => {
      setPicker("showSaveFilePicker", undefined);
      vi.spyOn(FileSaver, "saveAs").mockImplementation(() => undefined);
      vi.spyOn(window, "confirm").mockReturnValue(false);

      const result = await repository.saveFileAs("{title: Song}", "song.cho");

      expect(result).toEqual({ outcome: "cancelled" });
    });
  });
});

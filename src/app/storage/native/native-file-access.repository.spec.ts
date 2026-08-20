import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { take, toArray } from "rxjs/operators";
import { NativeFileAccessRepository } from "./native-file-access.repository";
import { FileTargetUtil } from "../../utils/file-target.util";
import { PickedFile } from "../repositories/file-access.repository";

// vi.mock factories are hoisted above every const in the file, so the spies they
// close over have to be created by vi.hoisted or they do not exist yet when the
// factory runs.
const { pickFiles, readFile, writeFile, getLaunchUrl, addListener } = vi.hoisted(() => ({
  pickFiles: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  getLaunchUrl: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock("@capawesome/capacitor-file-picker", () => ({
  FilePicker: { pickFiles },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { readFile, writeFile },
  Directory: { Documents: "DOCUMENTS" },
  Encoding: { UTF8: "utf8" },
}));

vi.mock("@capacitor/app", () => ({
  App: { getLaunchUrl, addListener },
}));

describe("NativeFileAccessRepository", () => {
  let repository: NativeFileAccessRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    readFile.mockResolvedValue({ data: "{title: Song}" });
    writeFile.mockResolvedValue({ uri: "file:///Documents/song.cho" });
    getLaunchUrl.mockResolvedValue(null);
    addListener.mockResolvedValue({ remove: vi.fn() });

    TestBed.configureTestingModule({});
    repository = TestBed.inject(NativeFileAccessRepository);
  });

  describe("canPickOpen", () => {
    it("should always be true — Android has its own document picker", () => {
      expect(repository.canPickOpen()).toBe(true);
    });
  });

  describe("openFile", () => {
    it("should read the picked file through its content uri", async () => {
      pickFiles.mockResolvedValue({ files: [{ name: "song.cho", path: "content://songs/1" }] });

      const picked = await repository.openFile();

      expect(picked).toEqual({
        fileTarget: FileTargetUtil.fromNative("content://songs/1", "song.cho"),
        content: "{title: Song}",
      });
    });

    it("should return nothing when the user picked nothing", async () => {
      pickFiles.mockResolvedValue({ files: [] });

      expect(await repository.openFile()).toBeNull();
    });

    // An empty song is indistinguishable from a lost one, so a file with no
    // readable path has to fail rather than open blank.
    it("should fail loudly when the picker returned no path", async () => {
      pickFiles.mockResolvedValue({ files: [{ name: "song.cho" }] });

      await expect(repository.openFile()).rejects.toThrow(/no path/);
    });
  });

  describe("writeFile", () => {
    it("should write UTF-8 through the target uri", async () => {
      await repository.writeFile(FileTargetUtil.fromNative("content://songs/1", "song.cho"), "{title: Song}");

      expect(writeFile).toHaveBeenCalledWith({
        path: "content://songs/1",
        data: "{title: Song}",
        encoding: "utf8",
      });
    });

    it("should refuse a target that is not a native one", async () => {
      const fileTarget = FileTargetUtil.fromFile(new File([""], "song.cho"));

      await expect(repository.writeFile(fileTarget, "{title: Song}")).rejects.toThrow(/cannot write/);
    });
  });

  describe("saveFileAs", () => {
    it("should write into the shared Documents folder and adopt the resulting uri", async () => {
      const result = await repository.saveFileAs("{title: Song}", "song.cho");

      expect(writeFile).toHaveBeenCalledWith({
        path: "song.cho",
        data: "{title: Song}",
        directory: "DOCUMENTS",
        encoding: "utf8",
        recursive: true,
      });
      expect(result).toEqual({
        outcome: "saved",
        fileTarget: FileTargetUtil.fromNative("file:///Documents/song.cho", "song.cho"),
      });
    });

    it("should report a cancellation when nothing was written", async () => {
      writeFile.mockResolvedValue({ uri: "" });

      expect(await repository.saveFileAs("{title: Song}", "song.cho")).toEqual({ outcome: "cancelled" });
    });
  });

  describe("getLaunchedFiles$", () => {
    it("should emit the file the app was launched with", async () => {
      getLaunchUrl.mockResolvedValue({ url: "content://songs/1" });

      const picked = await firstValueFrom(repository.getLaunchedFiles$());

      expect(picked.fileTarget).toEqual(FileTargetUtil.fromNative("content://songs/1", "1"));
      expect(picked.content).toBe("{title: Song}");
    });

    it("should emit again when the running app is handed another file", async () => {
      getLaunchUrl.mockResolvedValue({ url: "content://songs/1" });
      addListener.mockImplementation((_event: string, listener: (event: { url: string }) => void) => {
        setTimeout(() => listener({ url: "content://songs/2" }));
        return Promise.resolve({ remove: vi.fn() });
      });

      const picked: PickedFile[] = await firstValueFrom(repository.getLaunchedFiles$().pipe(take(2), toArray()));

      expect(picked.map((file) => file.fileTarget)).toEqual([
        FileTargetUtil.fromNative("content://songs/1", "1"),
        FileTargetUtil.fromNative("content://songs/2", "2"),
      ]);
    });

    it("should stay silent when the app was not launched with a file", async () => {
      const next = vi.fn();
      repository.getLaunchedFiles$().subscribe(next);

      await vi.waitFor(() => expect(getLaunchUrl).toHaveBeenCalled());

      expect(next).not.toHaveBeenCalled();
    });

    it("should remove the listener when the subscription ends", async () => {
      const remove = vi.fn();
      addListener.mockResolvedValue({ remove });

      const subscription = repository.getLaunchedFiles$().subscribe();
      await vi.waitFor(() => expect(addListener).toHaveBeenCalled());
      subscription.unsubscribe();

      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});

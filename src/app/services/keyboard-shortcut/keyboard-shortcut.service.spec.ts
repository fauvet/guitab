import { TestBed } from "@angular/core/testing";
import { EMPTY, of, throwError } from "rxjs";
import { FileActionOutcome, KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import { PlatformService } from "../platform/platform.service";
import { WebFileAccessRepository } from "../../storage/web/web-file-access.repository";
import { NativeFileAccessRepository } from "../../storage/native/native-file-access.repository";
import { FileTargetUtil } from "../../utils/file-target.util";

describe("KeyboardShortcutService", () => {
  let service: KeyboardShortcutService;
  let mockChordproService: {
    undoContent: ReturnType<typeof vi.fn>;
    redoContent: ReturnType<typeof vi.fn>;
    hasUnsavedChanges: ReturnType<typeof vi.fn>;
    getChordproContent: ReturnType<typeof vi.fn>;
    updateChordproSaveState: ReturnType<typeof vi.fn>;
    getChordproContent$: ReturnType<typeof vi.fn>;
  };
  let mockAppContextService: {
    getFileWithContent$: ReturnType<typeof vi.fn>;
    getFileWithContent: ReturnType<typeof vi.fn>;
    setEditing: ReturnType<typeof vi.fn>;
    setFile: ReturnType<typeof vi.fn>;
  };
  let mockCachedFilesService: { saveFile: ReturnType<typeof vi.fn> };
  let mockWebRepository: {
    canPickOpen: ReturnType<typeof vi.fn>;
    openFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    saveFileAs: ReturnType<typeof vi.fn>;
    getLaunchedFiles$: ReturnType<typeof vi.fn>;
  };
  let mockNativeRepository: typeof mockWebRepository;
  let mockPlatformService: { isNative: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockChordproService = {
      undoContent: vi.fn(),
      redoContent: vi.fn(),
      hasUnsavedChanges: vi.fn().mockReturnValue(false),
      getChordproContent: vi.fn().mockReturnValue(""),
      updateChordproSaveState: vi.fn(),
      getChordproContent$: vi.fn().mockReturnValue(EMPTY),
    };

    mockAppContextService = {
      getFileWithContent$: vi.fn().mockReturnValue(EMPTY),
      getFileWithContent: vi.fn().mockReturnValue(null),
      setEditing: vi.fn(),
      setFile: vi.fn().mockResolvedValue(undefined),
    };

    mockCachedFilesService = {
      saveFile: vi.fn().mockResolvedValue(undefined),
    };

    mockWebRepository = {
      canPickOpen: vi.fn().mockReturnValue(false),
      openFile: vi.fn().mockResolvedValue(null),
      writeFile: vi.fn().mockResolvedValue(undefined),
      saveFileAs: vi.fn().mockResolvedValue({ outcome: "saved", fileTarget: null }),
      getLaunchedFiles$: vi.fn().mockReturnValue(EMPTY),
    };

    mockNativeRepository = {
      canPickOpen: vi.fn().mockReturnValue(true),
      openFile: vi.fn().mockResolvedValue(null),
      writeFile: vi.fn().mockResolvedValue(undefined),
      saveFileAs: vi.fn().mockResolvedValue({ outcome: "saved", fileTarget: null }),
      getLaunchedFiles$: vi.fn().mockReturnValue(EMPTY),
    };

    mockPlatformService = { isNative: vi.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: PlatformService, useValue: mockPlatformService },
        { provide: WebFileAccessRepository, useValue: mockWebRepository },
        { provide: NativeFileAccessRepository, useValue: mockNativeRepository },
      ],
    });
    service = TestBed.inject(KeyboardShortcutService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initialize", () => {
    it("should be a no-op and not throw", () => {
      expect(() => service.initialize()).not.toThrow();
    });
  });

  describe("undo", () => {
    it("should call chordproService.undoContent()", async () => {
      await service.undo();
      expect(mockChordproService.undoContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("redo", () => {
    it("should call chordproService.redoContent()", async () => {
      await service.redo();
      expect(mockChordproService.redoContent).toHaveBeenCalledTimes(1);
    });
  });

  // The service listens on document from its constructor, so dispatching a real
  // event is both the simplest way in and the one that matches what a user does.
  describe("keyboard shortcuts", () => {
    const press = (key: string, modifiers: KeyboardEventInit = {}): void => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, ...modifiers }));
    };

    it("should undo on Ctrl+Z", async () => {
      const undo = vi.spyOn(service, "undo").mockResolvedValue(undefined);

      press("z");

      await vi.waitFor(() => expect(undo).toHaveBeenCalled());
    });

    it("should redo on Ctrl+Y", async () => {
      const redo = vi.spyOn(service, "redo").mockResolvedValue(undefined);

      press("y");

      await vi.waitFor(() => expect(redo).toHaveBeenCalled());
    });

    // Holding Shift makes the browser report an uppercase key. Matching only
    // the lowercase letter left both Shift shortcuts unreachable, silently:
    // nothing happened, and nothing said why.
    it("should redo on Ctrl+Shift+Z, which the browser reports as an uppercase Z", async () => {
      const redo = vi.spyOn(service, "redo").mockResolvedValue(undefined);

      press("Z", { shiftKey: true });

      await vi.waitFor(() => expect(redo).toHaveBeenCalled());
    });

    it("should save on Ctrl+S", async () => {
      const saveFile = vi.spyOn(service, "saveFile").mockResolvedValue(true);

      press("s");

      await vi.waitFor(() => expect(saveFile).toHaveBeenCalled());
    });

    it("should save as on Ctrl+Shift+S rather than falling through to a plain save", async () => {
      const saveFileAs = vi.spyOn(service, "saveFileAs").mockResolvedValue(true);
      const saveFile = vi.spyOn(service, "saveFile").mockResolvedValue(true);

      press("S", { shiftKey: true });

      await vi.waitFor(() => expect(saveFileAs).toHaveBeenCalled());
      expect(saveFile).not.toHaveBeenCalled();
    });

    it("should ignore shortcuts while a dialog is open", async () => {
      const backdrop = document.createElement("div");
      backdrop.className = "cdk-overlay-backdrop-showing";
      document.body.appendChild(backdrop);
      const undo = vi.spyOn(service, "undo").mockResolvedValue(undefined);

      press("z");
      await Promise.resolve();

      expect(undo).not.toHaveBeenCalled();
      backdrop.remove();
    });

    it("should leave an unmodified keystroke to the editor", async () => {
      const undo = vi.spyOn(service, "undo").mockResolvedValue(undefined);

      press("z", { ctrlKey: false });
      await Promise.resolve();

      expect(undo).not.toHaveBeenCalled();
    });
  });

  describe("getFileActionOutcome$", () => {
    const press = (key: string, modifiers: KeyboardEventInit = {}): void => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, ...modifiers }));
    };

    it("should emit a saved outcome once a keyboard-triggered save resolves", async () => {
      vi.spyOn(service, "saveFile").mockResolvedValue(true);
      const outcomes: unknown[] = [];
      service.getFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");

      await vi.waitFor(() =>
        expect(outcomes).toContainEqual({ type: "saved", fileName: ChordproUtil.buildFileName("") }),
      );
    });

    it("should not emit a saved outcome when the save was cancelled by the user", async () => {
      vi.spyOn(service, "saveFile").mockResolvedValue(false);
      const outcomes: unknown[] = [];
      service.getFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");
      await Promise.resolve();
      await Promise.resolve();

      expect(outcomes).toEqual([]);
    });

    it("should emit an error outcome when a keyboard-triggered action throws", async () => {
      const error = new Error("Could not save.");
      vi.spyOn(service, "saveFile").mockRejectedValue(error);
      const outcomes: unknown[] = [];
      service.getFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");

      await vi.waitFor(() => expect(outcomes).toContainEqual({ type: "error", error }));
    });
  });

  describe("canOpenFilePicker", () => {
    it("should report what the active repository can do", () => {
      mockWebRepository.canPickOpen.mockReturnValue(true);
      expect(service.canOpenFilePicker()).toBe(true);

      mockWebRepository.canPickOpen.mockReturnValue(false);
      expect(service.canOpenFilePicker()).toBe(false);
    });
  });

  describe("choosing a strategy", () => {
    it("should use the web repository in a browser", async () => {
      await service.openFile(new Event("change"));

      expect(mockWebRepository.openFile).toHaveBeenCalledTimes(1);
    });

    it("should use the native repository on a device", async () => {
      mockPlatformService.isNative.mockReturnValue(true);

      await service.openFile(new Event("change"));

      expect(mockNativeRepository.openFile).toHaveBeenCalledTimes(1);
      expect(mockWebRepository.openFile).not.toHaveBeenCalled();
    });
  });

  describe("openLaunchedFiles", () => {
    it("should open a file the host launched the app with, in preview mode", async () => {
      const fileTarget = FileTargetUtil.fromNative("content://songs/1", "song.cho");
      mockWebRepository.getLaunchedFiles$.mockReturnValue(of({ fileTarget, content: "{title: Song}" }));

      service.openLaunchedFiles();

      await vi.waitFor(() => expect(mockAppContextService.setFile).toHaveBeenCalledWith(fileTarget, "{title: Song}"));
      expect(mockAppContextService.setEditing).toHaveBeenCalledWith(false);
    });

    // The service has no component of its own to hand the failure to, so it
    // reports through the same outcome stream the keyboard shortcuts use.
    it("should report an unreadable launched file rather than failing silently", async () => {
      mockWebRepository.getLaunchedFiles$.mockReturnValue(throwError(() => new Error("unreadable")));
      const outcomes: FileActionOutcome[] = [];
      service.getFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      service.openLaunchedFiles();

      await vi.waitFor(() => expect(outcomes).toHaveLength(1));
      expect(outcomes[0]).toEqual({ type: "error", error: new Error("unreadable") });
      expect(mockAppContextService.setFile).not.toHaveBeenCalled();
    });
  });

  describe("openFile", () => {
    it("should push the picked file and its content into the app context", async () => {
      const fileTarget = FileTargetUtil.fromNative("content://songs/1", "song.cho");
      mockWebRepository.openFile.mockResolvedValue({ fileTarget, content: "{title: Song}" });

      await service.openFile(new Event("change"));

      expect(mockAppContextService.setFile).toHaveBeenCalledWith(fileTarget, "{title: Song}");
      expect(mockAppContextService.setEditing).toHaveBeenCalledWith(false);
      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("{title: Song}");
    });

    // Backing out of the picker reaches here as a null, and must not dismiss
    // the bottom sheet that asked — hence false rather than true.
    it("should open nothing and report failure when the user picked nothing", async () => {
      mockWebRepository.openFile.mockResolvedValue(null);

      const isActionPerformed = await service.openFile(new Event("change"));

      expect(isActionPerformed).toBe(false);
      expect(mockAppContextService.setFile).not.toHaveBeenCalled();
      expect(mockCachedFilesService.saveFile).not.toHaveBeenCalled();
    });

    it("should refuse to discard unsaved changes when the user declines", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      const isActionPerformed = await service.openFile(new Event("change"));

      expect(isActionPerformed).toBe(false);
      expect(mockWebRepository.openFile).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe("saveFile", () => {
    it("should write through a target that can be written to", async () => {
      const fileTarget = FileTargetUtil.fromNative("content://songs/1", "song.cho");
      mockAppContextService.getFileWithContent.mockReturnValue({ fileTarget, content: "" });
      mockChordproService.getChordproContent.mockReturnValue("{title: Song}");

      const isActionPerformed = await service.saveFile();

      expect(isActionPerformed).toBe(true);
      expect(mockWebRepository.writeFile).toHaveBeenCalledWith(fileTarget, "{title: Song}");
      expect(mockWebRepository.saveFileAs).not.toHaveBeenCalled();
      expect(mockChordproService.updateChordproSaveState).toHaveBeenCalled();
    });

    // A file opened through an <input type="file"> cannot be written back to —
    // this used to be `instanceof FileSystemFileHandle`, which throws where the
    // global does not exist.
    it("should fall back to save-as for a file it cannot write back to", async () => {
      const fileTarget = FileTargetUtil.fromFile(new File([""], "song.cho"));
      mockAppContextService.getFileWithContent.mockReturnValue({ fileTarget, content: "" });

      await service.saveFile();

      expect(mockWebRepository.writeFile).not.toHaveBeenCalled();
      expect(mockWebRepository.saveFileAs).toHaveBeenCalledTimes(1);
    });

    it("should report failure and cache nothing when the save was cancelled", async () => {
      mockAppContextService.getFileWithContent.mockReturnValue(null);
      mockWebRepository.saveFileAs.mockResolvedValue({ outcome: "cancelled" });

      const isActionPerformed = await service.saveFile();

      expect(isActionPerformed).toBe(false);
      expect(mockCachedFilesService.saveFile).not.toHaveBeenCalled();
      expect(mockChordproService.updateChordproSaveState).not.toHaveBeenCalled();
    });
  });

  describe("saveFileAs", () => {
    it("should adopt the new target so the next save writes straight through it", async () => {
      const fileTarget = FileTargetUtil.fromNative("content://songs/2", "song.cho");
      mockChordproService.getChordproContent.mockReturnValue("{title: Song}");
      mockWebRepository.saveFileAs.mockResolvedValue({ outcome: "saved", fileTarget });

      const isActionPerformed = await service.saveFileAs();

      expect(isActionPerformed).toBe(true);
      expect(mockAppContextService.setFile).toHaveBeenCalledWith(fileTarget, "{title: Song}");
    });

    // A download reached the disk but left nothing to write through, so the
    // document counts as saved while the target stays as it was.
    it("should keep the current target when the save produced no writable file", async () => {
      mockWebRepository.saveFileAs.mockResolvedValue({ outcome: "saved", fileTarget: null });

      const isActionPerformed = await service.saveFileAs();

      expect(isActionPerformed).toBe(true);
      expect(mockAppContextService.setFile).not.toHaveBeenCalled();
      expect(mockChordproService.updateChordproSaveState).toHaveBeenCalled();
    });
  });
});

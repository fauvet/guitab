import { TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { ConfirmService } from "../confirm/confirm.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import { FileUtil } from "../../utils/file.util";

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
  let mockCachedFilesService: { saveFile: ReturnType<typeof vi.fn> };
  let mockConfirmService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockChordproService = {
      undoContent: vi.fn(),
      redoContent: vi.fn(),
      hasUnsavedChanges: vi.fn().mockReturnValue(false),
      getChordproContent: vi.fn().mockReturnValue(""),
      updateChordproSaveState: vi.fn(),
      getChordproContent$: vi.fn().mockReturnValue(EMPTY),
    };

    const mockAppContextService = {
      getFileHandleWithContent$: vi.fn().mockReturnValue(EMPTY),
      getFileHandleWithContent: vi.fn().mockReturnValue(null),
      setEditing: vi.fn(),
      setFileHandle: vi.fn().mockResolvedValue(undefined),
    };

    mockCachedFilesService = {
      saveFile: vi.fn().mockResolvedValue(undefined),
    };

    mockConfirmService = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: ConfirmService, useValue: mockConfirmService },
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

  describe("getKeyboardFileActionOutcome$", () => {
    const press = (key: string, modifiers: KeyboardEventInit = {}): void => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, ...modifiers }));
    };

    it("should emit a saved outcome once a keyboard-triggered save resolves", async () => {
      vi.spyOn(service, "saveFile").mockResolvedValue(true);
      const outcomes: unknown[] = [];
      service.getKeyboardFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");

      await vi.waitFor(() =>
        expect(outcomes).toContainEqual({ type: "saved", fileName: ChordproUtil.buildFileName("") }),
      );
    });

    it("should not emit a saved outcome when the save was cancelled by the user", async () => {
      vi.spyOn(service, "saveFile").mockResolvedValue(false);
      const outcomes: unknown[] = [];
      service.getKeyboardFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");
      await Promise.resolve();
      await Promise.resolve();

      expect(outcomes).toEqual([]);
    });

    it("should emit an error outcome when a keyboard-triggered action throws", async () => {
      const error = new Error("Could not save.");
      vi.spyOn(service, "saveFile").mockRejectedValue(error);
      const outcomes: unknown[] = [];
      service.getKeyboardFileActionOutcome$().subscribe((outcome) => outcomes.push(outcome));

      press("s");

      await vi.waitFor(() => expect(outcomes).toContainEqual({ type: "error", error }));
    });
  });

  describe("newFile", () => {
    beforeEach(() => {
      vi.spyOn(FileUtil, "loadEmptyFile").mockResolvedValue(new File([""], "empty.cho"));
    });

    it("proceeds without asking when there are no unsaved changes", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(false);

      const result = await service.newFile();

      expect(mockConfirmService.confirm).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("asks for confirmation when there are unsaved changes, and proceeds once confirmed", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      mockConfirmService.confirm.mockResolvedValue(true);

      const result = await service.newFile();

      expect(mockConfirmService.confirm).toHaveBeenCalledWith(
        "You have unsaved changes. Are you sure you want to discard them?",
        "Discard",
      );
      expect(result).toBe(true);
    });

    it("does nothing when the user declines to discard unsaved changes", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      mockConfirmService.confirm.mockResolvedValue(false);

      const result = await service.newFile();

      expect(result).toBe(false);
    });
  });

  describe("openFile", () => {
    afterEach(() => {
      delete (window as any).showOpenFilePicker;
    });

    it("does not open the picker when the user declines to discard unsaved changes", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      mockConfirmService.confirm.mockResolvedValue(false);
      const showOpenFilePicker = vi.fn();
      (window as any).showOpenFilePicker = showOpenFilePicker;

      const result = await service.openFile(new Event("click"));

      expect(result).toBe(false);
      expect(showOpenFilePicker).not.toHaveBeenCalled();
    });

    it("should return false without throwing when the user cancels the file picker", async () => {
      (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));

      const result = await service.openFile(new Event("click"));

      expect(result).toBe(false);
    });

    it("should throw a clear Error when the file picker fails for a reason other than cancellation", async () => {
      (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(new Error("disk error"));

      await expect(service.openFile(new Event("click"))).rejects.toThrow("Could not open the file picker.");
    });
  });

  describe("saveFile", () => {
    // FileSystemFileHandle does not exist as a global in the jsdom test
    // environment (same limitation noted in file.util.spec.ts), so only the
    // no-real-handle branch — the common case since the Firebase migration,
    // and the one that used to wrongly fall through to a disk dialog — can be
    // exercised directly here.
    it("saves straight to the active repository with no disk dialog when there is no real file handle", async () => {
      const showSaveFilePicker = vi.fn();
      (window as any).showSaveFilePicker = showSaveFilePicker;

      const result = await service.saveFile();

      expect(result).toBe(true);
      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("");
      expect(mockChordproService.updateChordproSaveState).toHaveBeenCalled();
      expect(showSaveFilePicker).not.toHaveBeenCalled();
      delete (window as any).showSaveFilePicker;
    });

    it("propagates a rejection from the active repository instead of swallowing it", async () => {
      const error = new Error('Could not save "song.cho" to your account.');
      mockCachedFilesService.saveFile.mockRejectedValueOnce(error);

      await expect(service.saveFile()).rejects.toThrow(error);
    });
  });

  describe("saveFileAs", () => {
    afterEach(() => {
      delete (window as any).showSaveFilePicker;
    });

    it("should return false without throwing when the user cancels the save dialog", async () => {
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));

      const result = await service.saveFileAs();

      expect(result).toBe(false);
    });

    it("should throw a clear Error when the save dialog fails for a reason other than cancellation", async () => {
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new Error("disk error"));

      await expect(service.saveFileAs()).rejects.toThrow("Could not open the save dialog.");
    });

    describe("download fallback (no showSaveFilePicker)", () => {
      it("downloads the file, then asks for confirmation that it landed", async () => {
        const downloadSpy = vi.spyOn(FileUtil, "downloadAsFile").mockImplementation(() => {});
        mockConfirmService.confirm.mockResolvedValue(true);

        const result = await service.saveFileAs();

        expect(downloadSpy).toHaveBeenCalled();
        expect(mockConfirmService.confirm).toHaveBeenCalledWith(
          "Please confirm that the file has been successfully downloaded.",
          "Yes, downloaded",
        );
        expect(mockChordproService.updateChordproSaveState).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it("returns false without updating the save state when the user says it did not download", async () => {
        vi.spyOn(FileUtil, "downloadAsFile").mockImplementation(() => {});
        mockConfirmService.confirm.mockResolvedValue(false);

        const result = await service.saveFileAs();

        expect(mockChordproService.updateChordproSaveState).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });
  });

  describe("canOpenFilePicker", () => {
    it("should return false when showOpenFilePicker is not available in window", () => {
      const original = (window as any).showOpenFilePicker;
      delete (window as any).showOpenFilePicker;
      expect(service.canOpenFilePicker()).toBe(false);
      if (original !== undefined) (window as any).showOpenFilePicker = original;
    });

    it("should return true when showOpenFilePicker is available in window", () => {
      (window as any).showOpenFilePicker = vi.fn();
      expect(service.canOpenFilePicker()).toBe(true);
      delete (window as any).showOpenFilePicker;
    });
  });
});

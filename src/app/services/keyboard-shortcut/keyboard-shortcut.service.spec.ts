import { TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { MatSnackBar } from "@angular/material/snack-bar";

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

    const mockCachedFilesService = {
      saveFile: vi.fn(),
    };

    const mockSnackBar = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: MatSnackBar, useValue: mockSnackBar },
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

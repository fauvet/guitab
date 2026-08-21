import { TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { FileUtil } from "../../utils/file.util";

describe("KeyboardShortcutService", () => {
  let service: KeyboardShortcutService;
  let mockChordproService: {
    undoContent: ReturnType<typeof vi.fn>;
    redoContent: ReturnType<typeof vi.fn>;
    saveNow: ReturnType<typeof vi.fn>;
    getChordproContent$: ReturnType<typeof vi.fn>;
  };
  let mockAppContextService: {
    getFileHandleWithContent$: ReturnType<typeof vi.fn>;
    getFileHandleWithContent: ReturnType<typeof vi.fn>;
    setEditing: ReturnType<typeof vi.fn>;
    setFileHandle: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockChordproService = {
      undoContent: vi.fn(),
      redoContent: vi.fn(),
      saveNow: vi.fn().mockResolvedValue(undefined),
      getChordproContent$: vi.fn().mockReturnValue(EMPTY),
    };

    mockAppContextService = {
      getFileHandleWithContent$: vi.fn().mockReturnValue(EMPTY),
      getFileHandleWithContent: vi.fn().mockReturnValue(null),
      setEditing: vi.fn(),
      setFileHandle: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AppContextService, useValue: mockAppContextService },
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

  describe("newFile", () => {
    beforeEach(() => {
      vi.spyOn(FileUtil, "loadEmptyFile").mockResolvedValue(new File([""], "empty.cho"));
    });

    it("flushes a save before loading the empty file", async () => {
      await service.newFile();

      expect(mockChordproService.saveNow).toHaveBeenCalledTimes(1);
      expect(mockAppContextService.setFileHandle).toHaveBeenCalledTimes(1);
      expect(mockAppContextService.setEditing).toHaveBeenCalledWith(true);
    });

    it("propagates a rejection from the flush instead of swallowing it", async () => {
      const error = new Error('Could not save "song.cho" to your account.');
      mockChordproService.saveNow.mockRejectedValueOnce(error);

      await expect(service.newFile()).rejects.toThrow(error);
      expect(mockAppContextService.setFileHandle).not.toHaveBeenCalled();
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
    // the lowercase letter left the Shift shortcut unreachable, silently:
    // nothing happened, and nothing said why.
    it("should redo on Ctrl+Shift+Z, which the browser reports as an uppercase Z", async () => {
      const redo = vi.spyOn(service, "redo").mockResolvedValue(undefined);

      press("Z", { shiftKey: true });

      await vi.waitFor(() => expect(redo).toHaveBeenCalled());
    });

    it("should create a new file on Ctrl+Alt+N", async () => {
      const newFile = vi.spyOn(service, "newFile").mockResolvedValue(undefined);

      press("n", { altKey: true });

      await vi.waitFor(() => expect(newFile).toHaveBeenCalled());
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

  describe("getKeyboardShortcutError$", () => {
    const press = (key: string, modifiers: KeyboardEventInit = {}): void => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, ...modifiers }));
    };

    it("should emit an error when a keyboard-triggered action throws", async () => {
      const error = new Error("Could not create a new file.");
      vi.spyOn(service, "newFile").mockRejectedValue(error);
      const errors: Error[] = [];
      service.getKeyboardShortcutError$().subscribe((emittedError) => errors.push(emittedError));

      press("n", { altKey: true });

      await vi.waitFor(() => expect(errors).toContainEqual(error));
    });
  });
});

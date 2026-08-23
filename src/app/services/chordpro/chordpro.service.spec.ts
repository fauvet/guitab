import { TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { ChordproService } from "./chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { CachedFilesService } from "../cached-files/cached-files.service";

// vi.hoisted() ensures these are accessible inside the vi.mock() factory,
// which is statically hoisted to the top of the file before any imports.
const { mockEditor } = vi.hoisted(() => {
  const undoManager = {
    hasUndo: vi.fn().mockReturnValue(false),
    hasRedo: vi.fn().mockReturnValue(false),
    undo: vi.fn(),
    redo: vi.fn(),
    reset: vi.fn(),
  };
  const editor = {
    container: { offsetWidth: 500 },
    session: { selection: { on: vi.fn() } },
    focus: vi.fn(),
    getValue: vi.fn().mockReturnValue(""),
    setValue: vi.fn(),
    clearSelection: vi.fn(),
    getCursorPosition: vi.fn().mockReturnValue({ row: 0, column: 0 }),
    moveCursorToPosition: vi.fn(),
    getSession: vi.fn(() => ({ getUndoManager: () => undoManager })),
    getSelectionRange: vi.fn().mockReturnValue({
      isEmpty: () => true,
      start: { row: 0, column: 0 },
      end: { row: 0, column: 0 },
    }),
  };
  return { mockEditor: editor };
});

vi.mock("chordproject-editor", () => ({
  Main: {
    init: vi.fn(),
    getEditor: () => mockEditor,
  },
}));

describe("ChordproService", () => {
  let service: ChordproService;
  let mockAppContextService: {
    getFileHandleWithContent$: ReturnType<typeof vi.fn>;
    getFileHandleWithContent: ReturnType<typeof vi.fn>;
    getFileId: ReturnType<typeof vi.fn>;
    setFileId: ReturnType<typeof vi.fn>;
  };
  let mockCachedFilesService: { saveFile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAppContextService = {
      getFileHandleWithContent$: vi.fn().mockReturnValue(EMPTY),
      getFileHandleWithContent: vi.fn().mockReturnValue(null),
      getFileId: vi.fn().mockReturnValue(null),
      setFileId: vi.fn(),
    };

    mockCachedFilesService = {
      saveFile: vi.fn().mockResolvedValue("generated-id"),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
      ],
    });
    service = TestBed.inject(ChordproService);

    // Reset body class between tests
    document.body.classList.remove("js-are-lyrics-hided");

    mockEditor.container.offsetWidth = 500;
    mockEditor.focus.mockClear();
  });

  afterEach(() => {
    document.body.classList.remove("js-are-lyrics-hided");
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initial state", () => {
    it("should have empty chordpro content", () => {
      expect(service.getChordproContent()).toBe("");
    });

    it("should have lyrics displayed by default", () => {
      expect(service.areLyricsDisplayed()).toBe(true);
    });

    it("should have no unsaved changes initially", () => {
      expect(service.hasUnsavedChanges()).toBe(false);
    });
  });

  describe("parseTitle", () => {
    it("should parse a {title: ...} directive", () => {
      expect(service.parseTitle("{title: Hotel California}")).toBe("Hotel California");
    });

    it("should parse the short {t: ...} form", () => {
      expect(service.parseTitle("{t: Wonderwall}")).toBe("Wonderwall");
    });

    it("should trim whitespace around the title value", () => {
      expect(service.parseTitle("{title:  My Song  }")).toBe("My Song");
    });

    it("should be case-insensitive for the directive keyword", () => {
      expect(service.parseTitle("{TITLE: My Song}")).toBe("My Song");
    });

    it("should return null when no title directive is found", () => {
      expect(service.parseTitle("{artist: Eagles}")).toBeNull();
    });

    it("should return null for empty content", () => {
      expect(service.parseTitle("")).toBeNull();
    });
  });

  describe("setChordproContent", () => {
    it("should update the content", () => {
      service.setChordproContent("new content");
      expect(service.getChordproContent()).toBe("new content");
    });

    it("should be a no-op when the same content is set again", () => {
      service.setChordproContent("content");
      const values: string[] = [];
      service.getChordproContent$().subscribe((v) => values.push(v));
      service.setChordproContent("content"); // same
      expect(values).toEqual(["content"]); // only one emission
    });

    it("should mark hasUnsavedChanges as true after setting new content", () => {
      service.setChordproContent("modified content");
      expect(service.hasUnsavedChanges()).toBe(true);
    });
  });

  describe("setLyricsDisplayed", () => {
    it("should add 'js-are-lyrics-hided' class to body when set to false", () => {
      service.setLyricsDisplayed(false);
      expect(document.body.classList.contains("js-are-lyrics-hided")).toBe(true);
    });

    it("should remove 'js-are-lyrics-hided' class from body when set to true", () => {
      service.setLyricsDisplayed(false);
      service.setLyricsDisplayed(true);
      expect(document.body.classList.contains("js-are-lyrics-hided")).toBe(false);
    });

    it("should be a no-op when setting the same value as current", () => {
      // areLyricsDisplayed is initially true; setting true again should not re-emit
      const values: boolean[] = [];
      service.getAreLyricsDisplayed$().subscribe((v) => values.push(v));
      service.setLyricsDisplayed(true); // same as initial
      expect(values).toEqual([true]); // only the initial emission
    });

    it("should update areLyricsDisplayed()", () => {
      service.setLyricsDisplayed(false);
      expect(service.areLyricsDisplayed()).toBe(false);
    });
  });

  describe("hasUnsavedChanges", () => {
    it("should return false initially", () => {
      expect(service.hasUnsavedChanges()).toBe(false);
    });

    it("should return true after content is modified", () => {
      service.setChordproContent("something new");
      expect(service.hasUnsavedChanges()).toBe(true);
    });

    it("should return false after updateChordproSaveState is called with current content", () => {
      service.setChordproContent("something new");
      service.updateChordproSaveState();
      expect(service.hasUnsavedChanges()).toBe(false);
    });
  });

  describe("saveNow", () => {
    it("does nothing when there are no unsaved changes", async () => {
      await service.saveNow();
      expect(mockCachedFilesService.saveFile).not.toHaveBeenCalled();
    });

    it("saves the current content and syncs the save state when there are unsaved changes", async () => {
      service.setChordproContent("something new");

      await service.saveNow();

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("something new", null);
      expect(service.hasUnsavedChanges()).toBe(false);
    });

    it("propagates a rejection instead of swallowing it", async () => {
      const error = new Error('Could not save "song.cho" to your account.');
      mockCachedFilesService.saveFile.mockRejectedValueOnce(error);
      service.setChordproContent("something new");

      await expect(service.saveNow()).rejects.toThrow(error);
    });

    it("assigns the id returned by the first save and reuses it on the second, instead of asking for a new one each time", async () => {
      mockCachedFilesService.saveFile.mockResolvedValueOnce("new-id");
      service.setChordproContent("first version");
      await service.saveNow();

      expect(mockAppContextService.setFileId).toHaveBeenCalledWith("new-id");

      mockAppContextService.getFileId.mockReturnValue("new-id");
      mockCachedFilesService.saveFile.mockClear();
      service.setChordproContent("second version");
      await service.saveNow();

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("second version", "new-id");
    });
  });

  describe("autosave", () => {
    it("persists content to the active repository once the player stops typing", async () => {
      service.setChordproContent("humming along");

      await vi.waitFor(() => expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("humming along", null), {
        timeout: 3000,
      });
    });

    it("logs and exposes the error, instead of throwing, when the debounced save fails", async () => {
      const error = new Error('Could not save "song.cho" to your account.');
      mockCachedFilesService.saveFile.mockRejectedValueOnce(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const errors: (Error | null)[] = [];
      service.getAutosaveError$().subscribe((autosaveError) => errors.push(autosaveError));

      service.setChordproContent("humming along");

      await vi.waitFor(() => expect(errors).toContainEqual(error), { timeout: 3000 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("requestEditorFocus", () => {
    it("focuses the editor when its container is rendered at a visible width", () => {
      mockEditor.container.offsetWidth = 500;

      service.requestEditorFocus();

      expect(mockEditor.focus).toHaveBeenCalled();
    });

    it("does not focus the editor when its container is squeezed away by the mobile preview layout", () => {
      mockEditor.container.offsetWidth = 1;

      service.requestEditorFocus();

      expect(mockEditor.focus).not.toHaveBeenCalled();
    });
  });
});

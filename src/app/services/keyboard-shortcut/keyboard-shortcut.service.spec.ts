import { TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppContextService } from "../app-context/app-context.service";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { ToastrService } from "ngx-toastr";

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

    const mockToastrService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: ToastrService, useValue: mockToastrService },
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

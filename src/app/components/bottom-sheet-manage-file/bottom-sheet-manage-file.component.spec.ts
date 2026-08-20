import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { HttpClient } from "@angular/common/http";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { of, throwError, Subject } from "rxjs";
import { BottomSheetManageFileComponent } from "./bottom-sheet-manage-file.component";
import { CachedFilesService } from "../../services/cached-files/cached-files.service";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { NotificationService } from "../../services/notification/notification.service";
import CachedFile from "../../types/cached-file.type";

describe("BottomSheetManageFileComponent", () => {
  let component: BottomSheetManageFileComponent;
  let fixture: ComponentFixture<BottomSheetManageFileComponent>;
  let cachedFiles$: Subject<CachedFile[]>;
  let syncError$: Subject<Error | null>;
  let mockBottomSheetRef: { dismiss: ReturnType<typeof vi.fn>; afterDismissed: ReturnType<typeof vi.fn> };
  let mockKeyboardShortcutService: {
    newFile: ReturnType<typeof vi.fn>;
    openFile: ReturnType<typeof vi.fn>;
    saveFile: ReturnType<typeof vi.fn>;
    saveFileAs: ReturnType<typeof vi.fn>;
    canOpenFilePicker: ReturnType<typeof vi.fn>;
  };
  let mockCachedFilesService: {
    getCachedFiles$: ReturnType<typeof vi.fn>;
    getSyncError$: ReturnType<typeof vi.fn>;
    saveFile: ReturnType<typeof vi.fn>;
  };
  let mockAppContextService: {
    getFileWithContent$: ReturnType<typeof vi.fn>;
    setFile: ReturnType<typeof vi.fn>;
    setEditing: ReturnType<typeof vi.fn>;
  };
  let mockChordproService: {
    requestEditorFocus: ReturnType<typeof vi.fn>;
    parseTitle: ReturnType<typeof vi.fn>;
    getChordproContent: ReturnType<typeof vi.fn>;
  };
  let mockNotificationService: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cachedFiles$ = new Subject<CachedFile[]>();
    syncError$ = new Subject<Error | null>();

    mockBottomSheetRef = { dismiss: vi.fn(), afterDismissed: vi.fn().mockReturnValue({ subscribe: () => {} }) };

    mockKeyboardShortcutService = {
      newFile: vi.fn().mockResolvedValue(true),
      openFile: vi.fn().mockResolvedValue(true),
      saveFile: vi.fn().mockResolvedValue(true),
      saveFileAs: vi.fn().mockResolvedValue(true),
      canOpenFilePicker: vi.fn().mockReturnValue(true),
    };

    mockCachedFilesService = {
      getCachedFiles$: vi.fn().mockReturnValue(cachedFiles$.asObservable()),
      getSyncError$: vi.fn().mockReturnValue(syncError$.asObservable()),
      saveFile: vi.fn().mockResolvedValue(undefined),
    };

    mockAppContextService = {
      getFileWithContent$: vi.fn().mockReturnValue(of(null)),
      setFile: vi.fn().mockResolvedValue(undefined),
      setEditing: vi.fn(),
    };

    mockChordproService = {
      requestEditorFocus: vi.fn(),
      parseTitle: vi.fn().mockReturnValue(null),
      getChordproContent: vi.fn().mockReturnValue(""),
    };

    mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
    mockHttpClient = { get: vi.fn().mockReturnValue(of({})) };

    await TestBed.configureTestingModule({
      imports: [BottomSheetManageFileComponent, NoopAnimationsModule],
      providers: [
        { provide: MatBottomSheetRef, useValue: mockBottomSheetRef },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: KeyboardShortcutService, useValue: mockKeyboardShortcutService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: ChordproService, useValue: mockChordproService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetManageFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("cached files sync error", () => {
    it("shows a notification and logs when the cached files sync fails, instead of failing silently", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const syncError = new Error("permission-denied");

      syncError$.next(syncError);

      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(syncError);
    });

    it("does not notify while the sync stays healthy", () => {
      syncError$.next(null);

      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });
  });

  it("stops reacting to cachedFiles$ once destroyed, so the subscription does not leak", () => {
    const cachedFile: CachedFile = { name: "Song", chordproContent: "", date: new Date() };
    cachedFiles$.next([cachedFile]);
    expect(component.coveredCachedFiles$.getValue().length).toBe(1);

    component.ngOnDestroy();
    cachedFiles$.next([cachedFile, cachedFile]);

    expect(component.coveredCachedFiles$.getValue().length).toBe(1);
  });

  describe("album cover lookup", () => {
    it("logs rather than failing silently when the lookup fails, keeping the default cover", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockChordproService.parseTitle.mockReturnValue("Hotel California");
      mockHttpClient.get.mockReturnValue(throwError(() => new Error("network error")));

      cachedFiles$.next([{ name: "Song", chordproContent: "", date: new Date() }]);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });
  });

  describe("onButtonNewFileClicked", () => {
    it("dismisses the sheet once a new file has been created", async () => {
      await component.onButtonNewFileClicked();

      expect(mockBottomSheetRef.dismiss).toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error("Could not load asset.");
      mockKeyboardShortcutService.newFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonNewFileClicked();

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(mockBottomSheetRef.dismiss).not.toHaveBeenCalled();
    });
  });

  describe("onButtonOpenFileClicked", () => {
    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error("Could not open the file picker.");
      mockKeyboardShortcutService.openFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonOpenFileClicked(new Event("click"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("onButtonSaveFileClicked", () => {
    beforeEach(() => {
      component.isSaveExistingFileEnabled$.next(true);
    });

    it("shows a success notification and dismisses once saved", async () => {
      await component.onButtonSaveFileClicked();

      expect(mockNotificationService.showSuccess).toHaveBeenCalledTimes(1);
      expect(mockBottomSheetRef.dismiss).toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error('Could not save "song.cho".');
      mockKeyboardShortcutService.saveFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonSaveFileClicked();

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.showSuccess).not.toHaveBeenCalled();
    });
  });

  describe("onButtonSaveFileAsClicked", () => {
    it("shows a success notification and dismisses once saved", async () => {
      await component.onButtonSaveFileAsClicked();

      expect(mockNotificationService.showSuccess).toHaveBeenCalledTimes(1);
      expect(mockBottomSheetRef.dismiss).toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error("Could not open the save dialog.");
      mockKeyboardShortcutService.saveFileAs.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonSaveFileAsClicked();

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("onButtonCachedFileClicked", () => {
    const cachedFile: CachedFile = { name: "Song", chordproContent: "{title: Song}", date: new Date() };

    it("dismisses the sheet once the cached file has been opened", async () => {
      await component.onButtonCachedFileClicked(cachedFile);

      expect(mockBottomSheetRef.dismiss).toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when the sync fails", async () => {
      const error = new Error('Could not save "Song" to your account.');
      mockCachedFilesService.saveFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonCachedFileClicked(cachedFile);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(mockBottomSheetRef.dismiss).not.toHaveBeenCalled();
    });
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef } from "@angular/material/dialog";
import { HttpClient } from "@angular/common/http";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject, of } from "rxjs";
import { DialogFileGalleryComponent } from "./dialog-file-gallery.component";
import { CachedFilesService } from "../../services/cached-files/cached-files.service";
import { AppContextService } from "../../services/app-context/app-context.service";
import { NotificationService } from "../../services/notification/notification.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { ConfirmService } from "../../services/confirm/confirm.service";
import { FileUtil } from "../../utils/file.util";
import CachedFile from "../../types/cached-file.type";

vi.mock("fflate", () => ({
  zipSync: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  strToU8: vi.fn((value: string) => new TextEncoder().encode(value)),
}));

describe("DialogFileGalleryComponent", () => {
  let component: DialogFileGalleryComponent;
  let fixture: ComponentFixture<DialogFileGalleryComponent>;
  let cachedFiles$: BehaviorSubject<CachedFile[]>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockCachedFilesService: {
    getCachedFiles$: ReturnType<typeof vi.fn>;
    saveFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };
  let mockAppContextService: { setFileHandle: ReturnType<typeof vi.fn>; setEditing: ReturnType<typeof vi.fn> };
  let mockNotificationService: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let mockConfirmService: { confirm: ReturnType<typeof vi.fn> };

  const song: CachedFile = { name: "Song", chordproContent: "{title: Song}", date: new Date() };

  beforeEach(async () => {
    cachedFiles$ = new BehaviorSubject<CachedFile[]>([]);
    mockDialogRef = { close: vi.fn() };

    mockCachedFilesService = {
      getCachedFiles$: vi.fn().mockReturnValue(cachedFiles$.asObservable()),
      saveFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    mockAppContextService = {
      setFileHandle: vi.fn().mockResolvedValue(undefined),
      setEditing: vi.fn(),
    };

    vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(false);

    mockNotificationService = { showSuccess: vi.fn(), showError: vi.fn() };
    mockConfirmService = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DialogFileGalleryComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: CachedFilesService, useValue: mockCachedFilesService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfirmService, useValue: mockConfirmService },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of({})) } },
        { provide: ChordproService, useValue: { parseTitle: vi.fn().mockReturnValue(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogFileGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("onListItemOpenClicked", () => {
    it("opens the song and closes the dialog", async () => {
      await component.onListItemOpenClicked(song);

      expect(mockAppContextService.setFileHandle).toHaveBeenCalledTimes(1);
      expect(mockAppContextService.setEditing).toHaveBeenCalledWith(false);
      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith(song.chordproContent, song.name);
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error("Could not save.");
      mockCachedFilesService.saveFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onListItemOpenClicked(song);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe("onButtonDownloadClicked", () => {
    it("downloads the song content", () => {
      const downloadSpy = vi.spyOn(FileUtil, "downloadAsFile").mockImplementation(() => {});
      const event = new Event("click");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      component.onButtonDownloadClicked(song, event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(downloadSpy).toHaveBeenCalledWith(song.chordproContent, "Song.cho");
    });

    it("shows a notification and logs, instead of failing silently, when it throws", () => {
      const error = new Error("blob failure");
      vi.spyOn(FileUtil, "downloadAsFile").mockImplementation(() => {
        throw error;
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      component.onButtonDownloadClicked(song, new Event("click"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("onButtonDeleteClicked", () => {
    it("asks for confirmation through ConfirmService, then deletes the song once confirmed", async () => {
      mockConfirmService.confirm.mockResolvedValue(true);

      await component.onButtonDeleteClicked(song, new Event("click"));

      expect(mockConfirmService.confirm).toHaveBeenCalledWith(
        `Delete "${song.name}"? This cannot be undone.`,
        "Delete",
      );
      expect(mockCachedFilesService.deleteFile).toHaveBeenCalledWith(song.name);
      expect(mockNotificationService.showSuccess).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the user declines the confirmation", async () => {
      mockConfirmService.confirm.mockResolvedValue(false);

      await component.onButtonDeleteClicked(song, new Event("click"));

      expect(mockCachedFilesService.deleteFile).not.toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      mockConfirmService.confirm.mockResolvedValue(true);
      const error = new Error("Could not delete.");
      mockCachedFilesService.deleteFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonDeleteClicked(song, new Event("click"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("onButtonImportClicked", () => {
    afterEach(() => {
      delete (window as any).showOpenFilePicker;
    });

    it("imports every selected file through the native picker", async () => {
      vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(true);
      const fileHandle = { name: "imported.cho" } as unknown as FileSystemFileHandle;
      (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([fileHandle, fileHandle]);
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Imported}");

      await component.onButtonImportClicked(new Event("change"));

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledTimes(2);
      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("{title: Imported}", "imported");
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith("2 file(s) imported.");
    });

    it("imports every selected file through the input fallback", async () => {
      vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(false);
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Imported}");
      const input = document.createElement("input");
      input.type = "file";
      const file = new File(["content"], "imported.cho");
      Object.defineProperty(input, "files", { value: [file] });
      const event = { target: input } as unknown as Event;

      await component.onButtonImportClicked(event);

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledTimes(1);
      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("{title: Imported}", "imported");
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith("1 file(s) imported.");
    });

    it("uses each file's own name as the fallback, so two untitled files stay distinct instead of colliding", async () => {
      vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(false);
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("no directives here");
      const input = document.createElement("input");
      input.type = "file";
      const fileOne = new File(["content"], "song-one.cho");
      const fileTwo = new File(["content"], "song-two.chopro");
      Object.defineProperty(input, "files", { value: [fileOne, fileTwo] });
      const event = { target: input } as unknown as Event;

      await component.onButtonImportClicked(event);

      expect(mockCachedFilesService.saveFile).toHaveBeenNthCalledWith(1, "no directives here", "song-one");
      expect(mockCachedFilesService.saveFile).toHaveBeenNthCalledWith(2, "no directives here", "song-two");
    });

    it("returns quietly without notifying when the user cancels the picker", async () => {
      vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(true);
      (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));

      await component.onButtonImportClicked(new Event("change"));

      expect(mockCachedFilesService.saveFile).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).not.toHaveBeenCalled();
      expect(mockNotificationService.showSuccess).not.toHaveBeenCalled();
    });

    it("shows a notification and logs, instead of failing silently, when the picker fails for another reason", async () => {
      vi.spyOn(FileUtil, "canOpenFilePicker").mockReturnValue(true);
      const error = new Error("disk error");
      (window as any).showOpenFilePicker = vi.fn().mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonImportClicked(new Event("change"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("onButtonDownloadAllClicked", () => {
    it("does nothing when the library is empty", async () => {
      const downloadBlobSpy = vi.spyOn(FileUtil, "downloadBlob").mockImplementation(() => {});
      cachedFiles$.next([]);

      await component.onButtonDownloadAllClicked();

      expect(downloadBlobSpy).not.toHaveBeenCalled();
    });

    it("zips every song and downloads a single archive", async () => {
      const downloadBlobSpy = vi.spyOn(FileUtil, "downloadBlob").mockImplementation(() => {});
      const otherSong: CachedFile = { name: "Other", chordproContent: "{title: Other}", date: new Date() };
      cachedFiles$.next([song, otherSong]);

      await component.onButtonDownloadAllClicked();

      expect(downloadBlobSpy).toHaveBeenCalledWith(expect.any(Blob), "songs.zip");
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      vi.spyOn(FileUtil, "downloadBlob").mockImplementation(() => {
        throw new Error("blob failure");
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      cachedFiles$.next([song]);

      await component.onButtonDownloadAllClicked();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("Download all button", () => {
    function findDownloadAllButton(): HTMLButtonElement | null {
      return Array.from(fixture.nativeElement.querySelectorAll("button")).find((button) =>
        (button as HTMLButtonElement).textContent?.includes("Download all"),
      ) as HTMLButtonElement | null;
    }

    it("is disabled when there are no songs", () => {
      cachedFiles$.next([]);
      fixture.detectChanges();

      expect(findDownloadAllButton()?.disabled).toBe(true);
    });

    it("is enabled once there are songs", () => {
      cachedFiles$.next([song]);
      fixture.detectChanges();

      expect(findDownloadAllButton()?.disabled).toBe(false);
    });
  });
});

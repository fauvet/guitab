import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatIconTestingModule } from "@angular/material/icon/testing";
import { MatDialog } from "@angular/material/dialog";
import { EMPTY } from "rxjs";
import { HeaderActionsBarComponent } from "./header-actions-bar.component";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { NotificationService } from "../../services/notification/notification.service";
import { DialogFileGalleryComponent } from "../dialog-file-gallery/dialog-file-gallery.component";

describe("HeaderActionsBarComponent", () => {
  let component: HeaderActionsBarComponent;
  let fixture: ComponentFixture<HeaderActionsBarComponent>;
  let mockChordproService: {
    getHasEditorUndo$: ReturnType<typeof vi.fn>;
    getHasEditorRedo$: ReturnType<typeof vi.fn>;
    requestEditorFocus: ReturnType<typeof vi.fn>;
  };
  let mockKeyboardShortcutService: { newFile: ReturnType<typeof vi.fn> };
  let mockNotificationService: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockChordproService = {
      getHasEditorUndo$: vi.fn().mockReturnValue(EMPTY),
      getHasEditorRedo$: vi.fn().mockReturnValue(EMPTY),
      requestEditorFocus: vi.fn(),
    };
    mockKeyboardShortcutService = { newFile: vi.fn().mockResolvedValue(undefined) };
    mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
    mockDialog = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HeaderActionsBarComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: AppContextService, useValue: { getIsEditing$: vi.fn().mockReturnValue(EMPTY) } },
        { provide: ChordproService, useValue: mockChordproService },
        { provide: KeyboardShortcutService, useValue: mockKeyboardShortcutService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderActionsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("onButtonNewFileClicked", () => {
    it("creates a new file and returns focus to the editor", async () => {
      await component.onButtonNewFileClicked();

      expect(mockKeyboardShortcutService.newFile).toHaveBeenCalledTimes(1);
      expect(mockChordproService.requestEditorFocus).toHaveBeenCalledTimes(1);
    });

    it("shows a notification and logs, instead of failing silently, when it throws", async () => {
      const error = new Error('Could not save "song.cho" to your account.');
      mockKeyboardShortcutService.newFile.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await component.onButtonNewFileClicked();

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledWith("Could not create a new file.");
    });
  });

  describe("onButtonSongLibraryClicked", () => {
    it("opens the song library dialog", () => {
      component.onButtonSongLibraryClicked();

      expect(mockDialog.open).toHaveBeenCalledWith(DialogFileGalleryComponent, {
        height: "95%",
        width: "95%",
        panelClass: "dialog-panel-fill",
      });
    });
  });
});

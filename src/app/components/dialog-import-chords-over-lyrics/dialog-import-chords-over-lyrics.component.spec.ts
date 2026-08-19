import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogImportChordsOverLyricsComponent } from "./dialog-import-chords-over-lyrics.component";
import { NotificationService } from "../../services/notification/notification.service";

describe("DialogImportChordsOverLyricsComponent", () => {
  let component: DialogImportChordsOverLyricsComponent;
  let fixture: ComponentFixture<DialogImportChordsOverLyricsComponent>;
  const writeText = vi.fn();
  const mockNotificationService = { showError: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);

    // Define the property rather than replacing navigator: Angular Forms reads
    // navigator.userAgent, which lives on the prototype and does not survive a
    // spread, and the failure surfaces far away in DefaultValueAccessor.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [DialogImportChordsOverLyricsComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogImportChordsOverLyricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialise with empty input and preview", () => {
    expect(component.input$.getValue()).toBe("");
    expect(component.preview$.getValue()).toBe("");
  });

  it("should update input BehaviorSubject on setInput()", () => {
    component.setInput("Am\nHello");
    expect(component.input$.getValue()).toBe("Am\nHello");
  });

  it("should not update input if the value is the same", () => {
    // TODO: Implement this test case
  });

  it("onInsertClicked() should close the dialog with the converted preview text", () => {
    // TODO: Implement this test case
  });

  it("onInsertClicked() should not close the dialog when preview is empty", () => {
    // TODO: Implement this test case
  });

  describe("onCopyClicked", () => {
    it("should copy the preview to the clipboard", async () => {
      component.setInput("Am\nHello");
      await vi.waitFor(() => expect(component.preview$.getValue()).not.toBe(""));

      component.onCopyClicked();

      expect(writeText).toHaveBeenCalledWith(component.preview$.getValue());
    });

    it("should not write an empty preview to the clipboard", () => {
      component.onCopyClicked();

      expect(writeText).not.toHaveBeenCalled();
    });

    it("should show a notification and log, instead of failing silently, when the clipboard write is refused", async () => {
      const error = new Error("permission denied");
      writeText.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      component.setInput("Am\nHello");
      await vi.waitFor(() => expect(component.preview$.getValue()).not.toBe(""));

      component.onCopyClicked();
      await vi.waitFor(() => expect(mockNotificationService.showError).toHaveBeenCalledTimes(1));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogSoloTabEditorComponent } from "./dialog-solo-tab-editor.component";
import { NotificationService } from "../../services/notification/notification.service";

describe("DialogSoloTabEditorComponent", () => {
  let component: DialogSoloTabEditorComponent;
  let fixture: ComponentFixture<DialogSoloTabEditorComponent>;
  const dialogRef = { close: vi.fn() };
  const writeText = vi.fn();
  const mockNotificationService = { showError: vi.fn() };

  beforeEach(async () => {
    // vi.fn() call history survives restoreAllMocks, so shared mocks have to be
    // cleared explicitly or an assertion about "not called" passes or fails
    // depending on which tests ran before it.
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
      imports: [DialogSoloTabEditorComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogSoloTabEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("converting the input", () => {
    it("should build the tablature preview from the typed input", () => {
      component.onSoloTabChanged("0 2 2\n1 3 3");

      expect(component.generatedSoloTab$.getValue().split("\n")).toEqual(["01", "23", "23"]);
    });

    it("should offer each distinct input line as a reusable suggestion", () => {
      component.onSoloTabChanged("0 2 2\n0 2 2\n1 3 3");

      expect(component.handyRows$.getValue().map((handyRow) => handyRow.input)).toEqual(["0 2 2", "1 3 3"]);
    });

    // The textarea and the preview write to each other through the same
    // subject. Without this guard they would ping-pong on every keystroke.
    it("should ignore an input identical to the current one", () => {
      const initial = component.soloTab$.getValue();
      const emitted: string[] = [];
      component.soloTab$.subscribe((soloTab) => emitted.push(soloTab));

      component.setSoloTab(initial);

      expect(emitted).toEqual([initial]);
    });

    // Neither Angular's fakeAsync nor vi's fake timers work here: fakeAsync
    // needs a ProxyZone this runner does not install, and zone.js has already
    // patched setTimeout by the time vi swaps it, so RxJS keeps scheduling on
    // the real one. vi.waitFor polls the condition instead of sleeping for a
    // duration, which is what the testing rules ask for anyway.
    it("should recompute the preview only after the user stops typing", async () => {
      component.setSoloTab("5 7 7");

      expect(component.generatedSoloTab$.getValue()).not.toContain("5");

      await vi.waitFor(() => expect(component.generatedSoloTab$.getValue().split("\n")[0]).toBe("5"));
    });
  });

  describe("inserting a suggestion", () => {
    it("should insert the suggestion at the caret, followed by a blank line", () => {
      component.setSoloTab("0 2 2\n");
      fixture.detectChanges();
      const editor = component.editorRef.nativeElement;
      editor.value = "0 2 2\n";
      editor.selectionStart = editor.selectionEnd = 6;

      component.onButtonHandyRowClicked({ input: "3 5 5", output: ["3", "5", "5"] });

      expect(component.soloTab$.getValue()).toBe("0 2 2\n3 5 5\n\n");
    });

    it("should insert at the caret rather than appending, when the caret is mid-text", () => {
      component.setSoloTab("0 2 2\n1 3 3\n");
      fixture.detectChanges();
      const editor = component.editorRef.nativeElement;
      editor.value = "0 2 2\n1 3 3\n";
      editor.selectionStart = editor.selectionEnd = 6;

      component.onButtonHandyRowClicked({ input: "3 5 5", output: ["3", "5", "5"] });

      expect(component.soloTab$.getValue()).toBe("0 2 2\n3 5 5\n\n1 3 3\n");
    });

    it("should return focus to the editor so typing continues where it left off", () => {
      component.setSoloTab("0 2 2\n");
      fixture.detectChanges();
      const editor = component.editorRef.nativeElement;
      const focus = vi.spyOn(editor, "focus");

      component.onButtonHandyRowClicked({ input: "3 5 5", output: ["3", "5", "5"] });

      expect(focus).toHaveBeenCalled();
    });
  });

  describe("humming a solo", () => {
    it("should keep the microphone closed until it is asked for", () => {
      expect(component.isHumming$.getValue()).toBe(false);
      expect(fixture.nativeElement.querySelector("app-pitch-monitor")).toBeNull();
    });

    it("should show the monitor once asked", () => {
      component.onToggleHummingClicked();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector("app-pitch-monitor")).not.toBeNull();
    });

    it("should take the monitor away again, closing the microphone with it", () => {
      component.onToggleHummingClicked();
      component.onToggleHummingClicked();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector("app-pitch-monitor")).toBeNull();
    });

    // A player builds a solo in passes. Replacing the editor would make the
    // second pass cost the first one.
    it("should append a transcription rather than replacing what is there", () => {
      component.setSoloTab("0 2 2\n");

      component.onTranscribed("12 - - - - -");

      expect(component.soloTab$.getValue()).toBe("0 2 2\n12 - - - - -\n");
    });

    it("should start a new line when the editor does not end on one", () => {
      component.setSoloTab("0 2 2");

      component.onTranscribed("12 - - - - -");

      expect(component.soloTab$.getValue()).toBe("0 2 2\n12 - - - - -\n");
    });

    it("should leave the editor alone when nothing was transcribed", () => {
      component.setSoloTab("0 2 2\n");

      component.onTranscribed("");

      expect(component.soloTab$.getValue()).toBe("0 2 2\n");
    });
  });

  describe("handing the tablature back", () => {
    it("should close the dialog with the generated tablature", () => {
      component.onSoloTabChanged("0 2 2");

      component.onInsertClicked();

      expect(dialogRef.close).toHaveBeenCalledWith(component.generatedSoloTab$.getValue());
    });

    // Closing with an empty string would insert nothing into the song while
    // still looking like a successful insert.
    it("should not close the dialog when there is nothing to insert", () => {
      component.setGeneratedSoloTab("");

      component.onInsertClicked();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it("should copy the generated tablature to the clipboard", () => {
      component.onSoloTabChanged("0 2 2");

      component.onCopyClicked();

      expect(writeText).toHaveBeenCalledWith(component.generatedSoloTab$.getValue());
    });

    it("should not write an empty tablature to the clipboard", () => {
      component.setGeneratedSoloTab("");

      component.onCopyClicked();

      expect(writeText).not.toHaveBeenCalled();
    });

    it("should show a notification and log, instead of failing silently, when the clipboard write is refused", async () => {
      const error = new Error("permission denied");
      writeText.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      component.onSoloTabChanged("0 2 2");

      component.onCopyClicked();
      await vi.waitFor(() => expect(mockNotificationService.showError).toHaveBeenCalledTimes(1));

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { MatDialog } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Subject, of } from "rxjs";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { DialogImportChordsOverLyricsComponent } from "../dialog-import-chords-over-lyrics/dialog-import-chords-over-lyrics.component";
import { DialogSoloTabEditorComponent } from "../dialog-solo-tab-editor/dialog-solo-tab-editor.component";
import { BottomSheetToolsComponent } from "./bottom-sheet-tools.component";

describe("BottomSheetToolsComponent", () => {
  let component: BottomSheetToolsComponent;
  let fixture: ComponentFixture<BottomSheetToolsComponent>;
  let afterDismissed: Subject<void>;
  let dialogResult: unknown;

  const bottomSheetRef = {
    dismiss: vi.fn(),
    afterDismissed: vi.fn(),
  };
  const dialog = { open: vi.fn() };
  const chordproService = {
    requestEditorFocus: vi.fn(),
    insertChordproContentAtCaret: vi.fn(),
  };

  const createComponent = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetToolsComponent, NoopAnimationsModule],
      providers: [
        { provide: MatBottomSheetRef, useValue: bottomSheetRef },
        { provide: MatDialog, useValue: dialog },
        { provide: ChordproService, useValue: chordproService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    afterDismissed = new Subject<void>();
    dialogResult = undefined;
    bottomSheetRef.afterDismissed.mockReturnValue(afterDismissed);
    dialog.open.mockImplementation(() => ({ afterClosed: () => of(dialogResult) }));

    await createComponent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // The Ace editor loses focus when the overlay opens. Without this the user's
  // next keystroke goes nowhere, which is invisible until someone types.
  it("should return focus to the editor once the sheet is dismissed", () => {
    afterDismissed.next();

    expect(chordproService.requestEditorFocus).toHaveBeenCalled();
  });

  describe("the solo tab editor", () => {
    it("should close the sheet before opening the dialog", () => {
      component.onItemSoloTabEditorClicked();

      expect(bottomSheetRef.dismiss).toHaveBeenCalled();
      expect(dialog.open).toHaveBeenCalledWith(DialogSoloTabEditorComponent, expect.anything());
    });

    it("should insert the generated tablature into the song", () => {
      dialogResult = "e|--12--|";

      component.onItemSoloTabEditorClicked();

      expect(chordproService.insertChordproContentAtCaret).toHaveBeenCalledWith("e|--12--|");
    });

    // afterClosed() emits undefined on cancel — through the backdrop, Escape,
    // or the Cancel button. Inserting then would corrupt the song silently.
    it("should insert nothing when the dialog is cancelled", () => {
      dialogResult = undefined;

      component.onItemSoloTabEditorClicked();

      expect(chordproService.insertChordproContentAtCaret).not.toHaveBeenCalled();
    });
  });

  describe("importing chords over lyrics", () => {
    it("should insert the imported chart into the song", () => {
      dialogResult = "[Am]Hello";

      component.onItemImportChordsOverLyricsClicked();

      expect(dialog.open).toHaveBeenCalledWith(DialogImportChordsOverLyricsComponent, expect.anything());
      expect(chordproService.insertChordproContentAtCaret).toHaveBeenCalledWith("[Am]Hello");
    });

    it("should insert nothing when the dialog is cancelled", () => {
      dialogResult = undefined;

      component.onItemImportChordsOverLyricsClicked();

      expect(chordproService.insertChordproContentAtCaret).not.toHaveBeenCalled();
    });
  });

  describe("external tools", () => {
    it("should open a chord identifier in a new browser tab rather than a dialog", () => {
      const open = vi.spyOn(window, "open").mockReturnValue(null);

      component.onItemAllGuitarChordsComClicked();

      expect(open).toHaveBeenCalledWith("https://www.all-guitar-chords.com/chords/identifier", "_blank");
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it("should embed a lyrics search in a dialog", () => {
      component.onItemLyricsOvhClicked();

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { src: "https://lyrics.ovh" } }),
      );
    });

    it("should embed a tempo lookup in a dialog", () => {
      component.onItemSongBpmComClicked();

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { src: "https://songbpm.com" } }),
      );
    });
  });
});

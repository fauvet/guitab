import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
import { MatDialog } from "@angular/material/dialog";
import { MatIconTestingModule } from "@angular/material/icon/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject, of } from "rxjs";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { BottomSheetInsertDirectiveComponent } from "../bottom-sheet-insert-directive/bottom-sheet-insert-directive.component";
import { DialogSelectChordComponent } from "../dialog-select-chord/dialog-select-chord.component";
import { FooterActionsBarComponent } from "./footer-actions-bar.component";

describe("FooterActionsBarComponent", () => {
  let component: FooterActionsBarComponent;
  let fixture: ComponentFixture<FooterActionsBarComponent>;
  let isEditing$: BehaviorSubject<boolean>;
  let isRemovableChordEnabled$: BehaviorSubject<boolean>;
  let youTubeUrl$: BehaviorSubject<string>;

  const dialog = { open: vi.fn() };
  const bottomSheet = { open: vi.fn() };
  const chordproService = {
    getIsRemovableChordEnabled$: vi.fn(),
    getYouTubeUrl$: vi.fn(),
    insertUnsecableSpace: vi.fn(),
    removeChord: vi.fn(),
    requestEditorFocus: vi.fn(),
  };
  const appContextService = { getIsEditing$: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    isEditing$ = new BehaviorSubject(false);
    isRemovableChordEnabled$ = new BehaviorSubject(false);
    youTubeUrl$ = new BehaviorSubject("");

    appContextService.getIsEditing$.mockReturnValue(isEditing$);
    chordproService.getIsRemovableChordEnabled$.mockReturnValue(isRemovableChordEnabled$);
    chordproService.getYouTubeUrl$.mockReturnValue(youTubeUrl$);
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

    TestBed.configureTestingModule({
      imports: [FooterActionsBarComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: ChordproService, useValue: chordproService },
        { provide: AppContextService, useValue: appContextService },
      ],
    });
    // MatBottomSheetModule is in the component's own imports, so it provides
    // MatBottomSheet at component level, where it shadows anything the TestBed
    // declares at root. overrideProvider replaces it wherever it is declared.
    TestBed.overrideProvider(MatBottomSheet, { useValue: bottomSheet });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(FooterActionsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("editing actions", () => {
    it("should insert a non-breaking space through the service", () => {
      component.onButtonInsertSpaceClicked();

      expect(chordproService.insertUnsecableSpace).toHaveBeenCalled();
    });

    it("should remove a chord through the service", () => {
      component.onButtonRemoveChordClicked();

      expect(chordproService.removeChord).toHaveBeenCalled();
    });

    it("should open the directive picker in a bottom sheet", () => {
      component.onButtonInsertDirectiveClicked();

      expect(bottomSheet.open).toHaveBeenCalledWith(BottomSheetInsertDirectiveComponent);
    });

    it("should return focus to the editor after the chord picker closes", () => {
      component.onButtonInsertChordClicked();

      expect(dialog.open).toHaveBeenCalledWith(DialogSelectChordComponent, expect.anything());
      expect(chordproService.requestEditorFocus).toHaveBeenCalled();
    });
  });

  describe("the YouTube embed", () => {
    it("should expose no embed while the song declares no video", () => {
      expect(component.sanitizedYouTubeUrl$.getValue()).toBeNull();
    });

    it("should expose an embed once the song declares a video", () => {
      youTubeUrl$.next("https://youtu.be/dQw4w9WgXcQ");

      expect(component.sanitizedYouTubeUrl$.getValue()).not.toBeNull();
    });

    it("should clear the embed when the video directive is removed", () => {
      youTubeUrl$.next("https://youtu.be/dQw4w9WgXcQ");
      youTubeUrl$.next("");

      expect(component.sanitizedYouTubeUrl$.getValue()).toBeNull();
    });
  });

  describe("editing mode", () => {
    it("should follow the app's editing mode", () => {
      isEditing$.next(true);

      expect(component.isEditing).toBe(true);
    });
  });

  describe("removable chord state", () => {
    it("should follow whether the caret sits on a removable chord", () => {
      isRemovableChordEnabled$.next(true);

      expect(component.isRemovableChordEnabled$.getValue()).toBe(true);
    });
  });
});

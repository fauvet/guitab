import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatButtonToggleChange, MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatButtonModule } from "@angular/material/button";
import { ZoomService } from "../../services/zoom/zoom.service";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { MatBottomSheet, MatBottomSheetModule } from "@angular/material/bottom-sheet";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { BottomSheetToolsComponent } from "../bottom-sheet-tools/bottom-sheet-tools.component";
import { BottomSheetManageFileComponent } from "../bottom-sheet-manage-file/bottom-sheet-manage-file.component";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "app-header-actions-bar",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatButtonToggleModule, MatBottomSheetModule, AsyncPipe],
  templateUrl: "./header-actions-bar.component.html",
  styleUrl: "./header-actions-bar.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderActionsBarComponent implements OnInit, OnDestroy {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private readonly zoomService = inject(ZoomService);
  private readonly bottomSheet = inject(MatBottomSheet);

  isEditing$ = new BehaviorSubject(false);
  areLyricsDisplayed$ = new BehaviorSubject(false);
  hasEditorUndo$ = new BehaviorSubject(false);
  hasEditorRedo$ = new BehaviorSubject(false);

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getIsEditing$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((isEditing) => this.isEditing$.next(isEditing));

    this.chordproService
      .getAreLyricsDisplayed$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((areLyricsDisplayed) => this.areLyricsDisplayed$.next(areLyricsDisplayed));

    this.chordproService
      .getHasEditorUndo$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((hasEditorUndo) => this.hasEditorUndo$.next(hasEditorUndo));

    this.chordproService
      .getHasEditorRedo$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((hasEditorRedo) => this.hasEditorRedo$.next(hasEditorRedo));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  async onButtonUndoClicked(): Promise<void> {
    this.keyboardShortcutService.undo();
  }

  async onButtonRedoClicked(): Promise<void> {
    this.keyboardShortcutService.redo();
  }

  async onButtonManageFileClicked(): Promise<void> {
    const body = document.getElementsByTagName("body")[0];
    body.classList.add("js-is-top-sheet-enabled");

    this.bottomSheet
      .open(BottomSheetManageFileComponent)
      .afterDismissed()
      .subscribe(() => body.classList.remove("js-is-top-sheet-enabled"));
  }

  async onButtonToolsClicked(): Promise<void> {
    const body = document.getElementsByTagName("body")[0];
    body.classList.add("js-is-top-sheet-enabled");

    this.bottomSheet
      .open(BottomSheetToolsComponent)
      .afterDismissed()
      .subscribe(() => body.classList.remove("js-is-top-sheet-enabled"));
  }

  onButtonToggleHideLyricsClicked(event: MatButtonToggleChange): void {
    const isChecked = event.source.checked;
    this.chordproService.setLyricsDisplayed(isChecked);
  }

  onButtonPreviewClicked(): void {
    this.appContextService.setEditing(false);
  }

  onButtonEditClicked(): void {
    this.appContextService.setEditing(true);
  }

  onButtonHistoryClicked(): void {}

  onButtonResetZoomClicked(): void {
    this.zoomService.resetZoom();
  }

  onButtonZoomInClicked(): void {
    this.zoomService.incrementZoom();
  }

  onButtonZoomOutClicked(): void {
    this.zoomService.decrementZoom();
  }
}

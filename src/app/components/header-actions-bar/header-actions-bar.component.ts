import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatButtonModule } from "@angular/material/button";
import { ZoomService } from "../../services/zoom/zoom.service";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { MatBottomSheet, MatBottomSheetModule } from "@angular/material/bottom-sheet";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { BottomSheetToolsComponent } from "../bottom-sheet-tools/bottom-sheet-tools.component";
import { BottomSheetManageFileComponent } from "../bottom-sheet-manage-file/bottom-sheet-manage-file.component";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { AsyncPipe } from "@angular/common";
import { BottomSheetSettingsComponent } from "../bottom-sheet-settings/bottom-sheet-settings.component";
import { ComponentType } from "@angular/cdk/portal";

@Component({
  selector: "app-header-actions-bar",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatBottomSheetModule, AsyncPipe],
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
  hasEditorUndo$ = new BehaviorSubject(false);
  hasEditorRedo$ = new BehaviorSubject(false);

  private readonly unsubscribe$ = new Subject<void>();
  private lastComponentTypeOpened: ComponentType<unknown> | null = null;

  ngOnInit(): void {
    this.appContextService
      .getIsEditing$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((isEditing) => this.isEditing$.next(isEditing));

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

  onButtonUndoClicked(): void {
    this.keyboardShortcutService.undo();
  }

  onButtonRedoClicked(): void {
    this.keyboardShortcutService.redo();
  }

  onButtonManageFileClicked(): void {
    this.openBottomSheetComponent(BottomSheetManageFileComponent);
  }

  onButtonToolsClicked(): void {
    this.openBottomSheetComponent(BottomSheetToolsComponent);
  }

  onButtonSettingsClicked(): void {
    this.openBottomSheetComponent(BottomSheetSettingsComponent);
  }

  onButtonPreviewClicked(): void {
    this.appContextService.setEditing(false);
  }

  onButtonEditClicked(): void {
    this.appContextService.setEditing(true);
  }

  onButtonResetZoomClicked(): void {
    this.zoomService.resetZoom();
  }

  onButtonZoomInClicked(): void {
    this.zoomService.incrementZoom();
  }

  onButtonZoomOutClicked(): void {
    this.zoomService.decrementZoom();
  }

  openBottomSheetComponent(componentType: ComponentType<unknown>): void {
    this.lastComponentTypeOpened = componentType;
    const body = document.getElementsByTagName("body")[0];
    body.classList.add("js-is-top-sheet-enabled");

    this.bottomSheet
      .open(componentType)
      .afterDismissed()
      .subscribe(() => {
        if (this.lastComponentTypeOpened !== componentType) return;
        body.classList.remove("js-is-top-sheet-enabled");
      });
  }
}

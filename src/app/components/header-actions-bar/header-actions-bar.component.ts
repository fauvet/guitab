import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatButtonToggleChange, MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatButtonModule } from "@angular/material/button";
import { ZoomService } from "../../services/zoom/zoom.service";
import { Subject, takeUntil } from "rxjs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatBottomSheet, MatBottomSheetModule } from "@angular/material/bottom-sheet";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { BottomSheetToolsComponent } from "../bottom-sheet-tools/bottom-sheet-tools.component";
import { BottomSheetManageFileComponent } from "../bottom-sheet-manage-file/bottom-sheet-manage-file.component";

@Component({
  selector: "app-header-actions-bar",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatButtonToggleModule, MatTooltipModule, MatBottomSheetModule],
  templateUrl: "./header-actions-bar.component.html",
  styleUrl: "./header-actions-bar.component.css",
})
export class HeaderActionsBarComponent implements OnInit, OnDestroy {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly zoomService = inject(ZoomService);
  private readonly bottomSheet = inject(MatBottomSheet);

  @ViewChild("buttonUndo") buttonUndo!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonRedo") buttonRedo!: ElementRef<HTMLButtonElement>;

  isEditing = false;
  areLyricsDisplayed = false;
  hasEditorUndo = false;
  hasEditorRedo = false;

  private readonly unsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getIsEditing$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((isEditing) => (this.isEditing = isEditing));

    this.chordproService
      .getAreLyricsDisplayed$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((areLyricsDisplayed) => (this.areLyricsDisplayed = areLyricsDisplayed));

    this.chordproService
      .getHasEditorUndo$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((hasEditorUndo) => (this.hasEditorUndo = hasEditorUndo));

    this.chordproService
      .getHasEditorRedo$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((hasEditorRedo) => (this.hasEditorRedo = hasEditorRedo));
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  async onButtonUndoClicked(): Promise<void> {
    this.chordproService.undoContent();
  }

  async onButtonRedoClicked(): Promise<void> {
    this.chordproService.redoContent();
  }

  async onButtonManageFileClicked(): Promise<void> {
    this.bottomSheet.open(BottomSheetManageFileComponent);
  }

  async onButtonToolsClicked(): Promise<void> {
    this.bottomSheet.open(BottomSheetToolsComponent);
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

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "z") {
      event.preventDefault();
      (this.buttonUndo as any)._elementRef.nativeElement.click();
    } else if ((event.ctrlKey && event.key === "y") || (event.ctrlKey && event.shiftKey && event.key === "z")) {
      event.preventDefault();
      (this.buttonRedo as any)._elementRef.nativeElement.click();
    }
  }
}

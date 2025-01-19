import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ToastrService } from "ngx-toastr";
import { MatButtonToggleChange, MatButtonToggleModule } from "@angular/material/button-toggle";
import FileSaver from "file-saver";
import { ChordproUtil } from "../../utils/chordpro.util";
import { MatButtonModule } from "@angular/material/button";
import { ZoomService } from "../../services/zoom/zoom.service";
import { FileUtil } from "../../utils/file.util";
import { MatDialog } from "@angular/material/dialog";
import { DialogImportLyricsComponent } from "../dialog-import-lyrics/dialog-import-lyrics.component";
import { Subject, takeUntil } from "rxjs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-header-actions-bar",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatButtonToggleModule, MatTooltipModule],
  templateUrl: "./header-actions-bar.component.html",
  styleUrl: "./header-actions-bar.component.css",
})
export class HeaderActionsBarComponent implements OnInit, OnDestroy {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;

  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly zoomService = inject(ZoomService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);

  @ViewChild("buttonUndo") buttonUndo!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonRedo") buttonRedo!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonNewFile") buttonNewFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonOpenFile") buttonOpenFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFile") buttonSaveFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFileAs") buttonSaveFileAs!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonPreview") buttonPreview!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonEdit") buttonEdit!: ElementRef<HTMLButtonElement>;

  isSaveExistingFileEnabled = false;
  isEditing = false;
  areLyricsDisplayed = false;
  hasEditorUndo = false;
  hasEditorRedo = false;

  private readonly unsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getFileHandle$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((fileHandle) => (this.isSaveExistingFileEnabled = !!fileHandle));

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

  async onButtonOpenFileClicked(event: Event): Promise<void> {
    if (!this.checkUnsavedChanges()) return;

    if (this.canOpenFilePicker()) {
      const filePicker = await window.showOpenFilePicker({
        types: [
          {
            description: "ChordPro",
            accept: {
              "text/plain": ChordproUtil.EXTENSIONS,
            },
          },
        ],
        multiple: false,
      });
      const fileHandle = filePicker[0];
      this.appContextService.setFileHandle(fileHandle);
      return;
    }

    const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;
    this.appContextService.setFile(file);
  }

  async onButtonUndoClicked(): Promise<void> {
    this.chordproService.undoContent();
  }

  async onButtonRedoClicked(): Promise<void> {
    this.chordproService.redoContent();
  }

  async onButtonNewFileClicked(): Promise<void> {
    if (!this.checkUnsavedChanges()) return;

    const file = await FileUtil.loadEmptyFile();
    this.appContextService.setFile(file);
  }

  async onButtonSaveFileClicked(): Promise<void> {
    const fileHandle = this.appContextService.getFileHandle();
    if (!fileHandle) {
      this.toastr.error("Unable to save");
      return;
    }

    const writable = await fileHandle.createWritable();
    const chordproContent = this.chordproService.getChordproContent();
    await writable.write(chordproContent);
    await writable.close();
    const fileName = fileHandle.name;
    this.toastr.success(`${fileName} saved`);
  }

  async onButtonSaveFileAsClicked(): Promise<void> {
    const chordproContent = this.chordproService.getChordproContent();
    const title = ChordproUtil.findTitle(chordproContent);
    const artist = ChordproUtil.findArtist(chordproContent);
    const fileName = `${title} (${artist})${ChordproUtil.PREFERRED_EXTENSION}`;
    const blob = new Blob([chordproContent], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, fileName);
  }

  async onButtonImportLyricsClicked(): Promise<void> {
    this.dialog
      .open(DialogImportLyricsComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe(() => {});
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
    } else if (event.ctrlKey && event.key === "n") {
      event.preventDefault();
      (this.buttonNewFile as any)._elementRef.nativeElement.click();
    } else if (event.ctrlKey && event.key === "o") {
      event.preventDefault();
      (this.buttonOpenFile as any)._elementRef.nativeElement.click();
    } else if (event.ctrlKey && event.key === "s") {
      event.preventDefault();
      (this.buttonSaveFile as any)._elementRef.nativeElement.click();
    } else if (event.ctrlKey && event.shiftKey && event.key === "s") {
      event.preventDefault();
      (this.buttonSaveFileAs as any)._elementRef.nativeElement.click();
    } else if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      (this.buttonPreview as any)._elementRef.nativeElement.click();
    } else if (event.key === "F2") {
      event.preventDefault();
      (this.buttonEdit as any)._elementRef.nativeElement.click();
    }
  }

  checkUnsavedChanges(): boolean {
    const hasUnsavedChanges = this.chordproService.getHasEditorUndo();
    return !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to discard them?");
  }

  canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }
}

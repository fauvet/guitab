import { Component, ElementRef, HostListener, OnInit, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ToastrService } from "ngx-toastr";
import { ChordproEditorComponent } from "../chordpro-editor/chordpro-editor.component";
import FileSaver from "file-saver";
import { ChordproUtil } from "../../utils/chordpro.util";
import { MatButtonModule } from "@angular/material/button";
import { ZoomService } from "../../services/zoom/zoom.service";

@Component({
  selector: "app-actions-bar",
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: "./actions-bar.component.html",
  styleUrl: "./actions-bar.component.css",
})
export class ActionsBarComponent implements OnInit {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;

  @ViewChild("buttonUndo") buttonUndo!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonRedo") buttonRedo!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonNewFile") buttonNewFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonOpenFile") buttonOpenFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFile") buttonSaveFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFileAs") buttonSaveFileAs!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonPreview") buttonPreview!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonEdit") buttonEdit!: ElementRef<HTMLButtonElement>;

  isEditing = false;

  constructor(
    private appContextService: AppContextService,
    private zoomService: ZoomService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.appContextService.getIsEditing$().subscribe((isEditing) => (this.isEditing = isEditing));
  }

  async onButtonOpenFileClicked(event: Event): Promise<void> {
    if ("showOpenFilePicker" in window && false) {
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

  async onButtonUndoClicked(): Promise<void> {}

  async onButtonRedoClicked(): Promise<void> {}

  async onButtonNewFileClicked(): Promise<void> {
    this.appContextService.setFile(null);
  }

  async onButtonSaveFileClicked(): Promise<void> {
    const fileHandle = this.appContextService.getFileHandle();
    if (!fileHandle) {
      this.toastr.error("Unable to save");
      return;
    }

    const writable = await fileHandle.createWritable();
    const editorContent = ChordproEditorComponent.getEditorContent();
    await writable.write(editorContent);
    await writable.close();
    const fileName = fileHandle.name;
    this.toastr.success(`${fileName} saved`);
  }

  async onButtonSaveFileAsClicked(): Promise<void> {
    const chordproContent = ChordproEditorComponent.getEditorContent();
    const title = ChordproUtil.findTitle(chordproContent);
    const artist = ChordproUtil.findArtist(chordproContent);
    const fileName = `${title} (${artist})${ChordproUtil.PREFERRED_EXTENSION}`;
    var file = new File([chordproContent], fileName, { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(file);
  }

  async onButtonImportLyricsClicked(): Promise<void> {
    // import lyrics
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
}

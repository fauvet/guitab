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
export class ActionsBarComponent {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;

  @ViewChild("buttonOpenFile") buttonOpenFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFile") buttonSaveFile!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonSaveFileAs") buttonSaveFileAs!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonPlay") buttonPlay!: ElementRef<HTMLButtonElement>;
  @ViewChild("buttonEdit") buttonEdit!: ElementRef<HTMLButtonElement>;

  constructor(
    private appContextService: AppContextService,
    private zoomService: ZoomService,
    private toastr: ToastrService,
  ) {}

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
    var file = new File(["Hello, world!"], "hello world.txt", { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(file);
  }

  async onButtonPlayClicked(): Promise<void> {
    this.appContextService.updateRender();
  }

  onButtonEditClicked() {}

  onButtonHistoryClicked() {}

  onButtonZoomInClicked() {
    this.zoomService.incrementZoom();
  }

  onButtonZoomOutClicked() {
    this.zoomService.decrementZoom();
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "o") {
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
      (this.buttonPlay as any)._elementRef.nativeElement.click();
    } else if (event.key === "F2") {
      event.preventDefault();
      (this.buttonEdit as any)._elementRef.nativeElement.click();
    }
  }
}

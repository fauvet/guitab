import { inject, Injectable } from "@angular/core";
import { AppContextService } from "../app-context/app-context.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { ToastrService } from "ngx-toastr";
import { FileUtil } from "../../utils/file.util";
import { ChordproUtil } from "../../utils/chordpro.util";
import FileSaver from "file-saver";

@Injectable({
  providedIn: "root",
})
export class KeyboardShortcutService {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly toastr = inject(ToastrService);

  constructor() {
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  initialize(): void {} // does nothing explictly but creates the service and calls the constructor

  private onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "z") {
      event.preventDefault();
      this.undo();
    } else if ((event.ctrlKey && event.key === "y") || (event.ctrlKey && event.shiftKey && event.key === "z")) {
      event.preventDefault();
      this.redo();
    } else if (event.ctrlKey && event.altKey && event.key === "n") {
      event.preventDefault();
      this.newFile();
    } else if (event.ctrlKey && event.key === "o") {
      event.preventDefault();
      this.openFile(event);
    } else if (event.ctrlKey && event.key === "s") {
      event.preventDefault();
      this.saveFile();
    } else if (event.ctrlKey && event.shiftKey && event.key === "s") {
      event.preventDefault();
      this.saveFileAs();
    }
  }

  async undo(): Promise<void> {
    this.chordproService.undoContent();
  }

  async redo(): Promise<void> {
    this.chordproService.redoContent();
  }

  async newFile(): Promise<boolean> {
    if (!this.checkUnsavedChanges()) return false;

    const file = await FileUtil.loadEmptyFile();
    this.appContextService.setFileHandle(file);
    return true;
  }

  async openFile(event: Event): Promise<boolean> {
    if (!this.checkUnsavedChanges()) return false;

    if (this.canOpenFilePicker()) {
      const filePicker = await window.showOpenFilePicker({
        types: [
          {
            description: "ChordPro",
            accept: {
              "*/*": ChordproUtil.EXTENSIONS,
            },
          },
        ],
        multiple: false,
      });
      const fileHandle = filePicker[0];
      this.appContextService.setFileHandle(fileHandle);
    }

    const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;
    this.appContextService.setFileHandle(file);
    return true;
  }

  async saveFile(): Promise<boolean> {
    const fileHandle = this.appContextService.getFileHandle();

    if (!fileHandle || !(fileHandle instanceof FileSystemFileHandle)) {
      return this.saveFileAs();
    }

    const writable = await fileHandle.createWritable();
    const chordproContent = this.chordproService.getChordproContent();
    await writable.write(chordproContent);
    await writable.close();
    const fileName = fileHandle.name;
    this.toastr.success(`${fileName} saved`);
    this.chordproService.updateChordproSaveState();
    return true;
  }

  async saveFileAs(): Promise<boolean> {
    return new Promise((resolve) => {
      const chordproContent = this.chordproService.getChordproContent();
      const title = ChordproUtil.findTitle(chordproContent);
      const artist = ChordproUtil.findArtist(chordproContent);
      const fileName = `${title} (${artist})${ChordproUtil.PREFERRED_EXTENSION}`;
      const blob = new Blob([chordproContent], { type: "text/plain;charset=utf-8" });
      FileSaver.saveAs(blob, fileName);

      setTimeout(() => {
        if (!confirm("Please confirm that the file has been successfully downloaded.")) {
          resolve(false);
          return;
        }

        this.toastr.success(`${fileName} saved`);
        this.chordproService.updateChordproSaveState();
        resolve(true);
      });
    });
  }

  private checkUnsavedChanges(): boolean {
    const hasUnsavedChanges = this.chordproService.hasUnsavedChanges();
    return !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to discard them?");
  }

  private canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }
}

import { inject, Injectable } from "@angular/core";
import { AppContextService } from "../app-context/app-context.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { ToastrService } from "ngx-toastr";
import { FileUtil } from "../../utils/file.util";
import { ChordproUtil } from "../../utils/chordpro.util";
import FileSaver from "file-saver";
import { LocalStorageService } from "../local-storage/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class KeyboardShortcutService {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly localStorageService = inject(LocalStorageService);
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
    this.appContextService.setEditing(true);
    return true;
  }

  async openFile(event: Event): Promise<boolean> {
    if (!this.checkUnsavedChanges()) return false;

    let file: null | File | FileSystemFileHandle = (event.target as HTMLInputElement)?.files?.[0] ?? null;
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
      file = filePicker[0];
    }

    this.appContextService.setFileHandle(file);
    this.appContextService.setEditing(false);

    const chordproContent = (await FileUtil.getFileContent(file)) ?? "";
    this.localStorageService.saveFile(chordproContent);

    return true;
  }

  async saveFile(): Promise<boolean> {
    const fileHandle = this.appContextService.getFileHandle();

    const isActionPerformed =
      !fileHandle || !(fileHandle instanceof FileSystemFileHandle)
        ? await this.saveFileAs()
        : await this.saveFileHandle(fileHandle);
    if (!isActionPerformed) return false;

    const chordproContent = this.chordproService.getChordproContent();
    this.localStorageService.saveFile(chordproContent);
    return true;
  }

  private async saveFileHandle(fileHandle: FileSystemFileHandle): Promise<boolean> {
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
    return new Promise(async (resolve) => {
      const chordproContent = this.chordproService.getChordproContent();
      const fileName = ChordproUtil.buildFileName(chordproContent);

      if (this.canSaveFilePicker()) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "ChordPro",
              accept: {
                "text/plain": ChordproUtil.EXTENSIONS,
              },
            },
          ],
        });
        await this.saveFileHandle(fileHandle);
        this.appContextService.setFileHandle(fileHandle);
        return;
      }

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

  public canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }

  private canSaveFilePicker(): boolean {
    return "showSaveFilePicker" in window;
  }
}

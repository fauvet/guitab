import { inject, Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { AppContextService } from "../app-context/app-context.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { FileUtil } from "../../utils/file.util";
import { ChordproUtil } from "../../utils/chordpro.util";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { ConfirmService } from "../confirm/confirm.service";

export type KeyboardFileActionOutcome = { type: "saved"; fileName: string } | { type: "error"; error: Error };

@Injectable({
  providedIn: "root",
})
export class KeyboardShortcutService {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly confirmService = inject(ConfirmService);

  // A "this just happened" event, not state — there is no meaningful last value
  // to read back, so this is a Subject rather than the BehaviorSubject pair the
  // rest of the app uses for state. It exists because the keydown listener below
  // has no component of its own to hand a save failure to; AppComponent, always
  // mounted, is the one subscriber.
  private readonly keyboardFileActionOutcome$ = new Subject<KeyboardFileActionOutcome>();

  constructor() {
    document.addEventListener("keydown", async (event) => await this.onKeyDown(event));
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  getKeyboardFileActionOutcome$(): Observable<KeyboardFileActionOutcome> {
    return this.keyboardFileActionOutcome$.asObservable();
  }

  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    if (document.querySelector(".cdk-overlay-backdrop-showing") !== null) return;

    if (!event.ctrlKey) return;

    // Holding Shift makes the browser report the letter in upper case, so
    // matching event.key directly left Ctrl+Shift+S and Ctrl+Shift+Z
    // unreachable — the plain Ctrl+S branch never saw an "s" to match, and
    // nothing happened at all. Normalising first, and testing the Shift
    // variants before the plain ones, is what makes both orderings safe.
    const key = event.key.toLowerCase();

    try {
      if (event.shiftKey && key === "s") {
        event.preventDefault();
        await this.reportSaveOutcome(() => this.saveFileAs());
      } else if (event.shiftKey && key === "z") {
        event.preventDefault();
        await this.redo();
      } else if (key === "y") {
        event.preventDefault();
        await this.redo();
      } else if (key === "z") {
        event.preventDefault();
        await this.undo();
      } else if (event.altKey && key === "n") {
        event.preventDefault();
        await this.newFile();
      } else if (key === "o") {
        event.preventDefault();
        await this.openFile(event);
      } else if (key === "s") {
        event.preventDefault();
        await this.reportSaveOutcome(() => this.saveFile());
      }
    } catch (error: unknown) {
      this.keyboardFileActionOutcome$.next({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async reportSaveOutcome(save: () => Promise<boolean>): Promise<void> {
    const isSaved = await save();
    if (!isSaved) return;
    const fileName = ChordproUtil.buildFileName(this.chordproService.getChordproContent());
    this.keyboardFileActionOutcome$.next({ type: "saved", fileName });
  }

  async undo(): Promise<void> {
    this.chordproService.undoContent();
  }

  async redo(): Promise<void> {
    this.chordproService.redoContent();
  }

  async newFile(): Promise<boolean> {
    if (!(await this.checkUnsavedChanges())) return false;

    const file = await FileUtil.loadEmptyFile();
    await this.appContextService.setFileHandle(file);
    this.appContextService.setEditing(true);
    return true;
  }

  async openFile(event: Event): Promise<boolean> {
    if (!(await this.checkUnsavedChanges())) return false;

    let file: null | File | FileSystemFileHandle = (event.target as HTMLInputElement)?.files?.[0] ?? null;
    if (this.canOpenFilePicker()) {
      try {
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
      } catch (error: unknown) {
        if (FileUtil.isUserCancelledFilePicker(error)) return false;
        throw new Error("Could not open the file picker.", { cause: error });
      }
    }

    await this.appContextService.setFileHandle(file);
    this.appContextService.setEditing(false);

    const chordproContent = (await FileUtil.getFileContent(file)) ?? "";
    await this.cachedFilesService.saveFile(chordproContent);

    return true;
  }

  async saveFile(): Promise<boolean> {
    const fileHandle = this.appContextService.getFileHandleWithContent()?.fileHandle ?? null;

    if (FileUtil.isFileSystemFileHandle(fileHandle)) {
      const isActionPerformed = await this.saveFileHandle(fileHandle);
      if (!isActionPerformed) return false;

      await this.cachedFilesService.saveFile(this.chordproService.getChordproContent());
      return true;
    }

    // Nothing to write through to disk — the content came from Quick Access,
    // a new file, the demo, or a restored draft. Saving now means upserting
    // to the active account/local repository directly, with no disk dialog:
    // saveFileAs() is reserved for the explicit "get a local copy" action.
    await this.cachedFilesService.saveFile(this.chordproService.getChordproContent());
    this.chordproService.updateChordproSaveState();
    return true;
  }

  private async saveFileHandle(fileHandle: FileSystemFileHandle): Promise<boolean> {
    try {
      const writable = await fileHandle.createWritable();
      const chordproContent = this.chordproService.getChordproContent();
      await writable.write(chordproContent);
      await writable.close();
    } catch (error: unknown) {
      throw new Error(`Could not save "${fileHandle.name}".`, { cause: error });
    }
    this.chordproService.updateChordproSaveState();
    return true;
  }

  async saveFileAs(): Promise<boolean> {
    const chordproContent = this.chordproService.getChordproContent();
    const fileName = ChordproUtil.buildFileName(chordproContent);

    if (this.canSaveFilePicker()) {
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await window.showSaveFilePicker({
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
      } catch (error: unknown) {
        if (FileUtil.isUserCancelledFilePicker(error)) return false;
        throw new Error("Could not open the save dialog.", { cause: error });
      }
      await this.saveFileHandle(fileHandle);
      await this.appContextService.setFileHandle(fileHandle);
      return true;
    }

    // The download fallback has no completion signal, so the only way to know
    // whether the file reached the disk is to ask. Deferring lets the browser
    // paint the download first — a dialog raised before it would be asking
    // about something the user has not seen yet.
    FileUtil.downloadAsFile(chordproContent, fileName);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const confirmed = await this.confirmService.confirm(
      "Please confirm that the file has been successfully downloaded.",
      "Yes, downloaded",
    );
    if (!confirmed) return false;

    this.chordproService.updateChordproSaveState();
    return true;
  }

  private async checkUnsavedChanges(): Promise<boolean> {
    const hasUnsavedChanges = this.chordproService.hasUnsavedChanges();
    if (!hasUnsavedChanges) return true;
    return this.confirmService.confirm("You have unsaved changes. Are you sure you want to discard them?", "Discard");
  }

  public canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }

  private canSaveFilePicker(): boolean {
    return "showSaveFilePicker" in window;
  }
}

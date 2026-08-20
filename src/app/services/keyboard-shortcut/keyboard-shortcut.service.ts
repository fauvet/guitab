import { inject, Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { AppContextService } from "../app-context/app-context.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { FileUtil } from "../../utils/file.util";
import { ChordproUtil } from "../../utils/chordpro.util";
import { CachedFilesService } from "../cached-files/cached-files.service";
import { PlatformService } from "../platform/platform.service";
import { FileTarget } from "../../types/file-target.type";
import { FileTargetUtil } from "../../utils/file-target.util";
import { IFileAccessRepository } from "../../storage/repositories/file-access.repository";
import { WebFileAccessRepository } from "../../storage/web/web-file-access.repository";
import { NativeFileAccessRepository } from "../../storage/native/native-file-access.repository";

export type FileActionOutcome = { type: "saved"; fileName: string } | { type: "error"; error: Error };

@Injectable({
  providedIn: "root",
})
export class KeyboardShortcutService {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly platformService = inject(PlatformService);
  private readonly webRepository = inject(WebFileAccessRepository);
  private readonly nativeRepository = inject(NativeFileAccessRepository);

  // A "this just happened" event, not state — there is no meaningful last value
  // to read back, so this is a Subject rather than the BehaviorSubject pair the
  // rest of the app uses for state. It exists because the keydown listener below
  // has no component of its own to hand a save failure to; AppComponent, always
  // mounted, is the one subscriber. The launch handler has the same problem, and
  // is why the name is no longer specific to the keyboard.
  private readonly fileActionOutcome$ = new Subject<FileActionOutcome>();

  constructor() {
    document.addEventListener("keydown", async (event) => await this.onKeyDown(event));
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  getFileActionOutcome$(): Observable<FileActionOutcome> {
    return this.fileActionOutcome$.asObservable();
  }

  /**
   * Opens whatever the host launched the app with — a `.cho` double-clicked in
   * a desktop file manager, or tapped in Android's.
   *
   * Subscribed once by the root component, for the lifetime of the application,
   * which is why there is no teardown here.
   */
  openLaunchedFiles(): void {
    this.getActiveRepository()
      .getLaunchedFiles$()
      .subscribe({
        next: async ({ fileTarget, content }) => {
          try {
            await this.appContextService.setFile(fileTarget, content);
            this.appContextService.setEditing(false);
            await this.cachedFilesService.saveFile(content);
          } catch (error: unknown) {
            this.reportError(error);
          }
        },
        error: (error: unknown) => this.reportError(error),
      });
  }

  /**
   * The browser strategy or the Android one. Nothing above this line knows which
   * — that is what lets the same shortcuts drive both.
   */
  private getActiveRepository(): IFileAccessRepository {
    return this.platformService.isNative() ? this.nativeRepository : this.webRepository;
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
      this.reportError(error);
    }
  }

  private async reportSaveOutcome(save: () => Promise<boolean>): Promise<void> {
    const isSaved = await save();
    if (!isSaved) return;
    const fileName = ChordproUtil.buildFileName(this.chordproService.getChordproContent());
    this.fileActionOutcome$.next({ type: "saved", fileName });
  }

  private reportError(error: unknown): void {
    this.fileActionOutcome$.next({
      type: "error",
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }

  async undo(): Promise<void> {
    this.chordproService.undoContent();
  }

  async redo(): Promise<void> {
    this.chordproService.redoContent();
  }

  async newFile(): Promise<boolean> {
    if (!this.checkUnsavedChanges()) return false;

    const emptyFile = await FileUtil.loadEmptyFile();
    await this.appContextService.setFile(emptyFile);
    this.appContextService.setEditing(true);
    return true;
  }

  async openFile(event: Event): Promise<boolean> {
    if (!this.checkUnsavedChanges()) return false;

    // Null means the user backed out of the picker, or the file input carried
    // nothing — either way nothing was opened, and the caller must not dismiss
    // its bottom sheet over it.
    const pickedFile = await this.getActiveRepository().openFile(event);
    if (pickedFile === null) return false;

    await this.appContextService.setFile(pickedFile.fileTarget, pickedFile.content);
    this.appContextService.setEditing(false);

    // Temporary breadcrumb — see FirebaseCachedFilesRepository for the rest
    // of this diagnostic trail: the opened file is not reliably reappearing
    // in Quick Access with nothing thrown anywhere, so this marks exactly
    // when the save was triggered relative to the write/read log lines.
    console.info(`[KeyboardShortcutService] openFile: triggering cachedFilesService.saveFile()`);
    await this.cachedFilesService.saveFile(pickedFile.content);

    return true;
  }

  async saveFile(): Promise<boolean> {
    const fileTarget = this.appContextService.getFileWithContent()?.fileTarget ?? null;

    const isActionPerformed = FileTargetUtil.isWritable(fileTarget)
      ? await this.writeFile(fileTarget)
      : await this.saveFileAs();
    if (!isActionPerformed) return false;

    const chordproContent = this.chordproService.getChordproContent();
    await this.cachedFilesService.saveFile(chordproContent);
    return true;
  }

  /** Writes over the file we already hold, rather than asking where to put it. */
  private async writeFile(fileTarget: null | FileTarget): Promise<boolean> {
    if (fileTarget === null) return false;

    const chordproContent = this.chordproService.getChordproContent();
    await this.getActiveRepository().writeFile(fileTarget, chordproContent);
    this.chordproService.updateChordproSaveState();
    return true;
  }

  async saveFileAs(): Promise<boolean> {
    const chordproContent = this.chordproService.getChordproContent();
    const fileName = ChordproUtil.buildFileName(chordproContent);

    const result = await this.getActiveRepository().saveFileAs(chordproContent, fileName);
    if (result.outcome === "cancelled") return false;

    // A download-based save-as leaves nothing to write through next time, so the
    // target stays as it was and the next Ctrl+S asks again.
    if (result.fileTarget !== null) await this.appContextService.setFile(result.fileTarget, chordproContent);

    this.chordproService.updateChordproSaveState();
    return true;
  }

  private checkUnsavedChanges(): boolean {
    const hasUnsavedChanges = this.chordproService.hasUnsavedChanges();
    return !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to discard them?");
  }

  public canOpenFilePicker(): boolean {
    return this.getActiveRepository().canPickOpen();
  }
}

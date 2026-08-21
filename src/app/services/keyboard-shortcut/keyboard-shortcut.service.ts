import { inject, Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { AppContextService } from "../app-context/app-context.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { FileUtil } from "../../utils/file.util";

@Injectable({
  providedIn: "root",
})
export class KeyboardShortcutService {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);

  // A "this just happened" event, not state — there is no meaningful last value
  // to read back, so this is a Subject rather than the BehaviorSubject pair the
  // rest of the app uses for state. It exists because the keydown listener below
  // has no component of its own to hand a failure to; AppComponent, always
  // mounted, is the one subscriber.
  private readonly keyboardShortcutError$ = new Subject<Error>();

  constructor() {
    document.addEventListener("keydown", async (event) => await this.onKeyDown(event));
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  getKeyboardShortcutError$(): Observable<Error> {
    return this.keyboardShortcutError$.asObservable();
  }

  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    if (document.querySelector(".cdk-overlay-backdrop-showing") !== null) return;

    if (!event.ctrlKey) return;

    // Holding Shift makes the browser report the letter in upper case, so
    // matching event.key directly left Ctrl+Shift+Z unreachable — the plain
    // Ctrl+Z branch never saw a "z" to match, and nothing happened at all.
    // Normalising first, and testing the Shift variant before the plain one,
    // is what makes both orderings safe.
    const key = event.key.toLowerCase();

    try {
      if (event.shiftKey && key === "z") {
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
      }
    } catch (error: unknown) {
      this.keyboardShortcutError$.next(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async undo(): Promise<void> {
    this.chordproService.undoContent();
  }

  async redo(): Promise<void> {
    this.chordproService.redoContent();
  }

  async newFile(): Promise<void> {
    await this.chordproService.saveNow();

    const file = await FileUtil.loadEmptyFile();
    await this.appContextService.setFileHandle(file);
    this.appContextService.setEditing(true);
  }
}

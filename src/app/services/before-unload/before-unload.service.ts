import { inject, Injectable } from "@angular/core";
import { ChordproService } from "../chordpro/chordpro.service";
import { LocalStorageService } from "../local-storage/local-storage.service";
import { skip } from "rxjs";

type Draft = {
  chordproContent: string;
  hasUnsavedChanges: boolean;
};

@Injectable({
  providedIn: "root",
})
export class BeforeUnloadService {
  private static readonly LOCAL_STORAGE_KEY_DRAFT = "DRAFT";

  private readonly chordproService = inject(ChordproService);
  private readonly localStorageService = inject(LocalStorageService);

  private readonly draft$ = this.localStorageService.buildBehaviorSubject(BeforeUnloadService.LOCAL_STORAGE_KEY_DRAFT, {
    chordproContent: "",
    hasUnsavedChanges: false,
  } as Draft);

  constructor() {
    this.chordproService
      .getChordproContent$()
      .pipe(skip(1)) // Skip the initial value to avoid unnecessary updates; allowing the service to restore the draft content
      .subscribe((chordproContent) => this.onChordproContentChange(chordproContent));

    window.addEventListener("beforeunload", (event) => {
      const hasUnsavedChanges = this.checkForUnsavedChanges(event);
      const currentDraft = this.draft$.getValue();
      const newDraft = {
        ...currentDraft,
        hasUnsavedChanges,
      } as Draft;
      this.draft$.next(newDraft);
    });
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  findDraftUnsavedChordproContent(): string | null {
    const draft = this.draft$.getValue();
    return draft.hasUnsavedChanges ? draft.chordproContent : null;
  }

  private onChordproContentChange(chordproContent: string): void {
    const newDraft = {
      chordproContent,
      hasUnsavedChanges: this.chordproService.hasUnsavedChanges(),
    } as Draft;
    this.draft$.next(newDraft);
  }

  private checkForUnsavedChanges(event: BeforeUnloadEvent): boolean {
    if (this.chordproService.hasUnsavedChanges()) {
      event.preventDefault();
      return true;
    }
    return false;
  }
}

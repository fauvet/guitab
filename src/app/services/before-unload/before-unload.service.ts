import { inject, Injectable } from "@angular/core";
import { ChordproService } from "../chordpro/chordpro.service";
import { skip, switchMap } from "rxjs";
import { Draft } from "../../storage/repositories/draft.repository";
import { LocalDraftRepository } from "../../storage/local/local-draft.repository";
import { FirebaseDraftRepository } from "../../storage/firebase/firebase-draft.repository";
import { AuthService } from "../auth/auth.service";
import { IDraftRepository } from "../../storage/repositories/draft.repository";

@Injectable({
  providedIn: "root",
})
export class BeforeUnloadService {
  private readonly chordproService = inject(ChordproService);
  private readonly authService = inject(AuthService);
  private readonly localRepository = inject(LocalDraftRepository);
  private readonly firebaseRepository = inject(FirebaseDraftRepository);

  private getActiveRepository(): IDraftRepository {
    return this.authService.getUser() ? this.firebaseRepository : this.localRepository;
  }

  constructor() {
    this.chordproService
      .getChordproContent$()
      .pipe(skip(1)) // Skip the initial value to avoid unnecessary updates; allowing the service to restore the draft content
      .subscribe((chordproContent) => this.onChordproContentChange(chordproContent));

    window.addEventListener("beforeunload", (event) => {
      const hasUnsavedChanges = this.checkForUnsavedChanges(event);
      const current = this.getActiveRepository().getDraft();
      const newDraft: Draft = { ...current, hasUnsavedChanges };
      this.getActiveRepository()
        .saveDraft(newDraft)
        .catch((err) => console.error("[BeforeUnloadService] saveDraft error:", err));
    });
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  findDraftUnsavedChordproContent(): string | null {
    const draft = this.getActiveRepository().getDraft();
    return draft.hasUnsavedChanges ? draft.chordproContent : null;
  }

  private onChordproContentChange(chordproContent: string): void {
    const newDraft: Draft = {
      chordproContent,
      hasUnsavedChanges: this.chordproService.hasUnsavedChanges(),
    };
    this.getActiveRepository()
      .saveDraft(newDraft)
      .catch((err) => console.error("[BeforeUnloadService] saveDraft error:", err));
  }

  private checkForUnsavedChanges(event: BeforeUnloadEvent): boolean {
    if (this.chordproService.hasUnsavedChanges()) {
      event.preventDefault();
      return true;
    }
    return false;
  }
}

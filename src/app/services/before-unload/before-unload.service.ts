import { inject, Injectable } from "@angular/core";
import { ChordproService } from "../chordpro/chordpro.service";
import { skip } from "rxjs";
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

  private async getActiveRepository(): Promise<IDraftRepository> {
    // Waits for the first resolved auth state rather than reading getUser()
    // synchronously — otherwise a draft saved right after startup can land in
    // localStorage while findDraftUnsavedChordproContent() has already
    // switched to Firebase, orphaning it. Same fix as CachedFilesService.
    const user = await this.authService.getUserOnceReady();
    return user ? this.firebaseRepository : this.localRepository;
  }

  constructor() {
    this.chordproService
      .getChordproContent$()
      .pipe(skip(1)) // Skip the initial value to avoid unnecessary updates; allowing the service to restore the draft content
      .subscribe((chordproContent) => this.onChordproContentChange(chordproContent));

    window.addEventListener("beforeunload", (event) => {
      const hasUnsavedChanges = this.checkForUnsavedChanges(event);
      // The browser gives beforeunload no time budget for a component to react
      // to a rejection, so there is no catcher to rethrow to — this is the
      // "Errors are never swallowed" bootstrap-style exception, just at the
      // other end of the app's life instead of the start.
      this.persistDraftOnUnload(hasUnsavedChanges).catch((err: unknown) =>
        console.error("[BeforeUnloadService] saveDraft error:", err),
      );
    });
  }

  initialize(): void {
    // This method exists to allow the service to be explicitly called and injected,
    // preventing errors when injecting the service into a component that does not use it directly.
    // Since this is an Angular service, the constructor is called only once during the application's lifetime.
  }

  async findDraftUnsavedChordproContent(): Promise<string | null> {
    const repository = await this.getActiveRepository();
    const draft = repository.getDraft();
    return draft.hasUnsavedChanges ? draft.chordproContent : null;
  }

  private async persistDraftOnUnload(hasUnsavedChanges: boolean): Promise<void> {
    const repository = await this.getActiveRepository();
    const current = repository.getDraft();
    const newDraft: Draft = { ...current, hasUnsavedChanges };
    await repository.saveDraft(newDraft);
  }

  private onChordproContentChange(chordproContent: string): void {
    // Same exception as the beforeunload listener above: this fires from a
    // content-change subscription with no user gesture to attach a
    // notification to, and draft-saving is a background safety net, not
    // something the player asked for — logging is all there is to do.
    this.persistDraftOnContentChange(chordproContent).catch((err: unknown) =>
      console.error("[BeforeUnloadService] saveDraft error:", err),
    );
  }

  private async persistDraftOnContentChange(chordproContent: string): Promise<void> {
    const newDraft: Draft = {
      chordproContent,
      hasUnsavedChanges: this.chordproService.hasUnsavedChanges(),
    };
    const repository = await this.getActiveRepository();
    await repository.saveDraft(newDraft);
  }

  private checkForUnsavedChanges(event: BeforeUnloadEvent): boolean {
    if (this.chordproService.hasUnsavedChanges()) {
      event.preventDefault();
      return true;
    }
    return false;
  }
}

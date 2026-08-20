import { inject, Injectable } from "@angular/core";
import { ChordproService } from "../chordpro/chordpro.service";
import { skip } from "rxjs";
import { Draft } from "../../storage/repositories/draft.repository";
import { LocalDraftRepository } from "../../storage/local/local-draft.repository";
import { FirebaseDraftRepository } from "../../storage/firebase/firebase-draft.repository";
import { AuthService } from "../auth/auth.service";
import { IDraftRepository } from "../../storage/repositories/draft.repository";
import { PlatformService } from "../platform/platform.service";

@Injectable({
  providedIn: "root",
})
export class BeforeUnloadService {
  private readonly chordproService = inject(ChordproService);
  private readonly authService = inject(AuthService);
  private readonly localRepository = inject(LocalDraftRepository);
  private readonly firebaseRepository = inject(FirebaseDraftRepository);
  private readonly platformService = inject(PlatformService);

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
      this.saveUnsavedChangesFlag(hasUnsavedChanges);
    });

    if (this.platformService.isNative()) {
      this.listenToAppLifecycle().catch((error: unknown) =>
        console.error("[BeforeUnloadService] Could not listen to the app lifecycle:", error),
      );
    }
  }

  /**
   * `beforeunload` never fires on Android — an app is backgrounded or killed,
   * it is not unloaded. Two events stand in for it.
   *
   * The draft content itself is safe either way, being written on every content
   * change. What would be lost is the flag saying it is unsaved, which is the
   * one thing the recovery on startup reads.
   */
  private async listenToAppLifecycle(): Promise<void> {
    const { App } = await import("@capacitor/app");

    await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) return;
      this.saveUnsavedChangesFlag(this.chordproService.hasUnsavedChanges());
    });

    // The hardware back button is this app's equivalent of closing the tab:
    // there is no second route to go back to, so Android's default is to leave.
    // The browser answers that with its native "leave site?" prompt, and this is
    // the same guard.
    await App.addListener("backButton", () => {
      const hasUnsavedChanges = this.chordproService.hasUnsavedChanges();
      this.saveUnsavedChangesFlag(hasUnsavedChanges);

      if (hasUnsavedChanges && !confirm("You have unsaved changes. Are you sure you want to leave?")) return;

      App.exitApp().catch((error: unknown) => console.error("[BeforeUnloadService] exitApp error:", error));
    });
  }

  /**
   * Callers here are all leaving-the-app events, and none of them gives a
   * component time to react to a rejection — there is no catcher to rethrow to.
   * This is the "Errors are never swallowed" bootstrap-style exception, at the
   * other end of the app's life instead of the start.
   */
  private saveUnsavedChangesFlag(hasUnsavedChanges: boolean): void {
    const current = this.getActiveRepository().getDraft();
    const newDraft: Draft = { ...current, hasUnsavedChanges };
    this.getActiveRepository()
      .saveDraft(newDraft)
      .catch((error: unknown) => console.error("[BeforeUnloadService] saveDraft error:", error));
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
    // Same exception as the beforeunload listener above: this fires from a
    // content-change subscription with no user gesture to attach a
    // notification to, and draft-saving is a background safety net, not
    // something the player asked for — logging is all there is to do.
    this.getActiveRepository()
      .saveDraft(newDraft)
      .catch((err: unknown) => console.error("[BeforeUnloadService] saveDraft error:", err));
  }

  private checkForUnsavedChanges(event: BeforeUnloadEvent): boolean {
    if (this.chordproService.hasUnsavedChanges()) {
      event.preventDefault();
      return true;
    }
    return false;
  }
}

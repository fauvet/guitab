import { DOCUMENT, inject, Injectable } from "@angular/core";
import { SwUpdate } from "@angular/service-worker";
import { ChordproService } from "../chordpro/chordpro.service";

/**
 * Brings the installed app up to the version deployed on GitHub Pages.
 *
 * The service worker serves the cached version and only swaps in a new one on
 * the next load, so a player who opens the app once after a deploy keeps
 * running the old code. This asks for the new version on demand instead.
 */
@Injectable({
  providedIn: "root",
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly chordproService = inject(ChordproService);
  private readonly document = inject(DOCUMENT);

  /**
   * Resolves `false` when this is already the latest version. Otherwise it
   * reloads the page into the new one, and the promise is left behind with it.
   */
  async updateApp(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      throw new Error("Updates are only available once the app is installed and served by its service worker.");
    }

    // Saved before anything else: with unsaved changes the reload would raise
    // the browser's "leave this page?" prompt, and a refused save must stop
    // the update rather than discard what the player typed.
    await this.chordproService.saveNow();

    // checkForUpdate() only reports a version newer than the one already
    // downloaded, and the service worker downloads new versions on its own in
    // the background. activateUpdate() is what tells whether this tab is
    // actually behind, whichever of the two fetched it.
    await this.swUpdate.checkForUpdate();
    const isUpdated = await this.swUpdate.activateUpdate();
    if (!isUpdated) return false;

    this.document.location.reload();
    return true;
  }
}

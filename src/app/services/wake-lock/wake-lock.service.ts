import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

/**
 * Holds a Screen Wake Lock so the phone does not dim in the middle of a song.
 *
 * A service and not a util for the same reason as the Bluetooth keep-alive: a
 * `WakeLockSentinel` is a live handle the browser hands out and can take back,
 * so keeping it in a static field made `src/app/utils/` hold state and perform
 * side effects, against hard rule 5. It also had no way to report a failure,
 * because a util cannot reach a snackbar.
 *
 * `isKeptAwake$` is the *reality* — whether a sentinel is held right now — and
 * it is deliberately not the same thing as `AppContextService.isWakeLock$`,
 * which is the *intention*: what the player asked for. The two diverge on their
 * own, and neither one can be derived from the other:
 *
 * - a refused request, or a browser without the API, means the intention stands
 *   and nothing is held;
 * - the browser takes the lock back whenever the tab stops being visible, so
 *   switching to another app between two songs drops it while the intention is
 *   still perfectly valid — which is exactly what makes it worth re-acquiring
 *   on the way back rather than rewriting the intention to `false`.
 *
 * Keeping them apart is what lets the setting say the truth without anyone
 * writing into a subject they do not own.
 */
@Injectable({
  providedIn: "root",
})
export class WakeLockService implements OnDestroy {
  private readonly isKeptAwake$ = new BehaviorSubject<boolean>(false);
  // The *why* behind isKeptAwake$ being false — refused, unsupported, or simply
  // not requested yet. Not shown as a snackbar: coming back to the app after a
  // background reacquire is not a user action to interrupt, so this is a status
  // for BottomSheetSettingsComponent to display inline, the same shape as
  // PitchDetectionService's errorMessage$.
  private readonly lastErrorMessage$ = new BehaviorSubject<string | null>(null);

  private sentinel: null | WakeLockSentinel = null;

  // The last instruction received, and nothing more: it is not exposed, and the
  // intention it mirrors lives in AppContextService. Reading it from there
  // instead would be circular — that service already injects this one.
  private isRequested = false;

  private readonly onVisibilityChangedListener = (): void => void this.onVisibilityChanged();

  // In the application this listener lives as long as the document, this being
  // a root singleton. It is still removed on destruction, because a test
  // injector is destroyed between tests and a stale instance still listening
  // would re-acquire a lock on behalf of a service nobody holds any more.
  constructor() {
    document.addEventListener("visibilitychange", this.onVisibilityChangedListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener("visibilitychange", this.onVisibilityChangedListener);
  }

  getIsKeptAwake$(): Observable<boolean> {
    return this.isKeptAwake$.asObservable();
  }

  isKeptAwake(): boolean {
    return this.isKeptAwake$.getValue();
  }

  getLastErrorMessage$(): Observable<string | null> {
    return this.lastErrorMessage$.asObservable();
  }

  async setKeptAwake(isKeptAwake: boolean): Promise<void> {
    this.isRequested = isKeptAwake;

    if (isKeptAwake) {
      await this.acquire({ isSilentOnFailure: false });
      return;
    }

    await this.release();
  }

  private async onVisibilityChanged(): Promise<void> {
    if (document.visibilityState !== "visible") return;
    if (!this.isRequested || this.sentinel) return;

    // Coming back to the app is not an action on the setting, so a failure here
    // must not throw a snackbar over the song the player is reading. The list
    // item showing the lock is not held is enough.
    await this.acquire({ isSilentOnFailure: true });
  }

  private async acquire({ isSilentOnFailure }: { isSilentOnFailure: boolean }): Promise<void> {
    if (this.sentinel) return;

    if (!("wakeLock" in navigator)) {
      // Silently doing nothing would leave the setting switched on while the
      // screen keeps dimming, which reads as the app being broken rather than
      // the browser being old.
      if (!isSilentOnFailure) this.lastErrorMessage$.next("This browser cannot keep the screen awake.");
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      // The browser releases the lock on its own whenever the tab stops being
      // visible. Forgetting the handle then is what lets the next request
      // succeed — holding a released sentinel would make the setting look on
      // and do nothing for the rest of the session.
      sentinel.addEventListener("release", () => {
        if (this.sentinel === sentinel) this.forget();
      });
      this.sentinel = sentinel;
      this.setKeptAwakeState(true);
      this.lastErrorMessage$.next(null);
    } catch (error: unknown) {
      console.error("[WakeLock] Request refused:", error);
      if (!isSilentOnFailure) this.lastErrorMessage$.next("Could not keep the screen awake.");
    }
  }

  private async release(): Promise<void> {
    const sentinel = this.sentinel;
    this.forget();
    this.lastErrorMessage$.next(null);

    await sentinel?.release();
  }

  private forget(): void {
    this.sentinel = null;
    this.setKeptAwakeState(false);
  }

  private setKeptAwakeState(isKeptAwake: boolean): void {
    if (isKeptAwake === this.isKeptAwake()) return;
    this.isKeptAwake$.next(isKeptAwake);
  }
}

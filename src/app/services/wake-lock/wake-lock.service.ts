import { inject, Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

/**
 * Holds a Screen Wake Lock so the phone does not dim in the middle of a song.
 *
 * A service and not a util for the same reason as the Bluetooth keep-alive: a
 * `WakeLockSentinel` is a live handle the browser hands out and can take back,
 * so keeping it in a static field made `src/app/utils/` hold state and perform
 * side effects, against hard rule 5. It also had no way to report a failure,
 * because a util cannot reach a snackbar.
 */
@Injectable({
  providedIn: "root",
})
export class WakeLockService {
  private readonly snackBar = inject(MatSnackBar);

  private sentinel: null | WakeLockSentinel = null;

  async setKeptAwake(isKeptAwake: boolean): Promise<void> {
    if (isKeptAwake) {
      await this.acquire();
      return;
    }

    await this.release();
  }

  private async acquire(): Promise<void> {
    if (this.sentinel) return;

    if (!("wakeLock" in navigator)) {
      // Silently doing nothing would leave the setting switched on while the
      // screen keeps dimming, which reads as the app being broken rather than
      // the browser being old.
      this.notify("This browser cannot keep the screen awake.");
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      // The browser releases the lock on its own whenever the tab stops being
      // visible. Forgetting the handle then is what lets the next request
      // succeed — holding a released sentinel would make the setting look on
      // and do nothing for the rest of the session.
      sentinel.addEventListener("release", () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      });
      this.sentinel = sentinel;
    } catch (error: unknown) {
      console.error("[WakeLock] Request refused:", error);
      this.notify("Could not keep the screen awake.");
    }
  }

  private async release(): Promise<void> {
    if (!this.sentinel) return;

    const sentinel = this.sentinel;
    this.sentinel = null;
    await sentinel.release();
  }

  private notify(message: string): void {
    this.snackBar.open(message, "Dismiss", { duration: 5000 });
  }
}

import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";

/**
 * The one place that asks what we are running on.
 *
 * Capacitor's own check would work anywhere, which is exactly why it is wrapped:
 * left unwrapped it would spread through services and repositories as a dozen
 * `Capacitor.isNativePlatform()` calls, each one a thing to stub in a test. One
 * seam is one mock.
 *
 * In the browser — and under jsdom, so in every test that does not say
 * otherwise — `isNative()` is false and the web strategies are the ones that
 * run.
 */
@Injectable({
  providedIn: "root",
})
export class PlatformService {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}

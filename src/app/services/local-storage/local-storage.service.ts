import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  private readonly DEPRECATED_KEYS = ["ZoomService-ZOOM-VALUE"];

  constructor() {
    this.removeDeprecatedKeys(...this.DEPRECATED_KEYS);
  }

  removeDeprecatedKeys(...keys: string[]): void {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  buildBehaviorSubject<T>(
    key: string,
    defaultValue: T,
    reviver?: (key: string, value: unknown) => unknown,
  ): BehaviorSubject<T> {
    if (this.DEPRECATED_KEYS.includes(key)) {
      throw new Error(`Local storage key "${key}" is deprecated and should not be used.`);
    }

    const localStorageValue = localStorage.getItem(key);
    // This runs from a repository's field initializer, at DI construction time —
    // no component is mounted yet to catch a throw, so a corrupted entry falls
    // back to defaultValue instead of crashing the whole app at bootstrap. See
    // the bootstrap exception in "Errors are never swallowed".
    let initialValue = defaultValue;
    if (localStorageValue !== null) {
      try {
        initialValue = JSON.parse(localStorageValue, reviver) as T;
      } catch (error: unknown) {
        console.error(`[LocalStorageService] Corrupted value for "${key}", falling back to the default:`, error);
      }
    }
    const behaviorSubject$ = new BehaviorSubject<T>(initialValue);
    // This subscription lives as long as the app does, by design — nothing ever
    // unsubscribes it. Guard it the same way the read above guards JSON.parse:
    // Safari private browsing and a full storage quota both throw synchronously
    // from setItem, and this is a continuous background effect with no awaiting
    // caller to reject to (see "Errors are never swallowed").
    behaviorSubject$.subscribe((newValue: T) => {
      try {
        if (newValue === null || newValue === undefined) {
          localStorage.removeItem(key);
          return;
        }
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error: unknown) {
        console.error(`[LocalStorageService] Could not persist "${key}":`, error);
      }
    });
    return behaviorSubject$;
  }
}

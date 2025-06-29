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

  buildBehaviorSubject<T>(key: string, defaultValue: T, reviver?: (key: string, value: any) => T): BehaviorSubject<T> {
    if (this.DEPRECATED_KEYS.includes(key)) {
      throw new Error(`Local storage key "${key}" is deprecated and should not be used.`);
    }

    const localStorageValue = localStorage.getItem(key);
    const initialValue = localStorageValue !== null ? (JSON.parse(localStorageValue, reviver) as T) : defaultValue;
    const behaviorSubject$ = new BehaviorSubject<T>(initialValue);
    behaviorSubject$.subscribe((newValue: T) => {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(newValue));
    });
    return behaviorSubject$;
  }
}

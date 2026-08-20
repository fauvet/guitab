import { inject, Injectable } from "@angular/core";
import {
  Auth,
  AuthCredential,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { BehaviorSubject, filter, firstValueFrom, Observable } from "rxjs";
import { FirebaseService } from "../firebase/firebase.service";
import { PlatformService } from "../platform/platform.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly platformService = inject(PlatformService);
  private readonly auth: Auth;

  private readonly user$ = new BehaviorSubject<User | null>(null);
  private readonly signInError$ = new BehaviorSubject<Error | null>(null);
  // user$ starts null before the first onAuthStateChanged callback, which is
  // indistinguishable from "signed out" — callers that must not act on that
  // transient null (e.g. picking a storage backend) wait on this instead.
  private readonly authReady$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.auth = getAuth(this.firebaseService.getApp());
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.user$.next(user);
        this.authReady$.next(true);
      } else {
        // Clear the previous session immediately — otherwise getUser()
        // keeps reporting it until the anonymous sign-in below resolves,
        // which a caller could mistake for a still-valid session.
        this.user$.next(null);
        // No session — sign in anonymously to always have a stable uid. This
        // runs at app bootstrap with no component mounted yet to hand the
        // failure to, so it is the one place this service logs itself — see
        // the bootstrap exception in "Errors are never swallowed".
        signInAnonymously(this.auth).catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[AuthService] Anonymous sign-in failed:", error);
          this.signInError$.next(error);
          this.authReady$.next(true);
        });
      }
    });
  }

  getUser$(): Observable<User | null> {
    return this.user$.asObservable();
  }

  getUser(): User | null {
    return this.user$.getValue();
  }

  /**
   * Resolves once the first real auth state is known — a signed-in user, or a
   * definitively failed anonymous sign-in. Use this instead of getUser() when
   * "no user yet" and "no user at all" must not be treated the same way.
   */
  async getUserOnceReady(): Promise<User | null> {
    await firstValueFrom(this.authReady$.pipe(filter(Boolean)));
    return this.getUser();
  }

  getSignInError$(): Observable<Error | null> {
    return this.signInError$.asObservable();
  }

  getSignInError(): Error | null {
    return this.signInError$.getValue();
  }

  isAnonymous(): boolean {
    return this.user$.getValue()?.isAnonymous ?? true;
  }

  /**
   * Links the current anonymous account to a Google credential.
   * Preserves the uid and all Realtime Database data created anonymously.
   * Falls back to a full sign-in if the Google account is already linked to another uid.
   */
  async signInWithGoogle(): Promise<void> {
    const current = this.auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await this.linkGoogle(current);
      } catch (error: unknown) {
        // Firebase reports the reason in a `code` field. Narrow on that field
        // rather than on `instanceof Error`: what this branch depends on is the
        // code, not the prototype, and a rejection is not obliged to be an
        // Error at all.
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? (error as { code: unknown }).code
            : undefined;
        if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
          // Google account already exists with a different uid — sign in directly
          await this.signInGoogle();
        } else {
          throw error;
        }
      }
    } else {
      await this.signInGoogle();
    }
  }

  private async signInGoogle(): Promise<void> {
    const credential = await this.requestNativeGoogleCredential();
    if (credential !== null) {
      await signInWithCredential(this.auth, credential);
      return;
    }

    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  private async linkGoogle(user: User): Promise<void> {
    const credential = await this.requestNativeGoogleCredential();
    if (credential !== null) {
      await linkWithCredential(user, credential);
      return;
    }

    await linkWithPopup(user, new GoogleAuthProvider());
  }

  /**
   * The Google consent screen, on a device.
   *
   * Google rejects OAuth started from an embedded WebView, so the popup that
   * works in a browser cannot work here. The native plugin runs the consent
   * flow through Android instead and hands back an ID token — and with
   * `skipNativeAuth` it stops there, deliberately: the JS SDK stays the single
   * owner of the session, because `user$` and every Realtime Database repository are
   * built on it. Two SDKs holding two ideas of who is signed in is the failure
   * this avoids.
   *
   * Returns null in a browser, where the caller falls back to the popup. The
   * import is dynamic so the web bundle never carries the plugin.
   */
  private async requestNativeGoogleCredential(): Promise<null | AuthCredential> {
    if (!this.platformService.isNative()) return null;

    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });

    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error("Google sign-in returned no ID token.");
    }

    return GoogleAuthProvider.credential(idToken);
  }

  /**
   * Signs out then immediately falls back to anonymous authentication.
   */
  async signOut(): Promise<void> {
    // The native layer caches the chosen Google account independently of the
    // JS SDK. Left signed in, the next sign-in would skip the account chooser
    // and silently return the account the user just left.
    if (this.platformService.isNative()) {
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
      await FirebaseAuthentication.signOut();
    }

    await signOut(this.auth);
    // onAuthStateChanged will trigger signInAnonymously automatically
  }
}

import { inject, Injectable } from "@angular/core";
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { BehaviorSubject, filter, firstValueFrom, Observable } from "rxjs";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly auth: Auth;

  private readonly user$ = new BehaviorSubject<User | null>(null);
  private readonly signInError$ = new BehaviorSubject<boolean>(false);
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
        // No session — sign in anonymously to always have a stable uid
        signInAnonymously(this.auth).catch((err: unknown) => {
          console.error("[AuthService] Anonymous sign-in failed:", err);
          this.signInError$.next(true);
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

  getSignInError$(): Observable<boolean> {
    return this.signInError$.asObservable();
  }

  getSignInError(): boolean {
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
    const provider = new GoogleAuthProvider();
    const current = this.auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
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
          await signInWithPopup(this.auth, provider);
        } else {
          throw error;
        }
      }
    } else {
      await signInWithPopup(this.auth, provider);
    }
  }

  /**
   * Signs out then immediately falls back to anonymous authentication.
   */
  async signOut(): Promise<void> {
    await signOut(this.auth);
    // onAuthStateChanged will trigger signInAnonymously automatically
  }
}

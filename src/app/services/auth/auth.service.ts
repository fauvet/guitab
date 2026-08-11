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
import { BehaviorSubject, Observable } from "rxjs";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly auth: Auth;

  private readonly user$ = new BehaviorSubject<User | null>(null);

  constructor() {
    this.auth = getAuth(this.firebaseService.getApp());
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.user$.next(user);
      } else {
        // No session — sign in anonymously to always have a stable uid
        signInAnonymously(this.auth).catch((err) =>
          console.error("[AuthService] Anonymous sign-in failed:", err),
        );
      }
    });
  }

  getUser$(): Observable<User | null> {
    return this.user$.asObservable();
  }

  getUser(): User | null {
    return this.user$.getValue();
  }

  isAnonymous(): boolean {
    return this.user$.getValue()?.isAnonymous ?? true;
  }

  /**
   * Links the current anonymous account to a Google credential.
   * Preserves the uid and all Firestore data created anonymously.
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
          typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : undefined;
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

import { inject, Injectable } from "@angular/core";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from "firebase/firestore";
import { BehaviorSubject, Observable } from "rxjs";
import { IDraftRepository, Draft, DEFAULT_DRAFT } from "../repositories/draft.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class FirebaseDraftRepository implements IDraftRepository {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);

  private readonly draft$ = new BehaviorSubject<Draft>(DEFAULT_DRAFT);
  private snapshotUnsubscribe: Unsubscribe | null = null;

  constructor() {
    this.authService.getUser$().subscribe((user) => {
      if (this.snapshotUnsubscribe) {
        this.snapshotUnsubscribe();
        this.snapshotUnsubscribe = null;
      }
      if (user) {
        this.subscribeToUserDraft(user.uid);
      } else {
        this.draft$.next(DEFAULT_DRAFT);
      }
    });
  }

  private subscribeToUserDraft(uid: string): void {
    const db = this.firebaseService.getFirestore();
    const ref = doc(db, `users/${uid}/draft`);
    this.snapshotUnsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        this.draft$.next({
          chordproContent: (data["chordproContent"] as string) ?? "",
          hasUnsavedChanges: (data["hasUnsavedChanges"] as boolean) ?? false,
        });
      } else {
        this.draft$.next(DEFAULT_DRAFT);
      }
    });
  }

  getDraft$(): Observable<Draft> {
    return this.draft$.asObservable();
  }

  getDraft(): Draft {
    return this.draft$.getValue();
  }

  async saveDraft(draft: Draft): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;

    const db = this.firebaseService.getFirestore();
    const ref = doc(db, `users/${user.uid}/draft`);
    const existingDoc = await getDoc(ref);
    await setDoc(ref, {
      ...draft,
      ownerId: user.uid,
      ...(existingDoc.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    });
  }
}

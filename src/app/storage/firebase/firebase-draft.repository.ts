import { inject, Injectable } from "@angular/core";
import { get, onValue, ref, serverTimestamp, set, Unsubscribe } from "firebase/database";
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
    const db = this.firebaseService.getDatabase();
    const draftRef = ref(db, `users/${uid}/draft/current`);
    this.snapshotUnsubscribe = onValue(draftRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, unknown>;
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

    const db = this.firebaseService.getDatabase();
    const draftRef = ref(db, `users/${user.uid}/draft/current`);

    try {
      const existingSnapshot = await get(draftRef);
      await set(draftRef, {
        ...draft,
        ownerId: user.uid,
        ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      throw new Error("Could not save your draft.", { cause: error });
    }
  }
}

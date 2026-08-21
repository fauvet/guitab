import { inject, Injectable } from "@angular/core";
import { get, onValue, orderByChild, query, ref, remove, serverTimestamp, set, Unsubscribe } from "firebase/database";
import { BehaviorSubject, Observable } from "rxjs";
import { ICachedFilesRepository } from "../repositories/cached-files.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import { RealtimeDatabaseUtil } from "../../utils/realtime-database.util";
import CachedFile from "../../types/cached-file.type";

@Injectable({
  providedIn: "root",
})
export class FirebaseCachedFilesRepository implements ICachedFilesRepository {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);

  private readonly cachedFiles$ = new BehaviorSubject<CachedFile[]>([]);
  // The live listener's own status only — saveFile() below never touches this,
  // its failure travels by rejecting instead. See "Errors are never swallowed".
  private readonly syncError$ = new BehaviorSubject<Error | null>(null);
  private snapshotUnsubscribe: Unsubscribe | null = null;

  constructor() {
    this.authService.getUser$().subscribe((user) => {
      if (this.snapshotUnsubscribe) {
        this.snapshotUnsubscribe();
        this.snapshotUnsubscribe = null;
      }
      if (user) {
        this.subscribeToUserFiles(user.uid);
      } else {
        this.cachedFiles$.next([]);
        this.syncError$.next(null);
      }
    });
  }

  private subscribeToUserFiles(uid: string): void {
    const db = this.firebaseService.getDatabase();
    const filesQuery = query(ref(db, `users/${uid}/cachedFiles`), orderByChild("updatedAt"));
    this.snapshotUnsubscribe = onValue(
      filesQuery,
      (snapshot) => {
        const files: CachedFile[] = [];
        snapshot.forEach((child) => {
          const data = child.val() as Record<string, unknown>;
          files.push({
            name: data["name"] as string,
            chordproContent: data["chordproContent"] as string,
            date: typeof data["updatedAt"] === "number" ? new Date(data["updatedAt"]) : new Date(),
          });
        });
        // orderByChild only sorts ascending — Quick Access wants the most recent first.
        files.reverse();
        this.cachedFiles$.next(files);
        this.syncError$.next(null);
      },
      (error: Error) => {
        // Without this callback a failing listener dies silently — cachedFiles$
        // stays frozen at its last value forever, with no way to tell a broken
        // sync from an empty list. This is continuous state with no awaiting
        // caller to reject to, so the service logs it itself.
        console.error("[FirebaseCachedFilesRepository] cachedFiles listener error:", error);
        this.syncError$.next(error);
      },
    );
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.cachedFiles$.asObservable();
  }

  getSyncError$(): Observable<Error | null> {
    return this.syncError$.asObservable();
  }

  async saveFile(chordproContent: string, fallbackName?: string): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;

    const db = this.firebaseService.getDatabase();
    const fileBaseName = ChordproUtil.buildFileBaseName(chordproContent, fallbackName);
    const fileId = RealtimeDatabaseUtil.sanitizeKey(fileBaseName);
    const fileRef = ref(db, `users/${user.uid}/cachedFiles/${fileId}`);

    try {
      const existingSnapshot = await get(fileRef);
      await set(fileRef, {
        name: fileBaseName,
        chordproContent,
        ownerId: user.uid,
        ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      throw new Error(`Could not save "${fileBaseName}" to your account.`, { cause: error });
    }
  }

  async deleteFile(name: string): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;

    const db = this.firebaseService.getDatabase();
    const fileId = RealtimeDatabaseUtil.sanitizeKey(name);
    const fileRef = ref(db, `users/${user.uid}/cachedFiles/${fileId}`);

    try {
      await remove(fileRef);
    } catch (error: unknown) {
      throw new Error(`Could not delete "${name}".`, { cause: error });
    }
  }
}

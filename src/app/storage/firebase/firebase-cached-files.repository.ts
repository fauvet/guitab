import { inject, Injectable } from "@angular/core";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { BehaviorSubject, Observable } from "rxjs";
import { ICachedFilesRepository } from "../repositories/cached-files.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import CachedFile from "../../types/cached-file.type";

@Injectable({
  providedIn: "root",
})
export class FirebaseCachedFilesRepository implements ICachedFilesRepository {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);

  private readonly cachedFiles$ = new BehaviorSubject<CachedFile[]>([]);
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
      }
    });
  }

  private subscribeToUserFiles(uid: string): void {
    const db = this.firebaseService.getFirestore();
    const ref = collection(db, `users/${uid}/cachedFiles`);
    const q = query(ref, orderBy("updatedAt", "desc"));
    this.snapshotUnsubscribe = onSnapshot(q, (snapshot) => {
      const files: CachedFile[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          name: data["name"] as string,
          chordproContent: data["chordproContent"] as string,
          date: (data["updatedAt"] as { toDate(): Date } | null)?.toDate() ?? new Date(),
        };
      });
      this.cachedFiles$.next(files);
    });
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.cachedFiles$.asObservable();
  }

  async saveFile(chordproContent: string): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;

    const db = this.firebaseService.getFirestore();
    const fileBaseName = ChordproUtil.buildFileBaseName(chordproContent);
    // Use the file name as document ID (sanitized) to allow upsert by name
    const docId = encodeURIComponent(fileBaseName);
    const ref = doc(db, `users/${user.uid}/cachedFiles/${docId}`);

    const existingDoc = await getDoc(ref);
    await setDoc(ref, {
      name: fileBaseName,
      chordproContent,
      ownerId: user.uid,
      ...(existingDoc.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    });
  }
}

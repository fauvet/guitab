import { inject, Injectable } from "@angular/core";
import { Observable, switchMap } from "rxjs";
import CachedFile from "../../types/cached-file.type";
import { LocalCachedFilesRepository } from "../../storage/local/local-cached-files.repository";
import { FirebaseCachedFilesRepository } from "../../storage/firebase/firebase-cached-files.repository";
import { AuthService } from "../auth/auth.service";
import { ICachedFilesRepository } from "../../storage/repositories/cached-files.repository";

@Injectable({
  providedIn: "root",
})
export class CachedFilesService {
  private readonly localRepository = inject(LocalCachedFilesRepository);
  private readonly firebaseRepository = inject(FirebaseCachedFilesRepository);
  private readonly authService = inject(AuthService);

  private getActiveRepository(): ICachedFilesRepository {
    return this.authService.getUser() ? this.firebaseRepository : this.localRepository;
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.authService.getUser$().pipe(
      switchMap((user) => (user ? this.firebaseRepository.getCachedFiles$() : this.localRepository.getCachedFiles$())),
    );
  }

  saveFile(chordproContent: string): void {
    this.getActiveRepository()
      .saveFile(chordproContent)
      .catch((err) => console.error("[CachedFilesService] saveFile error:", err));
  }
}


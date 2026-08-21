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

  private async getActiveRepository(): Promise<ICachedFilesRepository> {
    // Waits for the first resolved auth state rather than reading getUser()
    // synchronously — otherwise a save right after startup can land in
    // localStorage while getCachedFiles$() has already switched to the
    // Firebase stream, orphaning the save.
    const user = await this.authService.getUserOnceReady();
    return user ? this.firebaseRepository : this.localRepository;
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.authService
      .getUser$()
      .pipe(
        switchMap((user) =>
          user ? this.firebaseRepository.getCachedFiles$() : this.localRepository.getCachedFiles$(),
        ),
      );
  }

  getSyncError$(): Observable<Error | null> {
    return this.authService
      .getUser$()
      .pipe(
        switchMap((user) => (user ? this.firebaseRepository.getSyncError$() : this.localRepository.getSyncError$())),
      );
  }

  async saveFile(chordproContent: string, fallbackName?: string): Promise<void> {
    const repository = await this.getActiveRepository();
    await repository.saveFile(chordproContent, fallbackName);
  }

  async deleteFile(name: string): Promise<void> {
    const repository = await this.getActiveRepository();
    await repository.deleteFile(name);
  }
}

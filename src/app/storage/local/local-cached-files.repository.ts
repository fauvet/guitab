import { inject, Injectable } from "@angular/core";
import { map, Observable, of } from "rxjs";
import { ICachedFilesRepository } from "../repositories/cached-files.repository";
import { LocalStorageService } from "../../services/local-storage/local-storage.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import CachedFile from "../../types/cached-file.type";

@Injectable({
  providedIn: "root",
})
export class LocalCachedFilesRepository implements ICachedFilesRepository {
  static readonly LOCAL_STORAGE_KEY = "CACHED_FILES";
  private static readonly DEFAULT_VALUE: CachedFile[] = [];

  private readonly localStorageService = inject(LocalStorageService);
  private readonly cachedFiles$ = this.localStorageService.buildBehaviorSubject<CachedFile[]>(
    LocalCachedFilesRepository.LOCAL_STORAGE_KEY,
    LocalCachedFilesRepository.DEFAULT_VALUE,
    (key, value) => {
      if (key === "date") return new Date(value as string);
      return value;
    },
  );

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.cachedFiles$.asObservable().pipe(map((files) => files.map((f) => ({ ...f, id: this.matchId(f) }))));
  }

  async saveFile(chordproContent: string, id: string | null, fallbackName?: string): Promise<string> {
    const fileId = id ?? crypto.randomUUID();
    const fileBaseName = ChordproUtil.buildFileBaseName(chordproContent, fallbackName);
    const current = this.cachedFiles$.getValue().filter((f) => this.matchId(f) !== fileId);
    current.push({ id: fileId, name: fileBaseName, chordproContent, date: new Date() });
    this.cachedFiles$.next(current);
    return fileId;
  }

  async deleteFile(id: string): Promise<void> {
    const current = this.cachedFiles$.getValue().filter((f) => this.matchId(f) !== id);
    this.cachedFiles$.next(current);
  }

  // A record saved before this field existed has no `id` in localStorage —
  // its `name` was the de facto unique key then, and the old code already
  // guaranteed that uniqueness, so it stays a safe stand-in until the next save.
  private matchId(cachedFile: CachedFile): string {
    return cachedFile.id ?? cachedFile.name;
  }

  getSyncError$(): Observable<Error | null> {
    return of(null);
  }
}

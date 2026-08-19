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
    return this.cachedFiles$.asObservable().pipe(map((files) => [...files]));
  }

  async saveFile(chordproContent: string): Promise<void> {
    const fileBaseName = ChordproUtil.buildFileBaseName(chordproContent);
    const current = [...this.cachedFiles$.getValue()].filter((f) => f.name !== fileBaseName);
    current.push({ name: fileBaseName, chordproContent, date: new Date() });
    this.cachedFiles$.next(current);
  }

  getSyncError$(): Observable<boolean> {
    return of(false);
  }
}

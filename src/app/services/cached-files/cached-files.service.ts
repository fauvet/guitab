import { inject, Injectable } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { map, Observable } from "rxjs";
import _ from "lodash";
import CachedFile from "../../types/cached-file.type";
import { LocalStorageService } from "../local-storage/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class CachedFilesService {
  private static readonly LOCAL_STORAGE_KEY = "CACHED_FILES";
  private static readonly DEFAULT_CACHED_FILES_VALUE = [] as CachedFile[];

  private readonly localStorageService = inject(LocalStorageService);
  private readonly cachedFiles$ = this.localStorageService.buildBehaviorSubject(
    CachedFilesService.LOCAL_STORAGE_KEY,
    CachedFilesService.DEFAULT_CACHED_FILES_VALUE,
    (key, value) => {
      if (key === "date") return new Date(value);
      return value;
    },
  );

  private getCachedFiles(): CachedFile[] {
    return [...this.cachedFiles$.getValue()];
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.cachedFiles$.asObservable().pipe(map((cachedFiles: CachedFile[]) => [...cachedFiles]));
  }

  saveFile(chordproContent: string): void {
    const fileBaseName = ChordproUtil.buildFileBaseName(chordproContent);
    const cachedFiles = this.getCachedFiles().filter((cachedFile) => cachedFile.name != fileBaseName);
    cachedFiles.push({
      name: fileBaseName,
      chordproContent,
      date: new Date(),
    });
    this.cachedFiles$.next(cachedFiles);
    localStorage[CachedFilesService.LOCAL_STORAGE_KEY] = JSON.stringify(cachedFiles);
  }
}

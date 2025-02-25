import { Injectable } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { BehaviorSubject, map, Observable } from "rxjs";
import _ from "lodash";
import CachedFile from "../../types/cached-file.type";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  private static readonly KEY_CACHED_FILES = "CACHED_FILES";
  private static readonly DEFAULT_CACHED_FILES_VALUE = "[]";

  static {
    localStorage[LocalStorageService.KEY_CACHED_FILES] =
      localStorage[LocalStorageService.KEY_CACHED_FILES] ?? LocalStorageService.DEFAULT_CACHED_FILES_VALUE;
  }

  private readonly cachedFiles$ = new BehaviorSubject(this.loadCachedFiles());

  private getCachedFiles(): CachedFile[] {
    return [...this.cachedFiles$.getValue()];
  }

  getCachedFiles$(): Observable<CachedFile[]> {
    return this.cachedFiles$.asObservable().pipe(map((cachedFiles: CachedFile[]) => [...cachedFiles]));
  }

  private loadCachedFiles(): CachedFile[] {
    try {
      return (JSON.parse(localStorage[LocalStorageService.KEY_CACHED_FILES]) as CachedFile[]).map((cachedFile) => ({
        name: cachedFile.name,
        chordproContent: cachedFile.chordproContent,
        date: new Date(cachedFile.date as unknown as string),
      }));
    } catch (error) {
      return [];
    }
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
    localStorage[LocalStorageService.KEY_CACHED_FILES] = JSON.stringify(cachedFiles);
  }
}

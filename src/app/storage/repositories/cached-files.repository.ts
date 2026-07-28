import { InjectionToken } from "@angular/core";
import { Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";

export interface ICachedFilesRepository {
  getCachedFiles$(): Observable<CachedFile[]>;
  saveFile(chordproContent: string): Promise<void>;
}

export const CACHED_FILES_REPOSITORY = new InjectionToken<ICachedFilesRepository>("ICachedFilesRepository");

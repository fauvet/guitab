import { Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";

export interface ICachedFilesRepository {
  getCachedFiles$(): Observable<CachedFile[]>;
  saveFile(chordproContent: string): Promise<void>;
  /** Whether the backend failed to keep the cached files list in sync. Local storage cannot fail this way. */
  getSyncError$(): Observable<boolean>;
}

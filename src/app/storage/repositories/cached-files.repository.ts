import { Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";

export interface ICachedFilesRepository {
  getCachedFiles$(): Observable<CachedFile[]>;
  /**
   * Rejects with a clear Error on failure — a caller-visible one-shot operation, never swallowed.
   * `fallbackName` is used only when the content has neither `{title:}` nor `{artist:}` — see
   * `ChordproUtil.buildFileBaseName()`.
   */
  saveFile(chordproContent: string, fallbackName?: string): Promise<void>;
  /** Rejects with a clear Error on failure — a caller-visible one-shot operation, never swallowed. */
  deleteFile(name: string): Promise<void>;
  /**
   * The live cachedFiles listener's status — null while it is in sync, the
   * Error it last reported otherwise. This reflects only the listener, not
   * `saveFile()`, whose failure travels by rejecting instead. Local storage has
   * no listener to fail this way.
   */
  getSyncError$(): Observable<Error | null>;
}

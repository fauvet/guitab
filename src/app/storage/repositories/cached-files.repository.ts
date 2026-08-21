import { Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";

export interface ICachedFilesRepository {
  getCachedFiles$(): Observable<CachedFile[]>;
  /**
   * Rejects with a clear Error on failure — a caller-visible one-shot operation, never swallowed.
   * `id` identifies which record to update — `null` for a file with no record yet, in which
   * case a new id is minted and returned. It must already be storage-safe (a generated id or one
   * read back from a record) — never a raw derived display name.
   * `fallbackName` is used only when the content has neither `{title:}` nor `{artist:}` — see
   * `ChordproUtil.buildFileBaseName()`.
   */
  saveFile(chordproContent: string, id: string | null, fallbackName?: string): Promise<string>;
  /** Rejects with a clear Error on failure — a caller-visible one-shot operation, never swallowed. */
  deleteFile(id: string): Promise<void>;
  /**
   * The live cachedFiles listener's status — null while it is in sync, the
   * Error it last reported otherwise. This reflects only the listener, not
   * `saveFile()`, whose failure travels by rejecting instead. Local storage has
   * no listener to fail this way.
   */
  getSyncError$(): Observable<Error | null>;
}

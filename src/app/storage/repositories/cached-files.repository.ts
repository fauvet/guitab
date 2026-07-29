import { Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";

export interface ICachedFilesRepository {
  getCachedFiles$(): Observable<CachedFile[]>;
  saveFile(chordproContent: string): Promise<void>;
}

import { Observable } from "rxjs";
import { FileTarget } from "../../types/file-target.type";

/** A file the user chose, with its content already read. */
export interface PickedFile {
  fileTarget: FileTarget;
  content: string;
}

/**
 * A save-as either produced a file we can write to again, or produced a file we
 * cannot reach any more, or produced nothing at all.
 *
 * The middle case is the browser download fallback: the bytes reached the disk,
 * so the document is saved and the unsaved-changes flag must clear, but there
 * is no handle to write through next time. Collapsing it into a boolean is what
 * would lose that distinction.
 */
export type SaveAsResult =
  | { readonly outcome: "saved"; readonly fileTarget: null | FileTarget }
  | { readonly outcome: "cancelled" };

export const SAVE_AS_CANCELLED: SaveAsResult = { outcome: "cancelled" };

/**
 * Reading and writing the ChordPro document the user is editing.
 *
 * Two implementations, chosen at runtime by `PlatformService`: the browser one
 * built on the File System Access API, and the Android one built on the
 * Capacitor filesystem plugin. Neither the editor nor the keyboard shortcuts
 * should know which is in play — that is the whole point of the interface.
 */
export interface IFileAccessRepository {
  /**
   * Whether the platform can put up its own file chooser. When it cannot, the
   * caller has to render an `<input type="file">` and hand its change event to
   * `openFile()`.
   */
  canPickOpen(): boolean;

  openFile(event: Event): Promise<null | PickedFile>;

  /** Writes over a file we already hold. Only ever called with a writable target. */
  writeFile(fileTarget: FileTarget, content: string): Promise<void>;

  saveFileAs(content: string, fileName: string): Promise<SaveAsResult>;

  /**
   * Files the host asked the app to open — a double-click on a `.cho` in the
   * desktop file manager, a tap on one in Android's.
   *
   * A stream rather than a promise because both platforms can deliver one at
   * launch and again later, against an app that is already running, and because
   * "no file" is an empty stream rather than a null anybody has to check.
   */
  getLaunchedFiles$(): Observable<PickedFile>;
}

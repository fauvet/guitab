import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import {
  IFileAccessRepository,
  PickedFile,
  SaveAsResult,
  SAVE_AS_CANCELLED,
} from "../repositories/file-access.repository";
import { FileTarget } from "../../types/file-target.type";
import { FileTargetUtil } from "../../utils/file-target.util";

/**
 * The Android strategy.
 *
 * The shape is the same as the browser one and the differences are all forced:
 * the host returns a `content://` URI rather than an object, reading it goes
 * through the filesystem plugin rather than a `FileReader`, and there is no
 * save-as dialog — a save-as writes into the shared Documents folder, which is
 * where a phone user expects to find a file another app can open.
 */
@Injectable({
  providedIn: "root",
})
export class NativeFileAccessRepository implements IFileAccessRepository {
  // Android has no concept of "the file types this app edits", and a ChordPro
  // file has no registered MIME type, so the picker is opened on everything and
  // the user is trusted to pick a song.
  private static readonly PICKER_MIME_TYPES = ["text/*", "application/octet-stream"];

  canPickOpen(): boolean {
    return true;
  }

  async openFile(): Promise<null | PickedFile> {
    const result = await FilePicker.pickFiles({
      types: NativeFileAccessRepository.PICKER_MIME_TYPES,
      limit: 1,
      readData: false,
    });

    const file = result.files[0];
    if (!file) return null;

    // Without a path there is nothing to read and nothing to write back to.
    // Returning an empty song here would look like the file opened and turned
    // out to be blank, which is the one thing a user cannot tell apart from
    // having lost it.
    if (!file.path) {
      throw new Error(`The file picker returned no path for "${file.name}".`);
    }

    const fileTarget = FileTargetUtil.fromNative(file.path, file.name);
    return { fileTarget, content: await this.readFile(file.path) };
  }

  /**
   * The native side of the manifest's intent filters: Android starts the app
   * with a `content://` URI when the user taps a `.cho` in a file manager, and
   * sends another one through `appUrlOpen` if the app is already running.
   *
   * `@capacitor/app` is imported dynamically so the browser bundle never
   * carries it — the stream is only ever subscribed on a device.
   */
  getLaunchedFiles$(): Observable<PickedFile> {
    return new Observable<PickedFile>((subscriber) => {
      let removeListener: null | (() => void) = null;

      const emit = async (url: string): Promise<void> => {
        const fileTarget = FileTargetUtil.fromNative(url, NativeFileAccessRepository.buildFileName(url));
        subscriber.next({ fileTarget, content: await this.readFile(url) });
      };

      const listen = async (): Promise<void> => {
        const { App } = await import("@capacitor/app");

        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) await emit(launchUrl.url);

        const handle = await App.addListener("appUrlOpen", (event) => {
          emit(event.url).catch((error: unknown) => subscriber.error(error));
        });
        removeListener = () => void handle.remove();
      };

      listen().catch((error: unknown) => subscriber.error(error));

      return () => removeListener?.();
    });
  }

  async writeFile(fileTarget: FileTarget, content: string): Promise<void> {
    if (fileTarget.kind !== "native") {
      throw new Error(`Android cannot write to a ${fileTarget.kind} target.`);
    }

    try {
      await Filesystem.writeFile({
        path: fileTarget.uri,
        data: content,
        encoding: Encoding.UTF8,
      });
    } catch (error: unknown) {
      throw new Error(`Could not save "${fileTarget.name}".`, { cause: error });
    }
  }

  async saveFileAs(content: string, fileName: string): Promise<SaveAsResult> {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    if (!result.uri) return SAVE_AS_CANCELLED;

    return { outcome: "saved", fileTarget: FileTargetUtil.fromNative(result.uri, fileName) };
  }

  /**
   * A content URI carries no file name of its own, so the last segment is the
   * best available guess. It is only ever used for display and for the
   * suggested name of a later save-as — the URI stays the identity.
   */
  private static buildFileName(uri: string): string {
    const lastSegment = uri.split("/").pop() ?? "";
    return decodeURIComponent(lastSegment) || "song.cho";
  }

  private async readFile(path: string): Promise<string> {
    const result = await Filesystem.readFile({ path, encoding: Encoding.UTF8 });

    // The plugin types `data` as `string | Blob` because it drops the encoding
    // and hands back a Blob on the web. Asking for UTF-8 on Android always
    // yields a string, but narrowing beats trusting the platform.
    return typeof result.data === "string" ? result.data : await result.data.text();
  }
}

import { Injectable } from "@angular/core";
import { EMPTY, Observable } from "rxjs";
import FileSaver from "file-saver";
import {
  IFileAccessRepository,
  PickedFile,
  SAVE_AS_CANCELLED,
  SaveAsResult,
} from "../repositories/file-access.repository";
import { FileTarget } from "../../types/file-target.type";
import { FileTargetUtil } from "../../utils/file-target.util";
import { FileUtil } from "../../utils/file.util";
import { ChordproUtil } from "../../utils/chordpro.util";

/**
 * The Launch Handler API, which delivers the files an installed PWA was opened
 * with. TypeScript's DOM library does not declare it, so the two members read
 * below are declared here rather than reached through `any`.
 */
interface LaunchParams {
  files?: FileSystemFileHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (launchParams: LaunchParams) => void): void;
}

/**
 * The browser strategy: the File System Access API where it exists, and an
 * `<input type="file">` plus a blob download everywhere else.
 *
 * This is the code that used to live inline in `KeyboardShortcutService`, moved
 * rather than rewritten — the point of the move is that a second strategy can
 * now exist beside it, not that this one should behave differently.
 */
@Injectable({
  providedIn: "root",
})
export class WebFileAccessRepository implements IFileAccessRepository {
  private static isUserCancelled(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  canPickOpen(): boolean {
    return "showOpenFilePicker" in window;
  }

  private canPickSave(): boolean {
    return "showSaveFilePicker" in window;
  }

  async openFile(event: Event): Promise<null | PickedFile> {
    let fileTarget: null | FileTarget;

    if (this.canPickOpen()) {
      try {
        const filePicker = await window.showOpenFilePicker({
          types: [
            {
              description: "ChordPro",
              accept: {
                "*/*": ChordproUtil.EXTENSIONS,
              },
            },
          ],
          multiple: false,
        });
        fileTarget = FileTargetUtil.fromHandle(filePicker[0]);
      } catch (error: unknown) {
        // Backing out of the picker is not a failure and must not surface as
        // one — null is how this interface says "nothing was opened".
        if (WebFileAccessRepository.isUserCancelled(error)) return null;
        throw new Error("Could not open the file picker.", { cause: error });
      }
    } else {
      const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;
      fileTarget = file === null ? null : FileTargetUtil.fromFile(file);
    }

    if (fileTarget === null) return null;

    const content = (await FileUtil.getFileContent(fileTarget)) ?? "";
    return { fileTarget, content };
  }

  getLaunchedFiles$(): Observable<PickedFile> {
    if (!("launchQueue" in window)) return EMPTY;

    // Read outside the subscriber: the `in` check above narrows `window` here,
    // and that narrowing does not survive into a callback.
    const launchQueue = window.launchQueue as unknown as LaunchQueue;

    return new Observable<PickedFile>((subscriber) => {
      // setConsumer takes the one consumer and has no way to remove it, so this
      // observable cannot be torn down. It is subscribed once, at startup, by a
      // root singleton — which is the only reason that is acceptable.
      launchQueue.setConsumer(async (launchParams) => {
        const handle = launchParams?.files?.[0];
        if (!handle) return;

        const fileTarget = FileTargetUtil.fromHandle(handle);
        subscriber.next({ fileTarget, content: (await FileUtil.getFileContent(fileTarget)) ?? "" });
      });
    });
  }

  async writeFile(fileTarget: FileTarget, content: string): Promise<void> {
    if (fileTarget.kind !== "web-handle") {
      throw new Error(`The browser cannot write to a ${fileTarget.kind} target.`);
    }

    try {
      const writable = await fileTarget.handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error: unknown) {
      throw new Error(`Could not save "${fileTarget.handle.name}".`, { cause: error });
    }
  }

  async saveFileAs(content: string, fileName: string): Promise<SaveAsResult> {
    if (this.canPickSave()) {
      let handle: FileSystemFileHandle;
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "ChordPro",
              accept: {
                "text/plain": ChordproUtil.EXTENSIONS,
              },
            },
          ],
        });
      } catch (error: unknown) {
        if (WebFileAccessRepository.isUserCancelled(error)) return SAVE_AS_CANCELLED;
        throw new Error("Could not open the save dialog.", { cause: error });
      }
      const fileTarget = FileTargetUtil.fromHandle(handle);
      await this.writeFile(fileTarget, content);
      return { outcome: "saved", fileTarget };
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, fileName);

    // The download fallback has no completion signal, so the only way to know
    // whether the file reached the disk is to ask. Deferring lets the browser
    // paint the download first — a confirm() raised before it would be asking
    // about something the user has not seen yet.
    return new Promise<SaveAsResult>((resolve) => {
      setTimeout(() => {
        if (!confirm("Please confirm that the file has been successfully downloaded.")) {
          resolve(SAVE_AS_CANCELLED);
          return;
        }

        // Saved, but through a download: there is nothing to write back to, so
        // the next save has to ask again.
        resolve({ outcome: "saved", fileTarget: null });
      });
    });
  }
}

import { FileTarget } from "../types/file-target.type";

/**
 * Everything the app needs to know about a `FileTarget` without touching the
 * platform: how to build one, what it is called, whether it can be written back
 * in place, and whether two of them are the same file.
 *
 * All four used to be spread across a service, a component and another util as
 * `instanceof` checks and property reads. Gathering them here is what makes the
 * WebView case testable — none of these methods needs a browser to run.
 */
export class FileTargetUtil {
  static fromFile(file: File): FileTarget {
    return { kind: "web-file", file };
  }

  static fromHandle(handle: FileSystemFileHandle): FileTarget {
    return { kind: "web-handle", handle };
  }

  static fromNative(uri: string, name: string): FileTarget {
    return { kind: "native", uri, name };
  }

  static getName(target: null | FileTarget): string {
    if (target === null) return "";

    switch (target.kind) {
      case "web-file":
        return target.file.name;
      case "web-handle":
        return target.handle.name;
      case "native":
        return target.name;
    }
  }

  /**
   * Whether writing to this file again can reuse what we already hold, rather
   * than asking the user where to put it.
   *
   * A `web-file` comes from an `<input type="file">` or from an asset, and the
   * browser deliberately gives no way to write back to it — hence save-as.
   */
  static isWritable(target: null | FileTarget): boolean {
    return target !== null && (target.kind === "web-handle" || target.kind === "native");
  }

  /**
   * Identity, not equality of content.
   *
   * The guards in `AppContextService.setFile()` and in
   * `areChordproSaveStatesEquals()` used to compare the handle by reference,
   * which stopped working the moment the handle was wrapped in a tagged object:
   * every call would have built a fresh wrapper and the guard would have let
   * every re-emission through. Comparing what is inside the wrapper restores
   * exactly the previous behaviour.
   */
  static areSame(target1: null | FileTarget, target2: null | FileTarget): boolean {
    if (target1 === null || target2 === null) return target1 === target2;

    switch (target1.kind) {
      case "web-file":
        return target2.kind === "web-file" && target1.file === target2.file;
      case "web-handle":
        return target2.kind === "web-handle" && target1.handle === target2.handle;
      case "native":
        return target2.kind === "native" && target1.uri === target2.uri;
    }
  }
}

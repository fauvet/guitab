import { FileTarget } from "../types/file-target.type";
import { FileTargetUtil } from "./file-target.util";

export class FileUtil {
  static async getFileContent(target: null | FileTarget): Promise<null | string> {
    if (target === null) return "";

    if (target.kind === "native") {
      // Reading a host URI needs the filesystem plugin, which is a side effect
      // and so not a util's business. The repository that picked the file has
      // the content already and passes it through; failing loudly here is the
      // only way that stays true, because a util returning "" would look like
      // an empty song.
      throw new Error("FileUtil cannot read a native file target — its content must come from the repository.");
    }

    // Resolving the handle before constructing the promise rather than inside
    // its executor: a rejection thrown by an async executor before the first
    // await is lost, so a failing getFile() would have hung the caller forever
    // instead of surfacing.
    const resolvedFile = target.kind === "web-handle" ? await target.handle.getFile() : target.file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const fileContent = event.target?.result as null | string;
        resolve(fileContent);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsText(resolvedFile, "UTF-8");
    });
  }

  static async loadSampleFile(): Promise<FileTarget> {
    return FileUtil.loadAssetFile("sample.cho");
  }

  static async loadEmptyFile(): Promise<FileTarget> {
    return FileUtil.loadAssetFile("empty.cho");
  }

  private static async loadAssetFile(fileName: string): Promise<FileTarget> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `./assets/${fileName}`);
      xhr.responseType = "blob";
      xhr.onload = () => {
        const blob = xhr.response;
        const file = new File([blob], fileName, {});
        resolve(FileTargetUtil.fromFile(file));
      };
      xhr.onerror = () => {
        reject(new Error(`Could not load asset "${fileName}".`));
      };
      xhr.send();
    });
  }
}

import FileSaver from "file-saver";

export class FileUtil {
  static downloadAsFile(content: string, fileName: string): void {
    FileUtil.downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName);
  }

  static downloadBlob(blob: Blob, fileName: string): void {
    FileSaver.saveAs(blob, fileName);
  }

  static isUserCancelledFilePicker(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  static canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }

  // The File System Access API is Chromium-only — Firefox, Safari and every
  // mobile browser never declare FileSystemFileHandle as a global at all, so
  // a bare `instanceof FileSystemFileHandle` throws a ReferenceError there
  // instead of just returning false. `typeof` is the one operator that never
  // throws on an undeclared identifier.
  static isFileSystemFileHandle(value: unknown): value is FileSystemFileHandle {
    return typeof FileSystemFileHandle !== "undefined" && value instanceof FileSystemFileHandle;
  }

  static async getFileContent(file: null | File | FileSystemFileHandle): Promise<null | string> {
    if (file === null) return "";

    // Resolving the handle before constructing the promise rather than inside
    // its executor: a rejection thrown by an async executor before the first
    // await is lost, so a failing getFile() would have hung the caller forever
    // instead of surfacing.
    const resolvedFile = FileUtil.isFileSystemFileHandle(file) ? await file.getFile() : file;

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

  static async loadSampleFile(): Promise<File> {
    return FileUtil.loadAssetFile("sample.cho");
  }

  static async loadEmptyFile(): Promise<File> {
    return FileUtil.loadAssetFile("empty.cho");
  }

  private static async loadAssetFile(fileName: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `./assets/${fileName}`);
      xhr.responseType = "blob";
      xhr.onload = () => {
        const blob = xhr.response;
        const file = new File([blob], fileName, {});
        resolve(file);
      };
      xhr.onerror = () => {
        reject(new Error(`Could not load asset "${fileName}".`));
      };
      xhr.send();
    });
  }
}

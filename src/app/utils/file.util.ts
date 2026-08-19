export class FileUtil {
  static async getFileContent(file: null | File | FileSystemFileHandle): Promise<null | string> {
    if (file === null) return "";

    // Resolving the handle before constructing the promise rather than inside
    // its executor: a rejection thrown by an async executor before the first
    // await is lost, so a failing getFile() would have hung the caller forever
    // instead of surfacing.
    const resolvedFile = file instanceof FileSystemFileHandle ? await file.getFile() : file;

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
      xhr.onerror = (error) => {
        reject(error);
      };
      xhr.send();
    });
  }
}

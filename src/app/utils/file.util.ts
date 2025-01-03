export class FileUtil {
  static async getFileContent(file: null | File | FileSystemFileHandle): Promise<null | string> {
    return new Promise(async (resolve, reject) => {
      if (file === null) {
        resolve("");
        return;
      }

      if (file instanceof FileSystemFileHandle) {
        file = await file.getFile();
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const fileContent = event.target?.result as null | string;
        resolve(fileContent);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsText(file, "UTF-8");
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

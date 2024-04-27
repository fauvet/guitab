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
}

import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from "@angular/material/dialog";
import { MatListModule } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatRipple } from "@angular/material/core";
import { firstValueFrom, map, Observable } from "rxjs";
import CachedFile from "../../types/cached-file.type";
import { CachedFilesService } from "../../services/cached-files/cached-files.service";
import { AppContextService } from "../../services/app-context/app-context.service";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { NotificationService } from "../../services/notification/notification.service";
import { ConfirmService } from "../../services/confirm/confirm.service";
import { ChordproUtil } from "../../utils/chordpro.util";
import { FileUtil } from "../../utils/file.util";
import DateUtil from "../../utils/date.util";
import { AlbumCoverComponent } from "../album-cover/album-cover.component";

@Component({
  selector: "app-dialog-file-gallery",
  imports: [
    AsyncPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatListModule,
    MatIcon,
    MatButtonModule,
    MatRipple,
    AlbumCoverComponent,
  ],
  templateUrl: "./dialog-file-gallery.component.html",
  styleUrl: "./dialog-file-gallery.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogFileGalleryComponent {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;
  readonly BUILD_TIME_AGO = DateUtil.buildTimeAgo;

  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly appContextService = inject(AppContextService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly dialogRef = inject(MatDialogRef<DialogFileGalleryComponent>);

  cachedFiles$: Observable<CachedFile[]> = this.cachedFilesService
    .getCachedFiles$()
    .pipe(
      map((cachedFiles) =>
        [...cachedFiles].sort((cachedFile1, cachedFile2) => cachedFile2.date.getTime() - cachedFile1.date.getTime()),
      ),
    );

  async onListItemOpenClicked(cachedFile: CachedFile): Promise<void> {
    try {
      await this.appContextService.setFileHandle(
        new File([cachedFile.chordproContent], "cached_file.cho", { type: "text/plain" }),
      );
      this.appContextService.setEditing(false);
      // Re-save with the entry's existing name as the fallback: if the
      // content still has no {title:}/{artist:} of its own, this keeps the
      // song under the identity it already has instead of collapsing it
      // (and any other untitled song) back to the generic default.
      await this.cachedFilesService.saveFile(cachedFile.chordproContent, cachedFile.name);

      this.dialogRef.close();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not open this file.");
    }
  }

  onButtonDownloadClicked(cachedFile: CachedFile, event: Event): void {
    event.stopPropagation();
    try {
      FileUtil.downloadAsFile(cachedFile.chordproContent, `${cachedFile.name}${ChordproUtil.PREFERRED_EXTENSION}`);
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError(`Could not download "${cachedFile.name}".`);
    }
  }

  async onButtonDownloadAllClicked(): Promise<void> {
    try {
      const cachedFiles = await firstValueFrom(this.cachedFiles$);
      if (cachedFiles.length === 0) return;

      const { zipSync, strToU8 } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      for (const cachedFile of cachedFiles) {
        files[`${cachedFile.name}${ChordproUtil.PREFERRED_EXTENSION}`] = strToU8(cachedFile.chordproContent);
      }
      const zipped = zipSync(files);

      FileUtil.downloadBlob(new Blob([zipped], { type: "application/zip" }), "songs.zip");
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not download your songs.");
    }
  }

  async onButtonDeleteClicked(cachedFile: CachedFile, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirmService.confirm(
      `Delete "${cachedFile.name}"? This cannot be undone.`,
      "Delete",
    );
    if (!confirmed) return;

    try {
      await this.cachedFilesService.deleteFile(cachedFile.name);
      this.notificationService.showSuccess(`"${cachedFile.name}" deleted.`);
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not delete the file.");
    }
  }

  canOpenFilePicker(): boolean {
    return this.keyboardShortcutService.canOpenFilePicker();
  }

  async onButtonImportClicked(event: Event): Promise<void> {
    try {
      const files = await this.pickFilesToImport(event);
      if (files.length === 0) return;

      let importedCount = 0;
      for (const file of files) {
        const content = await FileUtil.getFileContent(file);
        if (content === null) continue;
        // A file with no {title:}/{artist:} of its own falls back to its
        // original filename, so two untitled imports stay two distinct
        // entries instead of colliding on the same derived name.
        const fallbackName = file.name.replace(/\.[^./]+$/, "");
        await this.cachedFilesService.saveFile(content, fallbackName);
        importedCount++;
      }

      if (importedCount > 0) {
        this.notificationService.showSuccess(`${importedCount} file(s) imported.`);
      }
      if (importedCount < files.length) {
        this.notificationService.showError("Some files could not be imported.");
      }
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not import the files.");
    }
  }

  private async pickFilesToImport(event: Event): Promise<(File | FileSystemFileHandle)[]> {
    if (this.canOpenFilePicker()) {
      try {
        return await window.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: "ChordPro",
              accept: {
                "*/*": this.CHORDPRO_EXTENSIONS,
              },
            },
          ],
        });
      } catch (error: unknown) {
        if (FileUtil.isUserCancelledFilePicker(error)) return [];
        throw error;
      }
    }

    const input = event.target as HTMLInputElement;
    return Array.from(input.files ?? []);
  }
}

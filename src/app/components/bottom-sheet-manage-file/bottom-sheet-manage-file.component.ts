import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatListModule } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatRipple } from "@angular/material/core";
import { filter, map, Subject, takeUntil } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { NotificationService } from "../../services/notification/notification.service";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { AsyncPipe } from "@angular/common";
import { MatDividerModule } from "@angular/material/divider";
import CachedFile from "../../types/cached-file.type";
import DateUtil from "../../utils/date.util";
import { CachedFilesService } from "../../services/cached-files/cached-files.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogFileGalleryComponent } from "../dialog-file-gallery/dialog-file-gallery.component";
import { AlbumCoverComponent } from "../album-cover/album-cover.component";

@Component({
  selector: "app-bottom-sheet-manage-file",
  imports: [MatListModule, MatIcon, MatRipple, MatButtonModule, AsyncPipe, MatDividerModule, AlbumCoverComponent],
  templateUrl: "./bottom-sheet-manage-file.component.html",
  styleUrl: "./bottom-sheet-manage-file.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetManageFileComponent implements OnInit, OnDestroy {
  // Quick access is a fast shortcut to the last few songs, not the library —
  // the "Song library…" dialog is where every saved song lives.
  private static readonly MAX_RECENT_FILES = 5;

  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;
  readonly BUILD_TIME_AGO = DateUtil.buildTimeAgo;

  private readonly appContextService = inject(AppContextService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly chordproService = inject(ChordproService);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<BottomSheetManageFileComponent>);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  cachedFiles$ = this.cachedFilesService
    .getCachedFiles$()
    .pipe(
      map((cachedFiles: CachedFile[]) =>
        [...cachedFiles]
          .sort((cachedFile1, cachedFile2) => cachedFile2.date.getTime() - cachedFile1.date.getTime())
          .slice(0, BottomSheetManageFileComponent.MAX_RECENT_FILES),
      ),
    );

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.bottomSheetRef.afterDismissed().subscribe(() => {
      this.chordproService.requestEditorFocus();
    });

    this.cachedFilesService
      .getSyncError$()
      .pipe(
        filter((error): error is Error => error !== null),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((error) => {
        console.error(error);
        this.notificationService.showError(
          "Couldn't sync your recent files. Check your connection and try again later.",
        );
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  async onButtonNewFileClicked(): Promise<void> {
    try {
      const actionPerformed = await this.keyboardShortcutService.newFile();
      if (!actionPerformed) return;

      this.bottomSheetRef.dismiss();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not create a new file.");
    }
  }

  async onButtonOpenFileClicked(event: Event): Promise<void> {
    try {
      const actionPerformed = await this.keyboardShortcutService.openFile(event);
      if (!actionPerformed) return;

      this.bottomSheetRef.dismiss();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not open the file.");
    }
  }

  onButtonSongLibraryClicked(): void {
    this.bottomSheetRef.dismiss();
    this.dialog.open(DialogFileGalleryComponent, {
      height: "95%",
      width: "95%",
      panelClass: "dialog-panel-fill",
    });
  }

  async onButtonSaveFileClicked(): Promise<void> {
    try {
      const actionPerformed = await this.keyboardShortcutService.saveFile();
      if (!actionPerformed) return;

      this.notifySaved();
      this.bottomSheetRef.dismiss();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not save the file.");
    }
  }

  async onButtonSaveFileAsClicked(): Promise<void> {
    try {
      const actionPerformed = await this.keyboardShortcutService.saveFileAs();
      if (!actionPerformed) return;

      this.notifySaved();
      this.bottomSheetRef.dismiss();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not save the file.");
    }
  }

  async onButtonCachedFileClicked(cachedFile: CachedFile): Promise<void> {
    try {
      await this.appContextService.setFileHandle(
        new File([cachedFile.chordproContent], "cached_file.cho", {
          type: "text/plain",
        }),
      );
      this.appContextService.setEditing(false);
      // Re-save with the entry's existing name as the fallback: if the
      // content still has no {title:}/{artist:} of its own, this keeps the
      // song under the identity it already has instead of collapsing it
      // (and any other untitled song) back to the generic default.
      await this.cachedFilesService.saveFile(cachedFile.chordproContent, cachedFile.name);

      this.bottomSheetRef.dismiss();
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not open this file.");
    }
  }

  private notifySaved(): void {
    const fileName = ChordproUtil.buildFileName(this.chordproService.getChordproContent());
    this.notificationService.showSuccess(`${fileName} saved`);
  }

  canOpenFilePicker(): boolean {
    return this.keyboardShortcutService.canOpenFilePicker();
  }
}

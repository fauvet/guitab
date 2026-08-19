import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatListModule } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatRipple } from "@angular/material/core";
import { BehaviorSubject, filter, map, Subject, takeUntil } from "rxjs";
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
import { HttpClient } from "@angular/common/http";

export type CoveredCachedFile = CachedFile & { cover: string };

/** Only the members read below; the API returns a great deal more. */
interface LyricsSuggestResponse {
  data?: { album?: { cover_small?: string } }[];
}

@Component({
  selector: "app-bottom-sheet-manage-file",
  imports: [MatListModule, MatIcon, MatRipple, MatButtonModule, AsyncPipe, MatDividerModule],
  templateUrl: "./bottom-sheet-manage-file.component.html",
  styleUrl: "./bottom-sheet-manage-file.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetManageFileComponent implements OnInit, OnDestroy {
  private static readonly DEFAULT_ALBUM_COVER =
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png?20160131100336";

  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;
  readonly BUILD_TIME_AGO = DateUtil.buildTimeAgo;

  private readonly appContextService = inject(AppContextService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly chordproService = inject(ChordproService);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<BottomSheetManageFileComponent>);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  isSaveExistingFileEnabled$ = new BehaviorSubject(false);
  cachedFiles$ = this.cachedFilesService
    .getCachedFiles$()
    .pipe(
      map((cachedFiles: CachedFile[]) =>
        [...cachedFiles].sort((cachedFile1, cachedFile2) => cachedFile2.date.getTime() - cachedFile1.date.getTime()),
      ),
    );
  coveredCachedFiles$ = new BehaviorSubject<CoveredCachedFile[]>([]);

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.cachedFiles$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((cachedFiles) => this.onCachedFilesChanged(cachedFiles));

    this.appContextService
      .getFileHandleWithContent$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((fileHandleWithContent) => {
        const fileHandle = fileHandleWithContent?.fileHandle ?? null;
        this.isSaveExistingFileEnabled$.next(!!fileHandle && fileHandle instanceof FileSystemFileHandle);
      });

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

  private onCachedFilesChanged(cachedFiles: CachedFile[]): void {
    const coveredCachedFiles = cachedFiles.map(
      (cachedFile) =>
        ({ ...cachedFile, cover: BottomSheetManageFileComponent.DEFAULT_ALBUM_COVER }) as CoveredCachedFile,
    );
    this.coveredCachedFiles$.next([...coveredCachedFiles]);

    for (const coveredCachedFile of coveredCachedFiles) {
      const title = this.chordproService.parseTitle(coveredCachedFile.chordproContent);
      if (!title || coveredCachedFile.cover !== BottomSheetManageFileComponent.DEFAULT_ALBUM_COVER) continue;
      const encodedTitleWithoutAccents = encodeURIComponent(title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      this.http.get<LyricsSuggestResponse>(`https://api.lyrics.ovh/suggest/${encodedTitleWithoutAccents}`).subscribe({
        next: (res) => {
          const coverUrl = res?.data?.[0]?.album?.cover_small;
          coveredCachedFile.cover = coverUrl || BottomSheetManageFileComponent.DEFAULT_ALBUM_COVER;
          this.coveredCachedFiles$.next([...coveredCachedFiles]);
        },
        // The DEFAULT_ALBUM_COVER already covers the user — this is a cosmetic
        // lookup, not an action to interrupt with a notification.
        error: (error: unknown) => console.error(error),
      });
    }
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

  async onButtonSaveFileClicked(): Promise<void> {
    if (!this.isSaveExistingFileEnabled$.getValue()) return;

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
      await this.cachedFilesService.saveFile(cachedFile.chordproContent);

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

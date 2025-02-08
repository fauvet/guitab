import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatListModule } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatRipple } from "@angular/material/core";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut/keyboard-shortcut.service";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "app-bottom-sheet-manage-file",
  standalone: true,
  imports: [MatListModule, MatIcon, MatRipple, MatButtonModule, AsyncPipe],
  templateUrl: "./bottom-sheet-manage-file.component.html",
  styleUrl: "./bottom-sheet-manage-file.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetManageFileComponent implements OnInit, OnDestroy {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;

  private readonly appContextService = inject(AppContextService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private bottomSheetRef = inject(MatBottomSheetRef<BottomSheetManageFileComponent>);

  isSaveExistingFileEnabled$ = new BehaviorSubject(false);

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getFileHandle$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((fileHandle) =>
        this.isSaveExistingFileEnabled$.next(!!fileHandle && fileHandle instanceof FileSystemFileHandle),
      );
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  async onButtonNewFileClicked(): Promise<void> {
    const actionPerformed = await this.keyboardShortcutService.newFile();
    if (!actionPerformed) return;

    this.bottomSheetRef.dismiss();
  }

  async onButtonOpenFileClicked(event: Event): Promise<void> {
    const actionPerformed = await this.keyboardShortcutService.openFile(event);
    if (!actionPerformed) return;

    this.bottomSheetRef.dismiss();
  }

  async onButtonSaveFileClicked(): Promise<void> {
    if (!this.isSaveExistingFileEnabled$.getValue()) return;

    const actionPerformed = await this.keyboardShortcutService.saveFile();
    if (!actionPerformed) return;

    this.bottomSheetRef.dismiss();
  }

  async onButtonSaveFileAsClicked(): Promise<void> {
    const actionPerformed = await this.keyboardShortcutService.saveFileAs();
    if (!actionPerformed) return;

    this.bottomSheetRef.dismiss();
  }

  canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }
}

import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import FileSaver from "file-saver";
import { ChordproUtil } from "../../utils/chordpro.util";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { ToastrService } from "ngx-toastr";
import { FileUtil } from "../../utils/file.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatListModule } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatRipple } from "@angular/material/core";
import { Subject, takeUntil } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";

@Component({
  selector: "app-bottom-sheet-manage-file",
  standalone: true,
  imports: [MatListModule, MatIcon, MatRipple, MatButtonModule],
  templateUrl: "./bottom-sheet-manage-file.component.html",
  styleUrl: "./bottom-sheet-manage-file.component.css",
})
export class BottomSheetManageFileComponent implements OnInit, OnDestroy {
  readonly CHORDPRO_EXTENSIONS = ChordproUtil.EXTENSIONS;

  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly toastr = inject(ToastrService);
  private bottomSheetRef = inject(MatBottomSheetRef<BottomSheetManageFileComponent>);

  isSaveExistingFileEnabled = false;

  private readonly unsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getFileHandle$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(
        (fileHandle) => (this.isSaveExistingFileEnabled = !!fileHandle && fileHandle instanceof FileSystemFileHandle),
      );
  }
  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  async onButtonNewFileClicked(): Promise<void> {
    if (!this.checkUnsavedChanges()) return;

    this.bottomSheetRef.dismiss();

    const file = await FileUtil.loadEmptyFile();
    this.appContextService.setFileHandle(file);
  }

  async onButtonOpenFileClicked(event: Event): Promise<void> {
    if (!this.checkUnsavedChanges()) return;

    this.bottomSheetRef.dismiss();

    if (this.canOpenFilePicker()) {
      const filePicker = await window.showOpenFilePicker({
        types: [
          {
            description: "ChordPro",
            accept: {
              "text/plain": ChordproUtil.EXTENSIONS,
            },
          },
        ],
        multiple: false,
      });
      const fileHandle = filePicker[0];
      this.appContextService.setFileHandle(fileHandle);
      return;
    }

    const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;
    this.appContextService.setFileHandle(file);
  }

  async onButtonSaveFileClicked(): Promise<void> {
    if (!this.isSaveExistingFileEnabled) return;

    this.bottomSheetRef.dismiss();

    const fileHandle = this.appContextService.getFileHandle();
    if (!fileHandle || !(fileHandle instanceof FileSystemFileHandle)) {
      this.toastr.error("Unable to save");
      return;
    }

    const writable = await fileHandle.createWritable();
    const chordproContent = this.chordproService.getChordproContent();
    await writable.write(chordproContent);
    await writable.close();
    const fileName = fileHandle.name;
    this.toastr.success(`${fileName} saved`);
  }

  async onButtonSaveFileAsClicked(): Promise<void> {
    this.bottomSheetRef.dismiss();

    const chordproContent = this.chordproService.getChordproContent();
    const title = ChordproUtil.findTitle(chordproContent);
    const artist = ChordproUtil.findArtist(chordproContent);
    const fileName = `${title} (${artist})${ChordproUtil.PREFERRED_EXTENSION}`;
    const blob = new Blob([chordproContent], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, fileName);
  }

  private checkUnsavedChanges(): boolean {
    const hasUnsavedChanges = this.chordproService.getHasEditorUndo();
    return !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to discard them?");
  }

  canOpenFilePicker(): boolean {
    return "showOpenFilePicker" in window;
  }
}

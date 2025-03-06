import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { MatListModule } from "@angular/material/list";
import { MatDialog } from "@angular/material/dialog";
import { DialogExternalToolComponent } from "../dialog-external-tool/dialog-external-tool.component";
import { MatIcon } from "@angular/material/icon";
import { MatRipple } from "@angular/material/core";
import { DialogSoloTabEditorComponent } from "../dialog-solo-tab-editor/dialog-solo-tab-editor.component";

@Component({
  selector: "app-bottom-sheet-tools",
  standalone: true,
  imports: [MatListModule, MatIcon, MatRipple],
  templateUrl: "./bottom-sheet-tools.component.html",
  styleUrl: "./bottom-sheet-tools.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetToolsComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<BottomSheetToolsComponent>);
  private readonly dialog = inject(MatDialog);

  private openDialogExternalTool(url: string): void {
    this.bottomSheetRef.dismiss();
    this.dialog
      .open(DialogExternalToolComponent, {
        data: {
          src: url,
        },
        height: "95%",
        width: "95%",
      })
      .afterClosed()
      .subscribe(() => {});
  }

  onItemAllGuitarChordsComClicked(): void {
    this.bottomSheetRef.dismiss();
    window.open("https://www.all-guitar-chords.com/chords/identifier", "_blank");
  }

  onItemLyricsOvhClicked(): void {
    this.bottomSheetRef.dismiss();
    this.openDialogExternalTool("https://lyrics.ovh");
  }

  onItemSongBpmComClicked(): void {
    this.bottomSheetRef.dismiss();
    this.openDialogExternalTool("https://songbpm.com");
  }

  onItemYouTubeComClicked(): void {
    this.bottomSheetRef.dismiss();
    window.open("https://www.youtube.com", "_blank");
  }

  onItemSoloTabEditorClicked(): void {
    this.bottomSheetRef.dismiss();
    this.dialog
      .open(DialogSoloTabEditorComponent, {
        data: {},
        height: "95%",
        width: "95%",
      })
      .afterClosed()
      .subscribe(() => {});
  }
}

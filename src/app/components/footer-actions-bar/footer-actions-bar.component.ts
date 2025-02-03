import { Component, inject, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogSelectChordComponent } from "../dialog-select-chord/dialog-select-chord.component";
import { MatBottomSheet, MatBottomSheetModule } from "@angular/material/bottom-sheet";
import { BottomSheetInsertDirectiveComponent } from "../bottom-sheet-insert-directive/bottom-sheet-insert-directive.component";

@Component({
  selector: "app-footer-actions-bar",
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatBottomSheetModule],
  templateUrl: "./footer-actions-bar.component.html",
  styleUrl: "./footer-actions-bar.component.css",
})
export class FooterActionsBarComponent implements OnInit {
  private readonly chordproService = inject(ChordproService);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);

  isRemovableChordEnabled = false;

  ngOnInit(): void {
    this.chordproService
      .getIsRemovableChordEnabled$()
      .subscribe((isRemovableChordEnabled) => (this.isRemovableChordEnabled = isRemovableChordEnabled));
  }

  onButtonInsertDirectiveClicked(): void {
    this.bottomSheet.open(BottomSheetInsertDirectiveComponent);
  }

  onButtonInsertSpaceClicked(): void {
    this.chordproService.insertUnsecableSpace();
  }

  onButtonRemoveChordClicked(): void {
    this.chordproService.removeChord();
  }

  onButtonInsertChordClicked(): void {
    this.dialog
      .open(DialogSelectChordComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe(() => {});
  }

  onButtonDefineChordClicked(): void {
    throw new Error("Method not implemented.");
  }
}

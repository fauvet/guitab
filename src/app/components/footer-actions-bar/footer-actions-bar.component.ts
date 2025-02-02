import { Component, inject, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogSelectChordComponent } from "../dialog-select-chord/dialog-select-chord.component";

@Component({
  selector: "app-footer-actions-bar",
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: "./footer-actions-bar.component.html",
  styleUrl: "./footer-actions-bar.component.css",
})
export class FooterActionsBarComponent implements OnInit {
  private readonly chordproService = inject(ChordproService);
  private readonly dialog = inject(MatDialog);

  isRemovableChordEnabled = false;

  ngOnInit(): void {
    this.chordproService
      .getIsRemovableChordEnabled$()
      .subscribe((isRemovableChordEnabled) => (this.isRemovableChordEnabled = isRemovableChordEnabled));
  }

  onButtonRemoveChordClicked() {
    this.chordproService.removeChord();
  }

  onButtonInsertChordClicked() {
    this.dialog
      .open(DialogSelectChordComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe(() => {});
  }

  onButtonDefineChordClicked() {
    throw new Error("Method not implemented.");
  }
}

import { Component, inject, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-footer-actions-bar",
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: "./footer-actions-bar.component.html",
  styleUrl: "./footer-actions-bar.component.css",
})
export class FooterActionsBarComponent implements OnInit {
  private readonly chordproService = inject(ChordproService);

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
    throw new Error("Method not implemented.");
  }

  onButtonDefineChordClicked() {
    throw new Error("Method not implemented.");
  }
}

import { Component, inject, OnInit } from "@angular/core";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Chord } from "svguitar";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-dialog-diagram-chord",
  standalone: true,
  imports: [DiagramChordComponent, MatDialogModule, MatButtonModule],
  templateUrl: "./dialog-diagram-chord.component.html",
  styleUrl: "./dialog-diagram-chord.component.css",
})
export class DialogDiagramChordComponent implements OnInit {
  private readonly chordproService = inject(ChordproService);
  private readonly data = inject(MAT_DIALOG_DATA);

  chord: Chord = {
    barres: [],
    fingers: [],
  };

  ngOnInit(): void {
    const chordName = this.data.chordName;
    this.chord.title = chordName;
    this.initChord();
  }

  initChord(): void {
    const chordName = this.chord.title;
    if (!chordName) return;

    const chordproContent = this.chordproService.getChordproContent();
    this.chord = SvgGuitarUtil.buildChord(chordproContent, chordName) ?? this.chord;
  }
}

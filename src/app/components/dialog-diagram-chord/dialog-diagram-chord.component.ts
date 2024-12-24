import { Component, inject, OnInit } from "@angular/core";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import guitar from "../../../assets/guitar.json";
import Position from "../../types/position.type";

@Component({
  selector: "app-dialog-diagram-chord",
  standalone: true,
  imports: [DiagramChordComponent, MatDialogModule, MatButtonModule],
  templateUrl: "./dialog-diagram-chord.component.html",
  styleUrl: "./dialog-diagram-chord.component.css",
})
export class DialogDiagramChordComponent implements OnInit {
  private readonly data = inject(MAT_DIALOG_DATA);

  title = "";
  position: Position | null = null;

  ngOnInit(): void {
    const chordName = this.data.chordName;
    const chords = Object.values(guitar.chords).flatMap((e) => e);

    for (const chord of chords) {
      const currentChordName = chord.key + chord.suffix;
      if (currentChordName != chordName) continue;

      this.title = chordName;
      this.position = structuredClone(chord.positions[0] as Position);
    }
  }
}

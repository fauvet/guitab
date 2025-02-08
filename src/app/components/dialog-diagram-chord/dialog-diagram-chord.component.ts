import { ChangeDetectionStrategy, Component, inject, OnInit } from "@angular/core";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Chord } from "svguitar";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { BehaviorSubject } from "rxjs";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "app-dialog-diagram-chord",
  standalone: true,
  imports: [DiagramChordComponent, MatDialogModule, MatButtonModule, AsyncPipe],
  templateUrl: "./dialog-diagram-chord.component.html",
  styleUrl: "./dialog-diagram-chord.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogDiagramChordComponent implements OnInit {
  private readonly chordproService = inject(ChordproService);
  private readonly data = inject(MAT_DIALOG_DATA);

  chord$ = new BehaviorSubject<Chord>({
    barres: [],
    fingers: [],
  });

  ngOnInit(): void {
    const chordName = this.data.chordName;
    this.chord$.next(Object.assign({ title: chordName }, this.chord$.getValue()));
    this.initChord();
  }

  initChord(): void {
    const chordName = this.chord$.getValue().title;
    if (!chordName) return;

    const chordproContent = this.chordproService.getChordproContent();
    const newChord = SvgGuitarUtil.buildChord(chordproContent, chordName);
    if (!newChord) return;

    this.chord$.next(newChord);
  }
}

import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { Chord } from "svguitar";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";
import { ArrayUtil } from "../../utils/array.util";
import { MatButtonModule } from "@angular/material/button";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { AsyncPipe } from "@angular/common";
import _ from "lodash";

@Component({
  selector: "app-chordpro-chords-viewer",
  standalone: true,
  imports: [DiagramChordComponent, MatButtonModule, AsyncPipe],
  templateUrl: "./chordpro-chords-viewer.component.html",
  styleUrl: "./chordpro-chords-viewer.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordproChordsViewerComponent implements OnInit, OnDestroy {
  private readonly chordproService = inject(ChordproService);

  chords$ = new BehaviorSubject<Chord[]>([]);

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.chordproService
      .getChordproContent$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((chordproContent) => this.onChordproContentChanged(chordproContent));
  }

  private setChords(chords: Chord[]): void {
    if (_.isEqual(this.chords$.getValue(), chords)) return;
    this.chords$.next(chords);
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  onChordproContentChanged(chordproContent: string): void {
    const chordNames = ChordproUtil.findChordNames(chordproContent).flatMap(ArrayUtil.unique);
    const newChords = chordNames
      .map((chordName) => SvgGuitarUtil.buildChord(chordproContent, chordName))
      .filter((chord) => chord) as Chord[];
    this.setChords(newChords);
  }

  onDiagramChordClicked(chord: Chord): void {
    this.chordproService.insertChord(chord.title ?? "");
  }
}

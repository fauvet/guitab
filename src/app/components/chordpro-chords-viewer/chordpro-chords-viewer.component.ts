import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { BehaviorSubject, combineLatest, Subject, takeUntil } from "rxjs";
import { Chord } from "svguitar";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";
import { ArrayUtil } from "../../utils/array.util";
import { MatButtonModule } from "@angular/material/button";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { AsyncPipe } from "@angular/common";
import _ from "lodash";
import { InstrumentService } from "../../services/instrument/instrument.service";
import Instrument from "../../types/instrument.type";

@Component({
  selector: "app-chordpro-chords-viewer",
  imports: [DiagramChordComponent, MatButtonModule, AsyncPipe],
  templateUrl: "./chordpro-chords-viewer.component.html",
  styleUrl: "./chordpro-chords-viewer.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordproChordsViewerComponent implements OnInit, OnDestroy {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly instrumentService = inject(InstrumentService);

  chords$ = new BehaviorSubject<Chord[]>([]);
  readonly instrument$ = this.instrumentService.getInstrument$();

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    combineLatest([this.chordproService.getChordproContent$(), this.instrumentService.getInstrument$()])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([chordproContent, instrument]) => this.onChordproContentChanged(chordproContent, instrument));
  }

  private setChords(chords: Chord[]): void {
    if (_.isEqual(this.chords$.getValue(), chords)) return;
    this.chords$.next(chords);
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  onChordproContentChanged(chordproContent: string, instrument: Instrument): void {
    const chordNames = ChordproUtil.findChordNames(chordproContent).flatMap(ArrayUtil.unique);
    const newChords = chordNames
      .map((chordName) => SvgGuitarUtil.buildChord(chordproContent, chordName, instrument))
      .filter((chord) => chord) as Chord[];
    this.setChords(newChords);
  }

  onDiagramChordClicked(chord: Chord, fromMobile: boolean): void {
    if ((fromMobile && !this.appContextService.isEditing()) || !chord.title) return;
    this.chordproService.insertChord(chord.title);
  }
}

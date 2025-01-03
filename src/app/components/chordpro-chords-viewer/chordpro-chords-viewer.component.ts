import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { ChordproUtil } from "../../utils/chordpro.util";
import { AppContextService } from "../../services/app-context/app-context.service";
import { Subject, takeUntil } from "rxjs";
import { Chord } from "svguitar";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";

@Component({
  selector: "app-chordpro-chords-viewer",
  standalone: true,
  imports: [DiagramChordComponent],
  templateUrl: "./chordpro-chords-viewer.component.html",
  styleUrl: "./chordpro-chords-viewer.component.css",
})
export class ChordproChordsViewerComponent implements OnInit, OnDestroy {
  private readonly appContextService = inject(AppContextService);

  chords: Chord[] = [];

  private readonly unsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.appContextService
      .getChordproContent$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((chordproContent) => this.onChordproContentChanged(chordproContent));
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }
  onChordproContentChanged(chordproContent: string): void {
    const chordNames = ChordproUtil.findChordNames(chordproContent);
    this.chords = chordNames
      .map((chordName) => SvgGuitarUtil.buildChord(chordproContent, chordName))
      .filter((chord) => chord) as Chord[];
  }
}

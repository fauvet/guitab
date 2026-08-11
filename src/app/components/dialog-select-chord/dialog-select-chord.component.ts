import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from "@angular/core";
import ChordObject from "../../types/chord-object.type";
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import guitar from "../../../assets/guitar.json";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import Variant from "../../types/variant.type";
import { DiagramChordComponent } from "../diagram-chord/diagram-chord.component";
import { SvgGuitarUtil } from "../../utils/svg-guitar.util";
import { ChordproUtil } from "../../utils/chordpro.util";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { AsyncPipe } from "@angular/common";
import { MatRipple } from "@angular/material/core";

@Component({
    selector: "app-dialog-select-chord",
    imports: [
        AsyncPipe,
        MatRipple,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        MatButtonToggleModule,
        DiagramChordComponent,
    ],
    templateUrl: "./dialog-select-chord.component.html",
    styleUrl: "./dialog-select-chord.component.css",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSelectChordComponent implements OnInit, OnDestroy {
  readonly buildChordName = ChordproUtil.buildChordName;
  readonly toChord = SvgGuitarUtil.toChord;

  // guitar.json is data this app does not own, and TypeScript infers a shape
  // from it far more precise than the shape the code relies on — `fingers` is
  // an array of strings in most entries and of numbers in a few. Asserting the
  // contract once, here at the boundary, is the sanctioned place for a cast;
  // everything downstream then works with ChordObject.
  chordEntries = Object.entries(guitar.chords) as [string, ChordObject[]][];
  selectedKeyChordObjects$ = new BehaviorSubject<ChordObject[]>(this.chordEntries[0][1]);
  selectedChordObject$ = new BehaviorSubject(this.getDefaultChordObject());
  selectedChordVariant$ = new BehaviorSubject(this.getDefaultChordVariant());

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.selectedKeyChordObjects$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this.onSelectedKeyChordObjectsChanged());
    this.selectedChordObject$.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.onSelectedChordObjectChanged());
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  getDefaultChordObject(): ChordObject | null {
    return this.selectedKeyChordObjects$.getValue()?.[0] ?? null;
  }

  getDefaultChordVariant(): Variant | null {
    return this.selectedChordObject$.getValue()?.variants?.[0] ?? null;
  }

  setSelectedKeyChordObjects(selectedKeyChordObjects: ChordObject[]): void {
    if (selectedKeyChordObjects === this.selectedKeyChordObjects$.getValue()) return;
    this.selectedKeyChordObjects$.next(selectedKeyChordObjects);
  }

  setSelectedChordObject(selectedChordObject: ChordObject | null): void {
    if (selectedChordObject === this.selectedChordObject$.getValue()) return;
    this.selectedChordObject$.next(selectedChordObject);
  }

  setSelectedChordVariant(selectedChordVariant: Variant | null): void {
    if (selectedChordVariant === this.selectedChordVariant$.getValue()) return;
    this.selectedChordVariant$.next(selectedChordVariant);
  }

  onSelectedKeyChordObjectsChanged(): void {
    const suffix = this.selectedChordObject$.getValue()?.suffix;
    const newSelectedChordObject =
      this.selectedKeyChordObjects$.getValue().find((chordObject) => chordObject.suffix === suffix) ??
      this.getDefaultChordObject();
    this.setSelectedChordObject(newSelectedChordObject);
  }

  onSelectedChordObjectChanged(): void {
    this.setSelectedChordVariant(this.getDefaultChordVariant());
  }

  onButtonChordKeyClicked(keyChordObjects: ChordObject[]): void {
    this.setSelectedKeyChordObjects(keyChordObjects);
  }

  onButtonChordNameClicked(keyChordObject: ChordObject): void {
    this.setSelectedChordObject(keyChordObject);
  }

  onDiagramChordClicked(chordVariant: Variant): void {
    this.setSelectedChordVariant(chordVariant);
  }
}

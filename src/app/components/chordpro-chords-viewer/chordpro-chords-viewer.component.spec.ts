import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SVGuitarChord } from "svguitar";
import { ChordproChordsViewerComponent } from "./chordpro-chords-viewer.component";
import { InstrumentService } from "../../services/instrument/instrument.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";

describe("ChordproChordsViewerComponent", () => {
  let component: ChordproChordsViewerComponent;
  let fixture: ComponentFixture<ChordproChordsViewerComponent>;

  beforeEach(async () => {
    localStorage.clear();
    // jsdom's SVG support is too incomplete for svguitar's real renderer —
    // mock the draw chain rather than fight it, same as diagram-chord.component.spec.ts.
    vi.spyOn(SVGuitarChord.prototype, "configure").mockReturnThis();
    vi.spyOn(SVGuitarChord.prototype, "draw").mockReturnValue({ width: 0, height: 0 });

    await TestBed.configureTestingModule({
      imports: [ChordproChordsViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChordproChordsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should redraw the song's chords for the ukulele as soon as the instrument changes", () => {
    TestBed.inject(ChordproService).setChordproContent("[C]Hello [Am]world");
    const guitarChords = component.chords$.getValue();
    expect(guitarChords.map((chord) => chord.title)).toEqual(["C", "Am"]);

    TestBed.inject(InstrumentService).setInstrument("ukulele");

    const ukuleleChords = component.chords$.getValue();
    expect(ukuleleChords.map((chord) => chord.title)).toEqual(["C", "Am"]);
    expect(ukuleleChords[0].fingers).toEqual([[1, "3", "3"]]);
    expect(ukuleleChords).not.toEqual(guitarChords);
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { SVGuitarChord } from "svguitar";
import { DialogDiagramChordComponent } from "./dialog-diagram-chord.component";
import { ChordproService } from "../../services/chordpro/chordpro.service";

describe("DialogDiagramChordComponent", () => {
  let component: DialogDiagramChordComponent;
  let fixture: ComponentFixture<DialogDiagramChordComponent>;

  beforeEach(async () => {
    // jsdom's SVG support is too incomplete for svguitar's real renderer —
    // mock the draw chain rather than fight it, same as diagram-chord.component.spec.ts.
    vi.spyOn(SVGuitarChord.prototype, "configure").mockReturnThis();
    vi.spyOn(SVGuitarChord.prototype, "draw").mockReturnValue({ width: 0, height: 0 });

    await TestBed.configureTestingModule({
      imports: [DialogDiagramChordComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { chordName: "" } },
        // Only getChordproContent() is called — a full ChordproService would
        // transitively construct AuthService and attempt a real sign-in.
        { provide: ChordproService, useValue: { getChordproContent: vi.fn().mockReturnValue("") } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogDiagramChordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

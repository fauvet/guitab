import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SVGuitarChord } from "svguitar";

import { DialogSelectChordComponent } from "./dialog-select-chord.component";

describe("DialogSelectChordComponent", () => {
  let component: DialogSelectChordComponent;
  let fixture: ComponentFixture<DialogSelectChordComponent>;

  beforeEach(async () => {
    // jsdom's SVG support is too incomplete for svguitar's real renderer —
    // mock the draw chain rather than fight it, same as diagram-chord.component.spec.ts.
    vi.spyOn(SVGuitarChord.prototype, "configure").mockReturnThis();
    vi.spyOn(SVGuitarChord.prototype, "draw").mockReturnValue({ width: 0, height: 0 });

    await TestBed.configureTestingModule({
      imports: [DialogSelectChordComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogSelectChordComponent);
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

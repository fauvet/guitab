import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Chord, SVGuitarChord } from "svguitar";

import { DiagramChordComponent } from "./diagram-chord.component";

describe("DiagramChordComponent", () => {
  let component: DiagramChordComponent;
  let fixture: ComponentFixture<DiagramChordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramChordComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramChordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should log rather than throw when the chord cannot be drawn — a malformed {define:} is still being typed", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(SVGuitarChord.prototype, "draw").mockImplementation(() => {
      throw new Error("malformed chord");
    });

    component.chord = { fingers: [], barres: [] } as Chord;
    expect(() =>
      component.ngOnChanges({
        chord: { currentValue: component.chord, previousValue: null, firstChange: true, isFirstChange: () => true },
      }),
    ).not.toThrow();

    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
  });
});

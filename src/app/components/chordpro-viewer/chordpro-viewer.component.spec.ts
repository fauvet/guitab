import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChordproViewerComponent } from "./chordpro-viewer.component";

describe("ChordproViewerComponent", () => {
  let component: ChordproViewerComponent;
  let fixture: ComponentFixture<ChordproViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChordproViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChordproViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

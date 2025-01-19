import { ComponentFixture, TestBed } from "@angular/core/testing";

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

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChordproEditorComponent } from "./chordpro-editor.component";

describe("ChordproEditorComponent", () => {
  let component: ChordproEditorComponent;
  let fixture: ComponentFixture<ChordproEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChordproEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChordproEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

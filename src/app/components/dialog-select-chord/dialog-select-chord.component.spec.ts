import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogSelectChordComponent } from "./dialog-select-chord.component";

describe("DialogSelectChordComponent", () => {
  let component: DialogSelectChordComponent;
  let fixture: ComponentFixture<DialogSelectChordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSelectChordComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogSelectChordComponent);
    component = fixture.componentInstance;
    // The nested DiagramChordComponent resolves its host element by id
    // against the connected document once view init settles — without this
    // it stays a detached node and svguitar throws trying to render into it.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

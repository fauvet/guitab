import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogDiagramChordComponent } from "./dialog-diagram-chord.component";

describe("DialogDiagramChordComponent", () => {
  let component: DialogDiagramChordComponent;
  let fixture: ComponentFixture<DialogDiagramChordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogDiagramChordComponent, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: { chordName: "" } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogDiagramChordComponent);
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

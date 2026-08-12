import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogImportChordsOverLyricsComponent } from "./dialog-import-chords-over-lyrics.component";

describe("DialogImportChordsOverLyricsComponent", () => {
  let component: DialogImportChordsOverLyricsComponent;
  let fixture: ComponentFixture<DialogImportChordsOverLyricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogImportChordsOverLyricsComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: { close: () => {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogImportChordsOverLyricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialise with empty input and preview", () => {
    expect(component.input$.getValue()).toBe("");
    expect(component.preview$.getValue()).toBe("");
  });

  it("should update input BehaviorSubject on setInput()", () => {
    component.setInput("Am\nHello");
    expect(component.input$.getValue()).toBe("Am\nHello");
  });

  it("should not update input if the value is the same", () => {
    // TODO: Implement this test case
  });

  it("onInsertClicked() should close the dialog with the converted preview text", () => {
    // TODO: Implement this test case
  });

  it("onInsertClicked() should not close the dialog when preview is empty", () => {
    // TODO: Implement this test case
  });
});

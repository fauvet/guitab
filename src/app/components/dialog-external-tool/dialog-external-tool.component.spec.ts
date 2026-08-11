import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogExternalToolComponent } from "./dialog-external-tool.component";

describe("DialogExternalToolComponent", () => {
  let component: DialogExternalToolComponent;
  let fixture: ComponentFixture<DialogExternalToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogExternalToolComponent, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: { src: "" } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogExternalToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

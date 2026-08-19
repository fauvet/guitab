import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BottomSheetInsertDirectiveComponent } from "./bottom-sheet-insert-directive.component";

describe("BottomSheetInsertDirectiveComponent", () => {
  let component: BottomSheetInsertDirectiveComponent;
  let fixture: ComponentFixture<BottomSheetInsertDirectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetInsertDirectiveComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatBottomSheetRef,
          useValue: { dismiss: () => {}, afterDismissed: () => ({ subscribe: () => {} }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetInsertDirectiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

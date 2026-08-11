import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BottomSheetManageFileComponent } from "./bottom-sheet-manage-file.component";

describe("BottomSheetManageFileComponent", () => {
  let component: BottomSheetManageFileComponent;
  let fixture: ComponentFixture<BottomSheetManageFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetManageFileComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatBottomSheetRef,
          useValue: { dismiss: () => {}, afterDismissed: () => ({ subscribe: () => {} }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetManageFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

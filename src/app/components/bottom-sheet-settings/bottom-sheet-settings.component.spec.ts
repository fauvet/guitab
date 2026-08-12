import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BottomSheetSettingsComponent } from "./bottom-sheet-settings.component";

describe("BottomSheetSettingsComponent", () => {
  let component: BottomSheetSettingsComponent;
  let fixture: ComponentFixture<BottomSheetSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetSettingsComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatBottomSheetRef,
          useValue: { dismiss: () => {}, afterDismissed: () => ({ subscribe: () => {} }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

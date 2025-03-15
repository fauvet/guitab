import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheetSettingsComponent } from './bottom-sheet-settings.component';

describe('BottomSheetSettingsComponent', () => {
  let component: BottomSheetSettingsComponent;
  let fixture: ComponentFixture<BottomSheetSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BottomSheetSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

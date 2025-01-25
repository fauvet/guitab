import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheetManageFileComponent } from './bottom-sheet-manage-file.component';

describe('BottomSheetManageFileComponent', () => {
  let component: BottomSheetManageFileComponent;
  let fixture: ComponentFixture<BottomSheetManageFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetManageFileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BottomSheetManageFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

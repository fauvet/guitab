import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheetToolsComponent } from './bottom-sheet-tools.component';

describe('BottomSheetToolsComponent', () => {
  let component: BottomSheetToolsComponent;
  let fixture: ComponentFixture<BottomSheetToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetToolsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BottomSheetToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

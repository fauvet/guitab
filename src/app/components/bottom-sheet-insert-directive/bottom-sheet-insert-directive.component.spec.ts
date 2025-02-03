import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheetInsertDirectiveComponent } from './bottom-sheet-insert-directive.component';

describe('BottomSheetInsertDirectiveComponent', () => {
  let component: BottomSheetInsertDirectiveComponent;
  let fixture: ComponentFixture<BottomSheetInsertDirectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetInsertDirectiveComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BottomSheetInsertDirectiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

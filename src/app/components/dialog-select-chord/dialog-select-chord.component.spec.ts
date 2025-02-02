import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSelectChordComponent } from './dialog-select-chord.component';

describe('DialogSelectChordComponent', () => {
  let component: DialogSelectChordComponent;
  let fixture: ComponentFixture<DialogSelectChordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSelectChordComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogSelectChordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

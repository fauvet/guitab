import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDiagramChordComponent } from './dialog-diagram-chord.component';

describe('DialogDiagramChordComponent', () => {
  let component: DialogDiagramChordComponent;
  let fixture: ComponentFixture<DialogDiagramChordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogDiagramChordComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogDiagramChordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

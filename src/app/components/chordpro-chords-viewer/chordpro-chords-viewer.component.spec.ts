import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChordproChordsViewerComponent } from './chordpro-chords-viewer.component';

describe('ChordproChordsViewerComponent', () => {
  let component: ChordproChordsViewerComponent;
  let fixture: ComponentFixture<ChordproChordsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChordproChordsViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChordproChordsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

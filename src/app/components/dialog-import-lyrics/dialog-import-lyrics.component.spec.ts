import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogImportLyricsComponent } from './dialog-import-lyrics.component';

describe('DialogImportLyricsComponent', () => {
  let component: DialogImportLyricsComponent;
  let fixture: ComponentFixture<DialogImportLyricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogImportLyricsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogImportLyricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSoloTabEditorComponent } from './dialog-solo-tab-editor.component';

describe('DialogSoloTabEditorComponent', () => {
  let component: DialogSoloTabEditorComponent;
  let fixture: ComponentFixture<DialogSoloTabEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSoloTabEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogSoloTabEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

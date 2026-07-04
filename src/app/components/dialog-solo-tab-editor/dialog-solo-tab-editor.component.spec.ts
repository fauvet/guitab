import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogSoloTabEditorComponent } from './dialog-solo-tab-editor.component';

describe('DialogSoloTabEditorComponent', () => {
  let component: DialogSoloTabEditorComponent;
  let fixture: ComponentFixture<DialogSoloTabEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSoloTabEditorComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: { close: () => {} } }],
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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogExternalToolComponent } from './dialog-external-tool.component';

describe('DialogExternalToolComponent', () => {
  let component: DialogExternalToolComponent;
  let fixture: ComponentFixture<DialogExternalToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogExternalToolComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogExternalToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

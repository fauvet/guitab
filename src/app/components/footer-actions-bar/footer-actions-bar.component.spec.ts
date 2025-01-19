import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterActionsBarComponent } from './footer-actions-bar.component';

describe('FooterActionsBarComponent', () => {
  let component: FooterActionsBarComponent;
  let fixture: ComponentFixture<FooterActionsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterActionsBarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FooterActionsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

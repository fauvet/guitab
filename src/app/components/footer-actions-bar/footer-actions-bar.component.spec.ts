import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { FooterActionsBarComponent } from './footer-actions-bar.component';

describe('FooterActionsBarComponent', () => {
  let component: FooterActionsBarComponent;
  let fixture: ComponentFixture<FooterActionsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterActionsBarComponent, NoopAnimationsModule, MatIconTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterActionsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

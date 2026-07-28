import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { HeaderActionsBarComponent } from './header-actions-bar.component';

describe('HeaderActionsBarComponent', () => {
  let component: HeaderActionsBarComponent;
  let fixture: ComponentFixture<HeaderActionsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderActionsBarComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderActionsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

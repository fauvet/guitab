import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BottomSheetToolsComponent } from './bottom-sheet-tools.component';

describe('BottomSheetToolsComponent', () => {
  let component: BottomSheetToolsComponent;
  let fixture: ComponentFixture<BottomSheetToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetToolsComponent, NoopAnimationsModule],
      providers: [{ provide: MatBottomSheetRef, useValue: { dismiss: () => {}, afterDismissed: () => ({ subscribe: () => {} }) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DialogConfirmComponent, DialogConfirmData } from "./dialog-confirm.component";

describe("DialogConfirmComponent", () => {
  let component: DialogConfirmComponent;
  let fixture: ComponentFixture<DialogConfirmComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  async function setup(data: DialogConfirmData): Promise<void> {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DialogConfirmComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("shows the given message", async () => {
    await setup({ message: "Delete this song?" });

    expect(component.message).toBe("Delete this song?");
  });

  it("defaults the button labels when none are given", async () => {
    await setup({ message: "Are you sure?" });

    expect(component.confirmLabel).toBe("Confirm");
    expect(component.cancelLabel).toBe("Cancel");
  });

  it("uses the given button labels when provided", async () => {
    await setup({ message: "Delete this song?", confirmLabel: "Delete", cancelLabel: "Keep it" });

    expect(component.confirmLabel).toBe("Delete");
    expect(component.cancelLabel).toBe("Keep it");
  });

  it("closes with true when the confirm button is clicked", async () => {
    await setup({ message: "Are you sure?" });

    component.onButtonConfirmClicked();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});

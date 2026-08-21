import { TestBed } from "@angular/core/testing";
import { MatDialog } from "@angular/material/dialog";
import { of } from "rxjs";
import { ConfirmService } from "./confirm.service";
import { DialogConfirmComponent } from "../../components/dialog-confirm/dialog-confirm.component";

describe("ConfirmService", () => {
  let service: ConfirmService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockAfterClosed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAfterClosed = vi.fn();
    mockDialog = { open: vi.fn().mockReturnValue({ afterClosed: mockAfterClosed }) };

    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockDialog }],
    });
    service = TestBed.inject(ConfirmService);
  });

  it("opens DialogConfirmComponent with the given message and confirm label", async () => {
    mockAfterClosed.mockReturnValue(of(true));

    await service.confirm("Delete this song?", "Delete");

    expect(mockDialog.open).toHaveBeenCalledWith(DialogConfirmComponent, {
      data: { message: "Delete this song?", confirmLabel: "Delete" },
    });
  });

  it("resolves true when the dialog closes with true", async () => {
    mockAfterClosed.mockReturnValue(of(true));

    const result = await service.confirm("Are you sure?");

    expect(result).toBe(true);
  });

  it("resolves false when the dialog closes with undefined (cancel, backdrop click, or Escape)", async () => {
    mockAfterClosed.mockReturnValue(of(undefined));

    const result = await service.confirm("Are you sure?");

    expect(result).toBe(false);
  });
});

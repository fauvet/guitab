import { TestBed } from "@angular/core/testing";
import { MatSnackBar } from "@angular/material/snack-bar";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open: snackBarOpen } }],
    });
    service = TestBed.inject(NotificationService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should show an error with a dismiss action and a longer duration", () => {
    service.showError("Could not save the file.");

    expect(snackBarOpen).toHaveBeenCalledWith("Could not save the file.", "Dismiss", { duration: 5000 });
  });

  it("should show a success message with no action and a shorter duration", () => {
    service.showSuccess("song.cho saved");

    expect(snackBarOpen).toHaveBeenCalledWith("song.cho saved", undefined, { duration: 3000 });
  });
});

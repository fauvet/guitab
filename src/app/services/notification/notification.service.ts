import { inject, Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

/**
 * The only place `MatSnackBar` is allowed to appear — the same boundary
 * `FirebaseService` holds for Firebase and `PitchDetectionService` holds for Web
 * Audio, for the same reason: one narrow surface over an external API, kept
 * consistent (duration, dismiss action) so every caller does not have to get it
 * right on its own. Only components inject this; `services/` and `storage/`
 * never do, per "Errors are never swallowed" in
 * `engineering-principles.instructions.md`.
 */
@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  showError(message: string): void {
    this.snackBar.open(message, "Dismiss", { duration: 5000 });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }
}

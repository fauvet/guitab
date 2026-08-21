import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { DialogConfirmComponent } from "../../components/dialog-confirm/dialog-confirm.component";

/**
 * The only place `DialogConfirmComponent` is opened — the same boundary
 * `NotificationService` holds for `MatSnackBar`. `MatDialog` has no
 * string-only API the way `MatSnackBar` does, so this service is also the
 * one narrow, deliberate exception to `services/` never referencing
 * `components/`: opening a Material dialog structurally requires a
 * component class, and centralising it here is what keeps that reference
 * to exactly one file instead of one per caller.
 */
@Injectable({
  providedIn: "root",
})
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  async confirm(message: string, confirmLabel = "Confirm"): Promise<boolean> {
    const confirmed = await firstValueFrom(
      this.dialog.open(DialogConfirmComponent, { data: { message, confirmLabel } }).afterClosed(),
    );
    return !!confirmed;
  }
}

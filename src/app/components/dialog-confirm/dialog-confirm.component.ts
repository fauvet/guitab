import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";

export interface DialogConfirmData {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: "app-dialog-confirm",
  imports: [MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  templateUrl: "./dialog-confirm.component.html",
  styleUrl: "./dialog-confirm.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogConfirmComponent {
  private readonly data = inject<DialogConfirmData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DialogConfirmComponent, boolean>);

  readonly message = this.data.message;
  readonly confirmLabel = this.data.confirmLabel ?? "Confirm";
  readonly cancelLabel = this.data.cancelLabel ?? "Cancel";

  onButtonConfirmClicked(): void {
    this.dialogRef.close(true);
  }
}

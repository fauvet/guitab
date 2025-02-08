import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SafePipe } from "safe-pipe";

@Component({
  selector: "app-dialog-external-tool",
  standalone: true,
  imports: [SafePipe],
  templateUrl: "./dialog-external-tool.component.html",
  styleUrl: "./dialog-external-tool.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogExternalToolComponent {
  readonly data = inject(MAT_DIALOG_DATA);
}

import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";

@Component({
  selector: "app-dialog-import-lyrics",
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: "./dialog-import-lyrics.component.html",
  styleUrl: "./dialog-import-lyrics.component.css",
})
export class DialogImportLyricsComponent {
  search = "";

  onButtonImportClicked(): void {}
}

import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { MatRipple } from "@angular/material/core";
import { MatListModule } from "@angular/material/list";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-bottom-sheet-insert-directive",
  standalone: true,
  imports: [MatListModule, MatRipple],
  templateUrl: "./bottom-sheet-insert-directive.component.html",
  styleUrl: "./bottom-sheet-insert-directive.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetInsertDirectiveComponent {
  private chordproService = inject(ChordproService);
  private bottomSheetRef = inject(MatBottomSheetRef<BottomSheetInsertDirectiveComponent>);

  onButtonInsertCommentClicked(): void {
    this.chordproService.insertDirectiveComment();
    this.bottomSheetRef.dismiss();
  }

  onButtonInsertTabClicked(): void {
    this.chordproService.insertDirectiveTab();
    this.bottomSheetRef.dismiss();
  }

  onButtonInsertVerseClicked(): void {
    this.chordproService.insertDirectiveVerse();
    this.bottomSheetRef.dismiss();
  }

  onButtonInsertChorusClicked(): void {
    this.chordproService.insertDirectiveChorus();
    this.bottomSheetRef.dismiss();
  }

  onButtonInsertBridgeClicked(): void {
    this.chordproService.insertDirectiveBridge();
    this.bottomSheetRef.dismiss();
  }
}

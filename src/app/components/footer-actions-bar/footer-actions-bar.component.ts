import { Component, HostBinding, inject, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogSelectChordComponent } from "../dialog-select-chord/dialog-select-chord.component";
import { MatBottomSheet, MatBottomSheetModule } from "@angular/material/bottom-sheet";
import { BottomSheetInsertDirectiveComponent } from "../bottom-sheet-insert-directive/bottom-sheet-insert-directive.component";
import { AppContextService } from "../../services/app-context/app-context.service";
import { DomSanitizer, SafeResourceUrl, SafeUrl } from "@angular/platform-browser";

@Component({
  selector: "app-footer-actions-bar",
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatBottomSheetModule],
  templateUrl: "./footer-actions-bar.component.html",
  styleUrl: "./footer-actions-bar.component.css",
})
export class FooterActionsBarComponent implements OnInit {
  private readonly appContextService = inject(AppContextService);
  private readonly chordproService = inject(ChordproService);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly domSanitizer = inject(DomSanitizer);

  @HostBinding("class.is-editing")
  isEditing = false;

  isRemovableChordEnabled = false;
  youTubeUrl = "";

  ngOnInit(): void {
    this.appContextService.getIsEditing$().subscribe((isEditing) => (this.isEditing = isEditing));

    this.chordproService
      .getIsRemovableChordEnabled$()
      .subscribe((isRemovableChordEnabled) => (this.isRemovableChordEnabled = isRemovableChordEnabled));
    this.chordproService.getYouTubeUrl$().subscribe((youTubeUrl) => (this.youTubeUrl = youTubeUrl));
  }

  onButtonInsertDirectiveClicked(): void {
    this.bottomSheet.open(BottomSheetInsertDirectiveComponent);
  }

  onButtonInsertSpaceClicked(): void {
    this.chordproService.insertUnsecableSpace();
  }

  onButtonRemoveChordClicked(): void {
    this.chordproService.removeChord();
  }

  onButtonInsertChordClicked(): void {
    this.dialog.open(DialogSelectChordComponent, {
      data: {},
    });
  }

  onButtonDefineChordClicked(): void {
    throw new Error("Method not implemented.");
  }

  sanitizeYouTubeUrl(): SafeResourceUrl {
    const embedYouTubeUrl = this.youTubeUrl.replace("youtu.be/", "youtube.com/embed/").replace("/watch?v=", "embed/");
    return this.domSanitizer.bypassSecurityTrustResourceUrl(embedYouTubeUrl);
  }
}

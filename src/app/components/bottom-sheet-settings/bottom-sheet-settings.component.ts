import { Component, inject } from "@angular/core";
import { MatRipple } from "@angular/material/core";
import { MatIcon } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { AsyncPipe } from "@angular/common";
import { AppContextService } from "../../services/app-context/app-context.service";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";

@Component({
  selector: "app-bottom-sheet-settings",
  standalone: true,
  imports: [AsyncPipe, MatListModule, MatIcon, MatRipple],
  templateUrl: "./bottom-sheet-settings.component.html",
  styleUrl: "./bottom-sheet-settings.component.css",
})
export class BottomSheetSettingsComponent {
  public readonly appContextService = inject(AppContextService);
  public readonly chordproService = inject(ChordproService);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<BottomSheetSettingsComponent>);

  ngOnInit(): void {
    this.bottomSheetRef.afterDismissed().subscribe(() => {
      this.chordproService.requestEditorFocus();
    });
  }

  onItemShowLyricsClicked(): void {
    const areLyricsDisplayed = this.chordproService.areLyricsDisplayed();
    this.chordproService.setLyricsDisplayed(!areLyricsDisplayed);
  }

  onItemWakeLockClicked(): void {
    const isWakeLock = this.appContextService.isWakeLock();
    this.appContextService.setWakeLock(!isWakeLock);
  }

  onItemKeepBluetoothAliveClicked(): void {
    const isBluetoothKeptAlive = this.appContextService.isBluetoothKeptAlive();
    this.appContextService.setBluetoothKeptAlive(!isBluetoothKeptAlive);
  }
}

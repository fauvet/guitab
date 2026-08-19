import { Component, inject, ChangeDetectionStrategy, OnInit } from "@angular/core";
import { MatRipple } from "@angular/material/core";
import { MatIcon } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { AsyncPipe } from "@angular/common";
import { AppContextService } from "../../services/app-context/app-context.service";
import { WakeLockService } from "../../services/wake-lock/wake-lock.service";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { combineLatest, map, Observable } from "rxjs";

/**
 * "off" — the player has not asked for it.
 * "held" — asked for, and the browser is holding the lock.
 * "unheld" — asked for, and nothing is held: the request was refused, the API
 * is missing, or the lock has not been given back yet after the tab regained
 * focus. The setting used to look identical to "held" in that state.
 */
type WakeLockDisplay = "off" | "held" | "unheld";

@Component({
  selector: "app-bottom-sheet-settings",
  imports: [AsyncPipe, MatListModule, MatIcon, MatRipple],
  templateUrl: "./bottom-sheet-settings.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./bottom-sheet-settings.component.css",
})
export class BottomSheetSettingsComponent implements OnInit {
  public readonly appContextService = inject(AppContextService);
  public readonly chordproService = inject(ChordproService);
  public readonly wakeLockService = inject(WakeLockService);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<BottomSheetSettingsComponent>);

  // Read through the async pipe, so there is no subscription to tear down.
  public readonly wakeLockDisplay$: Observable<WakeLockDisplay> = combineLatest([
    this.appContextService.getIsWakeLock$(),
    this.wakeLockService.getIsKeptAwake$(),
  ]).pipe(
    map(([isRequested, isKeptAwake]): WakeLockDisplay => {
      if (!isRequested) return "off";
      return isKeptAwake ? "held" : "unheld";
    }),
  );

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

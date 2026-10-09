import { Component, inject, ChangeDetectionStrategy, OnInit } from "@angular/core";
import { MatRipple } from "@angular/material/core";
import { MatIcon } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { AsyncPipe } from "@angular/common";
import { AppContextService } from "../../services/app-context/app-context.service";
import { NotificationService } from "../../services/notification/notification.service";
import { WakeLockService } from "../../services/wake-lock/wake-lock.service";
import { InstrumentService } from "../../services/instrument/instrument.service";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { BehaviorSubject, combineLatest, map, Observable } from "rxjs";
import { AppUpdateService } from "../../services/app-update/app-update.service";
import packageJson from "../../../../package.json";

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
  public readonly instrumentService = inject(InstrumentService);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<BottomSheetSettingsComponent>);
  private readonly notificationService = inject(NotificationService);
  private readonly appUpdateService = inject(AppUpdateService);

  // package.json is the version semantic-release bumps, and the build reads it.
  readonly version = packageJson.version;
  readonly isCheckingForUpdate$ = new BehaviorSubject<boolean>(false);

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
    this.notificationService.showSuccess(areLyricsDisplayed ? "Lyrics hidden." : "Lyrics shown.");
  }

  onItemWakeLockClicked(): void {
    const isWakeLock = this.appContextService.isWakeLock();
    this.appContextService.setWakeLock(!isWakeLock);
    this.notificationService.showSuccess(isWakeLock ? "Wake lock disabled." : "Wake lock enabled.");
  }

  onItemKeepBluetoothAliveClicked(): void {
    const isBluetoothKeptAlive = this.appContextService.isBluetoothKeptAlive();
    this.appContextService.setBluetoothKeptAlive(!isBluetoothKeptAlive);
    this.notificationService.showSuccess(
      isBluetoothKeptAlive ? "Bluetooth keep-alive disabled." : "Bluetooth keep-alive enabled.",
    );
  }

  onItemUkuleleChordsClicked(): void {
    const isUkulele = this.instrumentService.getInstrument() === "ukulele";
    this.instrumentService.setInstrument(isUkulele ? "guitar" : "ukulele");
    this.notificationService.showSuccess(isUkulele ? "Guitar chords shown." : "Ukulele chords shown.");
  }

  async onItemCheckForUpdatesClicked(): Promise<void> {
    if (this.isCheckingForUpdate$.getValue()) return;
    this.isCheckingForUpdate$.next(true);

    try {
      const isUpdating = await this.appUpdateService.updateApp();
      // When it is, the page is already reloading into the new version.
      if (!isUpdating) this.notificationService.showSuccess("Already up to date.");
    } catch (error: unknown) {
      console.error(error);
      this.notificationService.showError("Could not check for updates.");
    } finally {
      this.isCheckingForUpdate$.next(false);
    }
  }
}

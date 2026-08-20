import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { BluetoothKeepAliveService } from "../bluetooth-keep-alive/bluetooth-keep-alive.service";
import { WakeLockService } from "../wake-lock/wake-lock.service";
import { FileUtil } from "../../utils/file.util";
import { FileTarget } from "../../types/file-target.type";
import { FileTargetUtil } from "../../utils/file-target.util";

export type FileWithContent = { fileTarget: null | FileTarget; content: string };

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private readonly bluetoothKeepAliveService = inject(BluetoothKeepAliveService);
  private readonly wakeLockService = inject(WakeLockService);

  private readonly fileWithContent$ = new BehaviorSubject<null | FileWithContent>(null);
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);
  private readonly isWakeLock$ = new BehaviorSubject<boolean>(false);
  private readonly isBluetoothKeptAlive$ = new BehaviorSubject<boolean>(false);

  // Both subscriptions live for the lifetime of the application: this service is
  // a root singleton and these two settings drive device state that has to
  // follow them until the tab closes. This is the sanctioned case for omitting
  // `takeUntil` — there is nothing to tear down before.
  constructor() {
    this.isWakeLock$.subscribe((isWakeLock) => this.wakeLockService.setKeptAwake(isWakeLock));
    this.isBluetoothKeptAlive$.subscribe((isBluetoothKeptAlive) =>
      this.bluetoothKeepAliveService.setKeptAlive(isBluetoothKeptAlive),
    );
  }

  getFileWithContent$(): Observable<null | FileWithContent> {
    return this.fileWithContent$.asObservable();
  }

  getFileWithContent(): null | FileWithContent {
    return this.fileWithContent$.getValue();
  }

  getIsEditing$(): Observable<boolean> {
    return this.isEditing$.asObservable();
  }

  isEditing(): boolean {
    return this.isEditing$.getValue();
  }

  getIsWakeLock$(): Observable<boolean> {
    return this.isWakeLock$.asObservable();
  }

  isWakeLock(): boolean {
    return this.isWakeLock$.getValue();
  }

  getIsBluetoothKeptAlive$(): Observable<boolean> {
    return this.isBluetoothKeptAlive$.asObservable();
  }

  isBluetoothKeptAlive(): boolean {
    return this.isBluetoothKeptAlive$.getValue();
  }

  /**
   * `content` is only ever supplied for a target a util cannot read — a native
   * URI, whose bytes the repository that picked it already holds. Leaving it out
   * keeps the web path exactly as it was.
   */
  async setFile(fileTarget: null | FileTarget, content?: string): Promise<void> {
    if (FileTargetUtil.areSame(fileTarget, this.getFileWithContent()?.fileTarget ?? null)) return;
    const resolvedContent = content ?? (await FileUtil.getFileContent(fileTarget)) ?? "";
    this.fileWithContent$.next({ fileTarget, content: resolvedContent });
  }

  setEditing(isEditing: boolean): void {
    if (isEditing == this.isEditing()) return;
    this.isEditing$.next(isEditing);
  }

  setWakeLock(isWakeLock: boolean): void {
    if (isWakeLock == this.isWakeLock()) return;
    this.isWakeLock$.next(isWakeLock);
  }

  setBluetoothKeptAlive(isBluetoothKeptAlive: boolean): void {
    if (isBluetoothKeptAlive == this.isBluetoothKeptAlive()) return;
    this.isBluetoothKeptAlive$.next(isBluetoothKeptAlive);
  }
}

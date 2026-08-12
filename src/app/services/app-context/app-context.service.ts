import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { BluetoothKeepAliveService } from "../bluetooth-keep-alive/bluetooth-keep-alive.service";
import { WakeLockUtil } from "../../utils/wake-lock.util";
import { FileUtil } from "../../utils/file.util";

export type FileHandleWithContent = { fileHandle: File | FileSystemFileHandle; content: string };

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private readonly bluetoothKeepAliveService = inject(BluetoothKeepAliveService);

  private readonly fileHandleWithContent$ = new BehaviorSubject<null | FileHandleWithContent>(null);
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);
  private readonly isWakeLock$ = new BehaviorSubject<boolean>(false);
  private readonly isBluetoothKeptAlive$ = new BehaviorSubject<boolean>(false);

  // Both subscriptions live for the lifetime of the application: this service is
  // a root singleton and these two settings drive device state that has to
  // follow them until the tab closes. This is the sanctioned case for omitting
  // `takeUntil` — there is nothing to tear down before.
  constructor() {
    this.isWakeLock$.subscribe((isWakeLock) => WakeLockUtil.setWakeLock(isWakeLock));
    this.isBluetoothKeptAlive$.subscribe((isBluetoothKeptAlive) =>
      this.bluetoothKeepAliveService.setKeptAlive(isBluetoothKeptAlive),
    );
  }

  getFileHandleWithContent$(): Observable<null | FileHandleWithContent> {
    return this.fileHandleWithContent$.asObservable();
  }

  getFileHandleWithContent(): null | FileHandleWithContent {
    return this.fileHandleWithContent$.getValue();
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

  async setFileHandle(fileHandle: null | File | FileSystemFileHandle): Promise<void> {
    if (fileHandle == this.getFileHandleWithContent()?.fileHandle) return;
    const content = await FileUtil.getFileContent(fileHandle);
    this.fileHandleWithContent$.next({ fileHandle, content } as FileHandleWithContent);
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

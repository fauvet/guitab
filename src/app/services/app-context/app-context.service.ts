import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { BluetoothUtil } from "../../utils/bluetooth.util";
import { WakeLockUtil } from "../../utils/wake-lock.util";

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private readonly fileHandle$ = new BehaviorSubject<null | File | FileSystemFileHandle>(null);
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);
  private readonly isWakeLock$ = new BehaviorSubject<boolean>(false);
  private readonly isBluetoothKeptAlive$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.isWakeLock$.subscribe((isWakeLock) => WakeLockUtil.setWakeLock(isWakeLock));
    this.isBluetoothKeptAlive$.subscribe((isBluetoothKeptAlive) =>
      BluetoothUtil.setBluetoothKeptAlive(isBluetoothKeptAlive),
    );
  }

  getFileHandle$(): Observable<null | File | FileSystemFileHandle> {
    return this.fileHandle$.asObservable();
  }

  getFileHandle(): null | File | FileSystemFileHandle {
    return this.fileHandle$.getValue();
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

  setFileHandle(fileHandle: null | File | FileSystemFileHandle): void {
    if (fileHandle == this.getFileHandle()) return;
    this.fileHandle$.next(fileHandle);
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

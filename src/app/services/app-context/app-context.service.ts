import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private readonly fileHandle$ = new BehaviorSubject<null | File | FileSystemFileHandle>(null);
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);

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

  setFileHandle(fileHandle: null | File | FileSystemFileHandle): void {
    if (fileHandle == this.getFileHandle()) return;
    this.fileHandle$.next(fileHandle);
  }

  setEditing(isEditing: boolean): void {
    if (isEditing == this.isEditing()) return;
    this.isEditing$.next(isEditing);
  }
}

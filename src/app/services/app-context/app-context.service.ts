import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private readonly fileHandle$ = new BehaviorSubject<null | FileSystemFileHandle>(null);
  private readonly file$ = new BehaviorSubject<null | File>(null);
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);

  getFileHandle$(): Observable<null | FileSystemFileHandle> {
    return this.fileHandle$.asObservable();
  }

  getFileHandle(): null | FileSystemFileHandle {
    return this.fileHandle$.getValue();
  }

  getFile$(): Observable<null | File> {
    return this.file$.asObservable();
  }

  getFile(): null | File {
    return this.file$.getValue();
  }

  getIsEditing$(): Observable<boolean> {
    return this.isEditing$.asObservable();
  }

  isEditing(): boolean {
    return this.isEditing$.getValue();
  }

  setFileHandle(fileHandle: null | FileSystemFileHandle): void {
    if (fileHandle == this.getFileHandle()) return;
    this.fileHandle$.next(fileHandle);
  }

  setFile(file: null | File): void {
    if (file == this.getFile()) return;
    this.file$.next(file);
  }

  setEditing(isEditing: boolean): void {
    if (isEditing == this.isEditing()) return;
    this.isEditing$.next(isEditing);
  }
}

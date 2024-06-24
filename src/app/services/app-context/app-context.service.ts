import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private fileHandle$ = new BehaviorSubject<null | FileSystemFileHandle>(null);
  private file$ = new BehaviorSubject<null | File>(null);
  private render$ = new Subject<void>();

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

  getRender$(): Observable<void> {
    return this.render$.asObservable();
  }

  setFileHandle(fileHandle: null | FileSystemFileHandle): void {
    this.fileHandle$.next(fileHandle);
  }

  setFile(file: null | File): void {
    this.file$.next(file);
  }

  updateRender(): void {
    this.render$.next();
  }
}

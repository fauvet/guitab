import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppContextService {
  private fileHandle$ = new BehaviorSubject<null | FileSystemFileHandle>(null);
  private render$ = new Subject<void>();

  setFileHandle(fileHandle: null | FileSystemFileHandle): void {
    this.fileHandle$.next(fileHandle);
  }

  updateRender(): void {
    this.render$.next();
  }

  getFileHandle$(): Observable<null | FileSystemFileHandle> {
    return this.fileHandle$.asObservable();
  }

  getFileHandle(): null | FileSystemFileHandle {
    return this.fileHandle$.getValue();
  }

  getRender$(): Observable<void> {
    return this.render$.asObservable();
  }
}

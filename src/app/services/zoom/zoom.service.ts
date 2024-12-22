import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ZoomService {
  private static readonly LOCAL_STORAGE_KEY = "ZoomService-ZOOM-VALUE";
  private static readonly STEP_RATIO = 0.1;
  private static readonly DEFAULT_VALUE = 1;
  private static readonly MIN_VALUE = 0.5;
  private static readonly MAX_VALUE = 2;

  private zoom$ = new BehaviorSubject<number>(ZoomService.DEFAULT_VALUE);

  constructor() {
    const localStorageZoom = localStorage.getItem(ZoomService.LOCAL_STORAGE_KEY);
    const zoom = Number(localStorageZoom) || ZoomService.DEFAULT_VALUE;
    this.setZoom(zoom);
    this.getZoom$().subscribe((zoom) => this.onZoomChanged(zoom));
  }

  getZoom$(): Observable<number> {
    return this.zoom$.asObservable();
  }

  getZoom(): number {
    return this.zoom$.getValue();
  }

  private setZoom(zoom: number): void {
    if (zoom < ZoomService.MIN_VALUE) zoom = ZoomService.MIN_VALUE;
    if (zoom > ZoomService.MAX_VALUE) zoom = ZoomService.MAX_VALUE;
    localStorage.setItem(ZoomService.LOCAL_STORAGE_KEY, String(zoom));
    this.zoom$.next(zoom);
  }

  incrementZoom(): void {
    let zoom = this.getZoom();
    zoom *= 1 + ZoomService.STEP_RATIO;
    this.setZoom(zoom);
  }

  decrementZoom(): void {
    let zoom = this.getZoom();
    zoom *= 1 - ZoomService.STEP_RATIO;
    this.setZoom(zoom);
  }

  resetZoom(): void {
    this.setZoom(ZoomService.DEFAULT_VALUE);
  }

  onZoomChanged(zoom: number): void {
    const htmlElement = document.getElementsByTagName("html")[0];
    htmlElement.style.fontSize = `${zoom}rem`;
  }
}

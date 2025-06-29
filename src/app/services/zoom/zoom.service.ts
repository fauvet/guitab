import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { LocalStorageService } from "../local-storage/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class ZoomService {
  private static readonly LOCAL_STORAGE_KEY = "ZoomService-ZOOM-STEP-VALUE";
  private static readonly DEFAULT_VALUE = 0;
  private static readonly STEP_RATIO = 0.1;
  private static readonly MIN_VALUE = -10;
  private static readonly MAX_VALUE = 10;

  private readonly localStorageService = inject(LocalStorageService);
  private readonly zoomStep$ = this.localStorageService.buildBehaviorSubject(
    ZoomService.LOCAL_STORAGE_KEY,
    ZoomService.DEFAULT_VALUE,
  );

  constructor() {
    this.setZoomStep(this.getZoomStep()); // ensure min max zoom values are respected
    this.getZoomStep$().subscribe((zoom) => this.onZoomChanged(zoom));
  }

  private getZoomStep$(): Observable<number> {
    return this.zoomStep$.asObservable();
  }

  private getZoomStep(): number {
    return this.zoomStep$.getValue();
  }

  private setZoomStep(zoomStep: number): void {
    if (zoomStep < ZoomService.MIN_VALUE) zoomStep = ZoomService.MIN_VALUE;
    if (zoomStep > ZoomService.MAX_VALUE) zoomStep = ZoomService.MAX_VALUE;
    this.zoomStep$.next(zoomStep);
  }

  incrementZoom(): void {
    let zoomStep = this.getZoomStep();
    this.setZoomStep(zoomStep + 1);
  }

  decrementZoom(): void {
    let zoomStep = this.getZoomStep();
    this.setZoomStep(zoomStep - 1);
  }

  resetZoom(): void {
    this.setZoomStep(ZoomService.DEFAULT_VALUE);
  }

  onZoomChanged(zoomStep: number): void {
    const html = document.documentElement;
    const zoom = Math.pow(1 + Math.sign(zoomStep) * ZoomService.STEP_RATIO, Math.abs(zoomStep));
    html.style.fontSize = `${zoom}rem`;
  }
}

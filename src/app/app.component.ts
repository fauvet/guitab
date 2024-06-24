import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ActionsBarComponent } from "./components/actions-bar/actions-bar.component";
import { ChordproEditorComponent } from "./components/chordpro-editor/chordpro-editor.component";
import { ChordproViewerComponent } from "./components/chordpro-viewer/chordpro-viewer.component";
import { AppContextService } from "./services/app-context/app-context.service";
import { ZoomService } from "./services/zoom/zoom.service";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [RouterOutlet, ActionsBarComponent, ChordproEditorComponent, ChordproViewerComponent],
})
export class AppComponent implements OnInit, AfterViewInit {
  title = "guitab";

  @ViewChild("containerChordpro") containerChordpro: undefined | ElementRef<HTMLDivElement>;

  constructor(
    private appContextService: AppContextService,
    private zoomService: ZoomService,
  ) {}

  ngOnInit(): void {
    if ("launchQueue" in window) {
      (window.launchQueue as unknown as any).setConsumer(async (launchParams: any) => {
        if (!launchParams?.files?.length) return;
        const fileHandle = launchParams.files[0];
        this.appContextService.setFileHandle(fileHandle);
      });
    }

    this.zoomService.getZoom$().subscribe((zoom) => this.onZoomChanged(zoom));
  }

  ngAfterViewInit(): void {
    const zoom = this.zoomService.getZoom();
    this.onZoomChanged(zoom);
  }

  onZoomChanged(zoom: number): void {
    if (!this.containerChordpro) return;
    (this.containerChordpro.nativeElement.style as any).zoom = zoom + "%";
  }
}

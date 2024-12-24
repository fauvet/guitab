import { Component, ElementRef, HostBinding, OnInit, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ActionsBarComponent } from "./components/actions-bar/actions-bar.component";
import { ChordproEditorComponent } from "./components/chordpro-editor/chordpro-editor.component";
import { ChordproViewerComponent } from "./components/chordpro-viewer/chordpro-viewer.component";
import { AppContextService } from "./services/app-context/app-context.service";
import { DiagramChordComponent } from "./components/diagram-chord/diagram-chord.component";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [RouterOutlet, ActionsBarComponent, ChordproEditorComponent, ChordproViewerComponent, DiagramChordComponent],
})
export class AppComponent implements OnInit {
  @HostBinding("class.is-editing")
  isEditing = false;

  title = "guitab";

  @ViewChild("containerChordpro") containerChordpro: undefined | ElementRef<HTMLDivElement>;

  constructor(private appContextService: AppContextService) {}

  ngOnInit(): void {
    this.handleLaunchQueue();
    this.loadSampleFile();
    this.appContextService.getIsEditing$().subscribe((isEditing) => (this.isEditing = isEditing));
  }

  private handleLaunchQueue(): void {
    if (!("launchQueue" in window)) return;

    (window.launchQueue as unknown as any).setConsumer(async (launchParams: any) => {
      if (!launchParams?.files?.length) return;
      const fileHandle = launchParams.files[0];
      this.appContextService.setFileHandle(fileHandle);
    });
  }

  private loadSampleFile(): void {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "./assets/sample.cho");
    xhr.responseType = "blob";
    xhr.onload = () => {
      const blob = xhr.response;
      const file = new File([blob], "sample.cho", {});
      this.appContextService.setFile(file);
    };
    xhr.send();
  }
}

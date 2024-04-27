import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ActionsBarComponent } from "./actions-bar/actions-bar.component";
import { ChordproEditorComponent } from "./chordpro-editor/chordpro-editor.component";
import { ChordproViewerComponent } from "./chordpro-viewer/chordpro-viewer.component";
import { AppContextService } from "./app-context.service";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [RouterOutlet, ActionsBarComponent, ChordproEditorComponent, ChordproViewerComponent],
})
export class AppComponent implements OnInit {
  title = "guitab";

  constructor(private appContextService: AppContextService) {}

  ngOnInit(): void {
    if ("launchQueue" in window) {
      (window.launchQueue as unknown as any).setConsumer(async (launchParams: any) => {
        if (!launchParams?.files?.length) return;
        const fileHandle = launchParams.files[0];
        this.appContextService.setFileHandle(fileHandle);
      });
    }
  }
}

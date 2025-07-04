import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, inject, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, RouterOutlet } from "@angular/router";
import { ChordproEditorComponent } from "./components/chordpro-editor/chordpro-editor.component";
import { ChordproViewerComponent } from "./components/chordpro-viewer/chordpro-viewer.component";
import { AppContextService } from "./services/app-context/app-context.service";
import { DiagramChordComponent } from "./components/diagram-chord/diagram-chord.component";
import { FileUtil } from "./utils/file.util";
import { ChordproChordsViewerComponent } from "./components/chordpro-chords-viewer/chordpro-chords-viewer.component";
import { HeaderActionsBarComponent } from "./components/header-actions-bar/header-actions-bar.component";
import { FooterActionsBarComponent } from "./components/footer-actions-bar/footer-actions-bar.component";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import { MaterialIconsUtil } from "./utils/material-icons.util";
import { KeyboardShortcutService } from "./services/keyboard-shortcut/keyboard-shortcut.service";
import { BeforeUnloadService } from "./services/before-unload/before-unload.service";
import { empty } from "rxjs";
import { ChordproService } from "./services/chordpro/chordpro.service";

@Component({
  selector: "app-root",
  standalone: true,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [
    RouterOutlet,
    ChordproEditorComponent,
    ChordproViewerComponent,
    DiagramChordComponent,
    ChordproChordsViewerComponent,
    HeaderActionsBarComponent,
    FooterActionsBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly appContextService = inject(AppContextService);
  private readonly keyboardShortcutService = inject(KeyboardShortcutService);
  private readonly beforeUnloadService = inject(BeforeUnloadService);
  private readonly chordproService = inject(ChordproService);
  private readonly matIconRegistry = inject(MatIconRegistry);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly acivatedRoute = inject(ActivatedRoute);

  @HostBinding("class.is-editing")
  isEditing = false;

  @ViewChild("containerChordpro") containerChordpro: undefined | ElementRef<HTMLDivElement>;

  constructor() {
    MaterialIconsUtil.registerIcons(this.matIconRegistry, this.domSanitizer);
    this.keyboardShortcutService.initialize();
    this.beforeUnloadService.initialize();
  }

  ngOnInit(): void {
    this.handleLaunchQueue();
    this.appContextService.getIsEditing$().subscribe((isEditing) => (this.isEditing = isEditing));
    this.acivatedRoute.queryParamMap.subscribe(async (params) => {
      const loadValue = params.get("load");
      const isDemo = loadValue === "demo";
      this.appContextService.setEditing(!isDemo);

      if (isDemo) {
        const demoFile = await FileUtil.loadSampleFile();
        await this.appContextService.setFileHandle(demoFile);
        return;
      }

      const draftUnsavedChordproContent = this.beforeUnloadService.findDraftUnsavedChordproContent();
      const emptyFile = await FileUtil.loadEmptyFile();
      await this.appContextService.setFileHandle(emptyFile);

      if (draftUnsavedChordproContent) {
        this.chordproService.setChordproContent(draftUnsavedChordproContent);
      }
    });
  }

  private handleLaunchQueue(): void {
    if (!("launchQueue" in window)) return;

    (window.launchQueue as unknown as any).setConsumer(async (launchParams: any) => {
      if (!launchParams?.files?.length) return;
      const fileHandle = launchParams.files[0];
      await this.appContextService.setFileHandle(fileHandle);
      this.appContextService.setEditing(false);
    });
  }
}

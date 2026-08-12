import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, inject, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, RouterOutlet } from "@angular/router";
import { ChordproEditorComponent } from "./components/chordpro-editor/chordpro-editor.component";
import { ChordproViewerComponent } from "./components/chordpro-viewer/chordpro-viewer.component";
import { AppContextService } from "./services/app-context/app-context.service";
import { FileUtil } from "./utils/file.util";
import { ChordproChordsViewerComponent } from "./components/chordpro-chords-viewer/chordpro-chords-viewer.component";
import { HeaderActionsBarComponent } from "./components/header-actions-bar/header-actions-bar.component";
import { FooterActionsBarComponent } from "./components/footer-actions-bar/footer-actions-bar.component";
import { AppFooterComponent } from "./components/app-footer/app-footer.component";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import { MaterialIconsUtil } from "./utils/material-icons.util";
import { KeyboardShortcutService } from "./services/keyboard-shortcut/keyboard-shortcut.service";
import { BeforeUnloadService } from "./services/before-unload/before-unload.service";
import { ChordproService } from "./services/chordpro/chordpro.service";

/**
 * The Launch Handler API, which delivers the files a PWA was opened with.
 * TypeScript's DOM library does not declare it yet, so the two members this
 * app reads are declared here rather than reached through `any`.
 */
interface LaunchParams {
  files?: FileSystemFileHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (launchParams: LaunchParams) => void): void;
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [
    RouterOutlet,
    ChordproEditorComponent,
    ChordproViewerComponent,
    ChordproChordsViewerComponent,
    HeaderActionsBarComponent,
    FooterActionsBarComponent,
    AppFooterComponent,
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
  private readonly activatedRoute = inject(ActivatedRoute);

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
    this.activatedRoute.queryParamMap.subscribe(async (params) => {
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

    const launchQueue = window.launchQueue as unknown as LaunchQueue;
    launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams?.files?.length) return;
      const fileHandle = launchParams.files[0];
      await this.appContextService.setFileHandle(fileHandle);
      this.appContextService.setEditing(false);
    });
  }
}

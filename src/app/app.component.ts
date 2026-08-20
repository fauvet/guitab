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
import { CachedFilesService } from "./services/cached-files/cached-files.service";
import { NotificationService } from "./services/notification/notification.service";

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
  private readonly cachedFilesService = inject(CachedFilesService);
  private readonly notificationService = inject(NotificationService);
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
    this.keyboardShortcutService.openLaunchedFiles();
    this.appContextService.getIsEditing$().subscribe((isEditing) => (this.isEditing = isEditing));

    // This root component is never destroyed, so — like the two subscriptions
    // above — this one is not torn down either; see AppContextService for the
    // same reasoning applied to its own constructor subscriptions.
    this.keyboardShortcutService.getFileActionOutcome$().subscribe((outcome) => {
      if (outcome.type === "saved") {
        this.notificationService.showSuccess(`${outcome.fileName} saved`);
        return;
      }
      console.error(outcome.error);
      this.notificationService.showError("Could not complete the file action. Please try again.");
    });

    this.activatedRoute.queryParamMap.subscribe(async (params) => {
      const loadValue = params.get("load");
      const isDemo = loadValue === "demo";
      this.appContextService.setEditing(!isDemo);

      try {
        if (isDemo) {
          const demoFile = await FileUtil.loadSampleFile();
          await this.appContextService.setFile(demoFile);
          return;
        }

        const draftUnsavedChordproContent = this.beforeUnloadService.findDraftUnsavedChordproContent();
        const emptyFile = await FileUtil.loadEmptyFile();
        await this.appContextService.setFile(emptyFile);

        if (draftUnsavedChordproContent) {
          this.chordproService.setChordproContent(draftUnsavedChordproContent);
        }
      } catch (error: unknown) {
        console.error(error);
        this.notificationService.showError("Could not load the song.");
      }
    });
  }
}

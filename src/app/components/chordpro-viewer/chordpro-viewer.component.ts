import { Component, ElementRef, OnDestroy, OnInit, Renderer2 } from "@angular/core";
import * as ChordProjectParser from "chordproject-parser";
import { AppContextService } from "../../services/app-context/app-context.service";
import { Subject, takeUntil } from "rxjs";
import { FileUtil } from "../../utils/file.util";
import { ChordproEditorComponent } from "../chordpro-editor/chordpro-editor.component";
import { MatDialog } from "@angular/material/dialog";
import { DialogDiagramChordComponent } from "../dialog-diagram-chord/dialog-diagram-chord.component";

@Component({
  selector: "app-chordpro-viewer",
  standalone: true,
  imports: [],
  templateUrl: "./chordpro-viewer.component.html",
  styleUrl: "./chordpro-viewer.component.css",
})
export class ChordproViewerComponent implements OnInit, OnDestroy {
  private unsubscribe = new Subject<void>();

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private appContextService: AppContextService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.appContextService
      .getFileHandle$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((fileHandle) => this.onFileChanged(fileHandle));

    this.appContextService
      .getFile$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((file) => this.onFileChanged(file));

    this.appContextService
      .getRender$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(() => this.onRenderRequired());

    this.listenChordClick();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  static convertChordSheetToHtml(chordSheet: string): string {
    const chordParser = new ChordProjectParser.ChordProParser();
    const song = chordParser.parse(chordSheet);
    // const transposedSong = ChordProjectParser.Transposer.transpose(
    //   song,
    //   new ChordProjectParser.MusicNote(ChordProjectParser.MusicLetter.A, ChordProjectParser.MusicAccidental["#"]),
    // );

    const settings = new ChordProjectParser.FormatterSettings();
    settings.showMetadata = true;
    settings.showTabs = true;
    settings.useSimpleChord = false;
    settings.showChords = true;

    const formatter = new ChordProjectParser.HtmlFormatter(settings);
    const html = formatter.format(song);
    return html.join("");
  }

  private listenChordClick(): void {
    const listener = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.classList.contains("chord")) return;

      const chordName = target.innerText;
      this.onChordClicked(chordName);
    };

    document.addEventListener("click", listener);
    this.unsubscribe.subscribe(() => document.removeEventListener("click", listener));
  }

  render(fileContent: null | string): void {
    const hostElement = this.elementRef.nativeElement;
    const html = ChordproViewerComponent.convertChordSheetToHtml(fileContent ?? "");
    this.renderer.setProperty(hostElement, "innerHTML", html);
  }

  async onFileChanged(fileHandle: null | File | FileSystemFileHandle): Promise<void> {
    const fileContent = await FileUtil.getFileContent(fileHandle);
    this.render(fileContent);
  }

  onRenderRequired(): void {
    const editorContent = ChordproEditorComponent.getEditorContent();
    this.render(editorContent);
  }

  onChordClicked(chordName: string): void {
    this.dialog
      .open(DialogDiagramChordComponent, {
        data: {
          chordName,
        },
      })
      .afterClosed()
      .subscribe(() => {});
  }
}

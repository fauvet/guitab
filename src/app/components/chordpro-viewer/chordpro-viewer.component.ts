import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, Renderer2 } from "@angular/core";
import * as ChordProjectParser from "chordproject-parser";
import { Subject, takeUntil } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { DialogDiagramChordComponent } from "../dialog-diagram-chord/dialog-diagram-chord.component";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-chordpro-viewer",
  standalone: true,
  imports: [],
  templateUrl: "./chordpro-viewer.component.html",
  styleUrl: "./chordpro-viewer.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordproViewerComponent implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly chordproService = inject(ChordproService);
  private readonly dialog = inject(MatDialog);

  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.chordproService
      .getChordproContent$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((chordproContent) => this.onChordproContentChanged(chordproContent));

    this.listenChordClick();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  private static convertChordSheetToHtml(chordSheet: string): string {
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

  private updateMaxChordWidth(): void {
    const spans: HTMLSpanElement[] = this.elementRef.nativeElement.querySelectorAll("span.above-lyrics.chord");

    const maxChordLength = Array.from(spans).reduce((maxWidth, span) => {
      const chordLength = span.innerText.length;
      return Math.max(maxWidth, chordLength);
    }, 1);

    const maxChordWidth = maxChordLength * 10;
    document.documentElement.style.setProperty("--max-chord-width", `${maxChordWidth}px`);
  }

  private listenChordClick(): void {
    const listener = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.classList.contains("chord")) return;

      const chordName = target.innerText;
      this.onChordClicked(chordName);
    };

    document.addEventListener("click", listener);
    this.unsubscribe$.subscribe(() => document.removeEventListener("click", listener));
  }

  onChordproContentChanged(chordproContent: string): void {
    const hostElement = this.elementRef.nativeElement;
    const html = ChordproViewerComponent.convertChordSheetToHtml(chordproContent);
    this.renderer.setProperty(hostElement, "innerHTML", html);

    this.updateMaxChordWidth();
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

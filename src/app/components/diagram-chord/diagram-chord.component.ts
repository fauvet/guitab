import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { Chord, ChordStyle, FretLabelPosition, Orientation, Shape, SVGuitarChord } from "svguitar";

@Component({
  selector: "app-diagram-chord",
  standalone: true,
  imports: [],
  templateUrl: "./diagram-chord.component.html",
  styleUrl: "./diagram-chord.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramChordComponent implements AfterViewInit, OnChanges {
  @HostBinding("attr.id")
  htmlId = `${DiagramChordComponent.name}_${Math.floor(100000000 + Math.random() * 900000000)}`;

  @Input()
  chord: Chord | null = null;
  @Input()
  size: "s" | "m" | "l" = "l";

  ngAfterViewInit(): void {
    this.buildSvg();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["chord"]) {
      this.chord = changes["chord"].currentValue;
    }

    this.buildSvg();
  }

  @HostBinding("class")
  private get sizeClass(): string {
    return this.size == "s" ? "small" : this.size == "m" ? "medium" : "large";
  }

  async buildSvg(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const htmlElement = document.getElementById(this.htmlId);

        if (htmlElement) {
          htmlElement.innerHTML = "";
        }

        if (this.chord == null) {
          return;
        }

        new SVGuitarChord(`#${this.htmlId}`)
          .chord(this.chord)
          .configure({
            orientation: Orientation.vertical,
            style: ChordStyle.normal,
            strings: 6,
            frets: 4,
            position: 1,
            tuning: [],
            fretLabelPosition: FretLabelPosition.RIGHT,
            fretLabelFontSize: 38,
            tuningsFontSize: 28,
            fingerSize: 0.9,
            fingerColor: "#000",
            fingerTextColor: "#FFF",
            fingerTextSize: 36,
            fingerStrokeColor: "#000000",
            fingerStrokeWidth: 0,
            barreChordStrokeColor: "#000000",
            barreChordStrokeWidth: 0,
            fretSize: 1.5,
            sidePadding: 0.2,
            fontFamily: "sans-serif",
            titleFontSize: 48,
            titleBottomMargin: 0,
            color: "#000000",
            backgroundColor: "none",
            barreChordRadius: 0.25,
            emptyStringIndicatorSize: 0.6,
            strokeWidth: 2,
            nutWidth: 10,
            noPosition: false,
            titleColor: "#000000",
            stringColor: "#000000",
            fretLabelColor: "#000000",
            tuningsColor: "#000000",
            fretColor: "#000000",
            fixedDiagramPosition: false,
            watermark: "",
            watermarkFontSize: 12,
            watermarkColor: "#000000",
            watermarkFontFamily: "sans-serif",
            svgTitle: "Guitar chord diagram",
            fretMarkers: [
              2,
              4,
              6,
              8,
              {
                fret: 11,
                double: true,
              },
            ],
            showFretMarkers: true,
            fretMarkerShape: Shape.CIRCLE,
            fretMarkerSize: 0.4,
            fretMarkerColor: "rgba(0, 0, 0, 0.2)",
            fretMarkerStrokeColor: "#000000",
            fretMarkerStrokeWidth: 0,
            doubleFretMarkerDistance: 0.4,
          })
          .draw();

        resolve();
      });
    });
  }
}

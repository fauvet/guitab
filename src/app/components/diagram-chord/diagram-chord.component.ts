import { AfterViewInit, Component, Host, HostBinding, Input, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { ChordStyle, Finger, FretLabelPosition, Orientation, Shape, SVGuitarChord } from "svguitar";
import Position from "../../types/position.type";

@Component({
  selector: "app-diagram-chord",
  standalone: true,
  imports: [],
  templateUrl: "./diagram-chord.component.html",
  styleUrl: "./diagram-chord.component.css",
})
export class DiagramChordComponent implements AfterViewInit, OnChanges {
  @HostBinding("attr.id")
  htmlId = `${DiagramChordComponent.name}_${Math.floor(100000000 + Math.random() * 900000000)}`;

  @Input()
  title = "";
  @Input()
  position: Position | null = null;

  ngAfterViewInit(): void {
    this.buildSvg();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["title"]) {
      this.title = changes["title"].currentValue;
    } else if (changes["position"]) {
      this.position = changes["position"].currentValue;
    }

    this.buildSvg();
  }

  async buildSvg(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const htmlElement = document.getElementById(this.htmlId);

        if (htmlElement) {
          htmlElement.innerHTML = "";
        }

        if (this.position == null) {
          return;
        }

        const fingers: Finger[] = [];
        for (const index in this.position.fingers) {
          const string = 6 - Number(index);
          const finger = this.position.fingers[index];
          if (finger == 0) continue;

          const fret = this.position.frets[index];
          fingers.push([string, fret, String(finger)]);
        }

        new SVGuitarChord(`#${this.htmlId}`)
          .chord({
            fingers: fingers,
            barres: [
              // {
              //   fromString: 5,
              //   toString: 1,
              //   fret: 1,
              //   text: "1",
              // },
            ],
            title: this.title,
            position: this.position.baseFret,
          })
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
            fingerSize: 0.65,
            fingerColor: "#000",
            fingerTextColor: "#FFF",
            fingerTextSize: 22,
            fingerStrokeColor: "#000000",
            fingerStrokeWidth: 0,
            barreChordStrokeColor: "#000000",
            barreChordStrokeWidth: 0,
            fretSize: 1.5,
            sidePadding: 0.2,
            fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
            title: "F# minor",
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
            watermarkFontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
            svgTitle: "Guitar chord diagram of F# minor",
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

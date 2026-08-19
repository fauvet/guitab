import { PitchTraceUtil } from "./pitch-trace.util";
import { PitchUtil } from "./pitch.util";

const frame = (midi: number | null, timeMs: number) => ({
  timeMs,
  frequency: midi === null ? 0 : PitchUtil.midiToFrequency(midi),
  isOnset: false,
});

describe("PitchTraceUtil", () => {
  const viewport = { width: 300, height: 100, lowestMidi: 48, highestMidi: 72, windowMs: 5000 };

  describe("toSegments", () => {
    it("should draw nothing when nothing has been heard", () => {
      expect(PitchTraceUtil.toSegments([], viewport)).toEqual([]);
    });

    it("should draw one continuous segment for a continuous sound", () => {
      const segments = PitchTraceUtil.toSegments([frame(60, 0), frame(60, 100), frame(60, 200)], viewport);

      expect(segments).toHaveLength(1);
      expect(segments[0].split(" ")).toHaveLength(3);
    });

    // A break in the line is how a reader sees where one note ended and the
    // next began. Joining across silence would draw a slide that never happened.
    it("should break the line where the sound stopped", () => {
      const segments = PitchTraceUtil.toSegments(
        [frame(60, 0), frame(60, 100), frame(null, 200), frame(62, 300), frame(62, 400)],
        viewport,
      );

      expect(segments).toHaveLength(2);
    });

    it("should drop a lone point, which cannot be drawn as a line", () => {
      expect(PitchTraceUtil.toSegments([frame(60, 0)], viewport)).toEqual([]);
    });

    it("should place a higher note higher on the screen", () => {
      const [low] = PitchTraceUtil.toSegments([frame(50, 0), frame(50, 100)], viewport);
      const [high] = PitchTraceUtil.toSegments([frame(70, 0), frame(70, 100)], viewport);

      const yOf = (segment: string): number => Number(segment.split(" ")[0].split(",")[1]);
      // SVG y grows downwards, so a higher pitch has the smaller y.
      expect(yOf(high)).toBeLessThan(yOf(low));
    });

    it("should keep every point inside the viewport", () => {
      const segments = PitchTraceUtil.toSegments([frame(30, 0), frame(100, 100)], viewport);

      segments
        .flatMap((segment) => segment.split(" "))
        .forEach((point) => {
          const [x, y] = point.split(",").map(Number);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(viewport.width);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(viewport.height);
        });
    });

    // The trace scrolls: the newest sound is at the right edge, and anything
    // older than the window has left the screen.
    it("should put the most recent sound at the right edge", () => {
      const segments = PitchTraceUtil.toSegments([frame(60, 0), frame(60, 4000)], viewport);
      const points = segments[0].split(" ");
      const lastX = Number(points[points.length - 1].split(",")[0]);

      expect(lastX).toBeCloseTo(viewport.width, 5);
    });

    it("should discard what has scrolled off the left", () => {
      const segments = PitchTraceUtil.toSegments(
        [frame(60, 0), frame(60, 100), frame(60, 20000), frame(60, 20100)],
        viewport,
      );

      expect(segments.flatMap((segment) => segment.split(" "))).toHaveLength(2);
    });
  });

  describe("gridLines", () => {
    it("should place a line on every C in the visible range", () => {
      const lines = PitchTraceUtil.gridLines(viewport);

      expect(lines.map((line) => line.label)).toEqual(["C3", "C4", "C5"]);
    });

    it("should place the higher octave higher on the screen", () => {
      const [c3, c4] = PitchTraceUtil.gridLines(viewport);

      // Ascending pitch, and SVG y grows downwards.
      expect(c4.y).toBeLessThan(c3.y);
    });
  });
});

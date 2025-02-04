import Variant from "../types/variant.type";
import { NumberUtil } from "./number.util";
import { StringUtil } from "./string.util";

export class ChordproUtil {
  static readonly EXTENSIONS: `.${string}`[] = [".cho", ".crd", ".chopro", ".chord", ".pro"];
  static readonly PREFERRED_EXTENSION = ChordproUtil.EXTENSIONS[0];

  static buildChordName(chordObject: any): string {
    if (!chordObject) return "";
    return chordObject.key + chordObject.suffix;
  }

  static findTitle(chordproContent: string): string | null {
    return /{title:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }

  static findArtist(chordproContent: string): string | null {
    return /{artist:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }

  static findCustomVariant(chordproContent: string, chordName: string): Variant | null {
    const escapedChordName = StringUtil.escapeRegExp(chordName);
    const regex = new RegExp(
      `\\{define\\s*:\\s*${escapedChordName} base-fret (\\d+) frets (.+?)( fingers (.+?))?\\s*\\}`,
    );
    const match = chordproContent.match(regex);
    if (!match) return null;

    const baseFret = Number(match[1]);
    const frets = Object.assign(Array(6), match[2].split(" ").slice(0, 6)).map((fret) =>
      NumberUtil.isNaN(fret) || fret < 0 ? "x" : fret,
    );
    const fingers = Object.assign(Array(6), (match[4]?.split(" ") ?? []).slice(0, 6)).map((finger) => {
      if (NumberUtil.isNaN(finger)) return finger[0];
      return finger < 0 ? "x" : finger;
    });

    match[4]?.split(" ") ?? [];

    return {
      frets,
      fingers,
      barres: [],
      capo: false,
      baseFret,
      midi: [],
    };
  }

  static findChordNames(chordproContent: string): string[] {
    const match = chordproContent.match(/\[ *[^\]\n]+? *\]/g);
    if (!match) return [];

    return match.map((singleMatch) => singleMatch.replaceAll(/[\[\]]/g, "").trim());
  }

  static findIndexFromCoordinates(string: string, rowIndex: number, columnIndex: number): number {
    const lines = string.split("\n");
    const truncatedLines = lines.slice(0, rowIndex);
    return truncatedLines.reduce((acc, line) => acc + line.length, 0) + columnIndex + truncatedLines.length;
  }

  static findCoordinatesFromIndex(string: string, index: number): { row: number; column: number } {
    const lines = string.split("\n");
    let currentIndex = 0;

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
      const lineLength = lines[rowIndex].length;

      if (currentIndex + lineLength >= index) {
        const columnIndex = index - currentIndex;
        return { row: rowIndex, column: columnIndex };
      }

      currentIndex += lineLength + 1;
    }

    return { row: -1, column: -1 };
  }
}

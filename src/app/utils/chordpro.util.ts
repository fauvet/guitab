import Variant from "../types/variant.type";

export class ChordproUtil {
  static readonly EXTENSIONS: `.${string}`[] = [".cho", ".crd", ".chopro", ".chord", ".pro"];
  static readonly PREFERRED_EXTENSION = ChordproUtil.EXTENSIONS[0];

  static findTitle(chordproContent: string): string | null {
    return /{title:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }

  static findArtist(chordproContent: string): string | null {
    return /{artist:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }

  static findCustomVariant(chordproContent: string, chordName: string): Variant | null {
    const regex = new RegExp(`\\{define\\s*:\\s*${chordName} base-fret (\\d) frets ([\\d ]+) fingers ([\\d ]+)\\s*\\}`);
    const match = chordproContent.match(regex);
    if (!match) return null;

    const baseFret = Number(match[1]);
    const frets = match[2]
      .split(" ")
      .filter((n) => !Number.isNaN(n))
      .map((n) => Number(n));
    const fingers = match[3]
      .split(" ")
      .filter((n) => !Number.isNaN(n))
      .map((n) => Number(n));

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
    const match = chordproContent.match(/\[\w+\]/g);
    if (!match) return [];

    return match.map((singleMatch) => singleMatch.replaceAll(/[\[\]]/g, ""));
  }
}

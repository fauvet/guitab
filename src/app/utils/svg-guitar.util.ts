import { Barre, Chord, Finger } from "svguitar";
import Variant from "../types/variant.type";
import { ChordproUtil } from "./chordpro.util";
import guitar from "../../assets/guitar.json";

export class SvgGuitarUtil {
  static buildChord(chordproContent: string, chordName: string): Chord | null {
    const variant = ChordproUtil.findCustomVariant(chordproContent, chordName);
    if (variant) {
      return SvgGuitarUtil.toChord(chordName, variant);
    }

    const chords = Object.values(guitar.chords).flatMap((e) => e);

    for (const chord of chords) {
      const currentChordName = chord.key + chord.suffix;
      if (currentChordName != chordName) continue;

      const variant = structuredClone(chord.variants[0]) as Variant;
      return SvgGuitarUtil.toChord(chordName, variant);
    }

    return null;
  }

  private static toChord(chordName: string, variant: Variant): Chord {
    const duplicatedFingers = variant.fingers.filter(
      (finger, index, array) => finger > 0 && array.slice(index + 1).includes(finger),
    );
    const barres: Barre[] = [];

    for (const duplicatedFinger of duplicatedFingers) {
      const fromString = 6 - variant.fingers.findIndex((finger) => finger == duplicatedFinger);
      const toString = 6 - variant.fingers.findLastIndex((finger) => finger == duplicatedFinger);
      const fret = variant.frets[fromString - 6];
      barres.push({
        fromString,
        toString,
        fret,
        text: String(duplicatedFinger),
      });
    }

    const fingers: Finger[] = [];

    for (const index in variant.fingers) {
      const string = 6 - Number(index);
      const finger = variant.fingers[index];
      const fret = variant.frets[index];
      if ((finger == 0 && fret != -1) || barres.some((barre) => barre.text == String(finger))) continue;

      const newFinger = (fret == -1 ? [string, "x"] : [string, fret, String(finger)]) as Finger;
      fingers.push(newFinger);
    }

    return {
      fingers: fingers,
      barres: barres,
      title: chordName,
      position: variant.baseFret,
    };
  }
}

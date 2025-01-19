import { Barre, Chord, Finger } from "svguitar";
import Variant from "../types/variant.type";
import { ChordproUtil } from "./chordpro.util";
import guitar from "../../assets/guitar.json";
import { ArrayUtil } from "./array.util";
import { NumberUtil } from "./number.util";

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
    const distinctFingers = variant.fingers
      .flatMap(ArrayUtil.unique)
      .filter((finger) => String(finger).toLowerCase() != "x");
    const duplicatedFingers = distinctFingers.filter((finger) => {
      const fingerStringIndexes = ArrayUtil.findIndexes(variant.fingers, finger);
      if (fingerStringIndexes.length <= 1) return false;

      const distinctFingerFrets = fingerStringIndexes
        .map((stringIndex) => variant.frets[stringIndex])
        .filter((fret) => !NumberUtil.isNaN(fret))
        .map(Number)
        .flatMap(ArrayUtil.unique);
      return distinctFingerFrets.length === 1 && distinctFingerFrets[0] > 0;
    });

    const barres: Barre[] = [];

    for (const duplicatedFinger of duplicatedFingers) {
      const fromString = 6 - variant.fingers.findIndex((finger) => finger == duplicatedFinger);
      const toString = 6 - variant.fingers.findLastIndex((finger) => finger == duplicatedFinger);
      const fretAsString = variant.frets[6 - fromString];
      if (NumberUtil.isNaN(fretAsString)) continue;

      barres.push({
        fromString,
        toString,
        fret: Number(fretAsString),
        text: duplicatedFinger,
      });
    }

    const stringIndexes = [...Array(6).keys()];
    const fingers: Finger[] = [];

    for (const stringIndex of stringIndexes) {
      const string = 6 - Number(stringIndex);
      const finger = variant.fingers[stringIndex] ?? "x";
      const fret = variant.frets[stringIndex] ?? "x";

      const isOpenString = fret === "0";
      const belongsToBarre = barres.some((barre) => barre.text == finger);
      if (isOpenString || belongsToBarre) continue;

      const newFinger = (
        fret === "x" ? [string, "x"] : [string, fret, finger.toLowerCase() === "x" ? "" : finger]
      ) as Finger;
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

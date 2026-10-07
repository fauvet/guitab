import { Barre, Chord, Finger } from "svguitar";
import Variant from "../types/variant.type";
import ChordObject from "../types/chord-object.type";
import Instrument from "../types/instrument.type";
import { ChordproUtil } from "./chordpro.util";
import guitar from "../../assets/guitar.json";
import ukulele from "../../assets/ukulele.json";
import { ArrayUtil } from "./array.util";
import { NumberUtil } from "./number.util";

export class SvgGuitarUtil {
  // The fingering databases are data this app does not own, and TypeScript
  // infers a shape from them far more precise than the shape the code relies
  // on — `fingers` is an array of strings in most entries and of numbers in a
  // few. Asserting the contract once, here at the boundary, is the sanctioned
  // place for a cast; everything downstream then works with ChordObject.
  private static readonly CHORD_ENTRIES: Record<Instrument, [string, ChordObject[]][]> = {
    guitar: Object.entries(guitar.chords) as [string, ChordObject[]][],
    ukulele: Object.entries(ukulele.chords) as [string, ChordObject[]][],
  };

  private static readonly STRING_COUNTS: Record<Instrument, number> = {
    guitar: guitar.main.strings,
    ukulele: ukulele.main.strings,
  };

  static getChordEntries(instrument: Instrument): [string, ChordObject[]][] {
    return SvgGuitarUtil.CHORD_ENTRIES[instrument];
  }

  static getStringCount(instrument: Instrument): number {
    return SvgGuitarUtil.STRING_COUNTS[instrument];
  }

  static buildChord(chordproContent: string, chordName: string, instrument: Instrument = "guitar"): Chord | null {
    // A {define:} is written for one instrument: a six-string guitar fingering
    // means nothing on a ukulele, so it only wins when the string counts agree.
    const customVariant = ChordproUtil.findCustomVariant(chordproContent, chordName);
    if (customVariant && customVariant.frets.length === SvgGuitarUtil.getStringCount(instrument)) {
      return SvgGuitarUtil.toChord(chordName, customVariant);
    }

    const variant =
      SvgGuitarUtil.findVariant(chordName, instrument) ?? SvgGuitarUtil.findSlashChordVariant(chordName, instrument);
    return variant ? SvgGuitarUtil.toChord(chordName, variant) : null;
  }

  // The ukulele database has no slash chord at all, and the guitar one misses
  // a few: the bass note is the part a chord can lose and still be played, so
  // the chord above it stands in rather than no diagram at all.
  private static findSlashChordVariant(chordName: string, instrument: Instrument): Variant | null {
    const slashIndex = chordName.indexOf("/");
    if (slashIndex <= 0) return null;
    return SvgGuitarUtil.findVariant(chordName.slice(0, slashIndex), instrument);
  }

  private static findVariant(chordName: string, instrument: Instrument): Variant | null {
    const normalizedChordName = chordName
      .replace("D#", "Eb")
      .replace("G#", "Ab")
      .replace("A#", "Bb")
      .replace("Db", "C#")
      .replace("Gb", "F#");

    const chord = SvgGuitarUtil.getChordEntries(instrument)
      .flatMap(([, chordObjects]) => chordObjects)
      .find((chordObject) => ChordproUtil.buildChordName(chordObject) === normalizedChordName);
    return chord ? structuredClone(chord.variants[0]) : null;
  }

  public static toChord(chordName: string, variant: Variant): Chord {
    const stringCount = variant.frets.length;
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
      const fromString = stringCount - variant.fingers.findIndex((finger) => finger == duplicatedFinger);
      const toString = stringCount - variant.fingers.findLastIndex((finger) => finger == duplicatedFinger);
      const fretAsString = variant.frets[stringCount - fromString];
      if (NumberUtil.isNaN(fretAsString)) continue;

      barres.push({
        fromString,
        toString,
        fret: Number(fretAsString),
        text: duplicatedFinger,
      });
    }

    const stringIndexes = [...Array(stringCount).keys()];
    const fingers: Finger[] = [];

    for (const stringIndex of stringIndexes) {
      const string = stringCount - Number(stringIndex);
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

/** A pitch resolved to the nearest note, plus how far off it actually is. */
export interface DetectedNote {
  /** Note name in the anglo-saxon notation, sharps only: C, C#, D … B. */
  name: string;
  /** Octave number, with middle C being C4. */
  octave: number;
  /** MIDI note number, which is what the fretboard mapping works in. */
  midi: number;
  /** Deviation from that note, in cents. Positive is sharp, negative is flat. */
  cents: number;
}

/**
 * Equal temperament, A4 = 440 Hz = MIDI 69.
 *
 * Sharps rather than flats throughout. An A# and a B♭ are the same fret, so the
 * choice is arbitrary — but making it once keeps the display unambiguous.
 */
export class PitchUtil {
  static readonly REFERENCE_FREQUENCY = 440;
  static readonly REFERENCE_MIDI = 69;

  private static readonly NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  /**
   * The range worth reporting, in Hz. Below and above it a "detection" is an
   * octave error or room noise rather than something a person sang or a guitar
   * sounded, and showing it sends the musician chasing a ghost.
   *
   * The bottom sits just under the guitar's low E (82.41 Hz), the top a little
   * above the highest fretted note on a 24-fret neck (E6, 1318.51 Hz), with
   * room for a harmonic-heavy attack.
   */
  static readonly LOWEST_FREQUENCY = 70;
  static readonly HIGHEST_FREQUENCY = 2100;

  static frequencyToMidi(frequency: number): number {
    return PitchUtil.REFERENCE_MIDI + 12 * Math.log2(frequency / PitchUtil.REFERENCE_FREQUENCY);
  }

  static midiToFrequency(midi: number): number {
    return PitchUtil.REFERENCE_FREQUENCY * Math.pow(2, (midi - PitchUtil.REFERENCE_MIDI) / 12);
  }

  static midiToNoteName(midi: number): { name: string; octave: number } {
    const rounded = Math.round(midi);
    // The octave changes at C, not at A, and MIDI 0 is C-1 — hence the -1.
    return {
      name: PitchUtil.NOTE_NAMES[((rounded % 12) + 12) % 12],
      octave: Math.floor(rounded / 12) - 1,
    };
  }

  /**
   * Resolves a detected frequency to the nearest note, or null when there is
   * nothing worth naming — aubio reports silence as 0 Hz, and putting that
   * through a logarithm yields -Infinity, which would otherwise display as a
   * note.
   */
  static frequencyToNote(frequency: number): DetectedNote | null {
    if (!Number.isFinite(frequency)) return null;
    if (frequency < PitchUtil.LOWEST_FREQUENCY || frequency > PitchUtil.HIGHEST_FREQUENCY) return null;

    const exactMidi = PitchUtil.frequencyToMidi(frequency);
    const midi = Math.round(exactMidi);
    const { name, octave } = PitchUtil.midiToNoteName(midi);

    return { name, octave, midi, cents: (exactMidi - midi) * 100 };
  }

  /** `A4`, `A#3` — the octave is what separates two notes of the same name. */
  static formatNote(note: DetectedNote): string {
    return `${note.name}${note.octave}`;
  }
}

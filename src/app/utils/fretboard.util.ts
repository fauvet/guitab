/** A place to play one note: which string, which fret. */
export interface FretPosition {
  /** 0 is the high E string, matching the `e B G D A E` order of the tab. */
  stringIndex: number;
  fret: number;
}

export interface MappingOptions {
  /**
   * Where on the neck to play, when there is a choice. Solos usually sit around
   * the twelfth fret, which is where a guitar cuts through a mix — so that is
   * the default. It is a preference the player can move, not a rule.
   */
  preferredFret?: number;
  maximumFret?: number;
}

const DEFAULT_OPTIONS: Required<MappingOptions> = {
  preferredFret: 12,
  maximumFret: 24,
};

/**
 * How much a leap from the previous note costs, relative to being one fret
 * away from the preferred position. Above 1 the phrase stays under the hand
 * even when that means drifting from the preferred fret — which is what makes
 * the result playable rather than merely correct.
 */
const MOVEMENT_WEIGHT = 2;

/**
 * How much each step towards the bass strings costs, in the same units.
 *
 * Without it the neck is symmetrical and a phrase happily lands on the low E
 * around the twelfth fret — technically the right pitch, at the preferred
 * fret, and not a solo. Solos live on the thinner strings, which is the actual
 * reason the twelfth fret is where they sit: that is where the guitar cuts
 * through a mix. The weight is small, so it breaks ties without ever dragging
 * a note far from the preferred position.
 */
const TREBLE_STRING_WEIGHT = 0.5;

/**
 * Maps notes onto a guitar neck in standard tuning.
 *
 * Every note has three or four valid positions, so the interesting part is not
 * finding them but choosing between them. Choosing each note independently
 * produces a tab that is right on paper and unplayable in practice, because
 * consecutive notes land at opposite ends of the neck.
 */
export class FretboardUtil {
  /**
   * Standard tuning as MIDI note numbers, **high E first**. That order is not
   * cosmetic: SoloTabUtil writes the first value of each line to the first
   * string of its `e B G D A E` header, so reversing this mirrors every tab it
   * produces.
   */
  static readonly STANDARD_TUNING_MIDI = [64, 59, 55, 50, 45, 40];

  static positionsFor(midi: number, options: MappingOptions = {}): FretPosition[] {
    const { maximumFret } = { ...DEFAULT_OPTIONS, ...options };

    return FretboardUtil.STANDARD_TUNING_MIDI.map((openStringMidi, stringIndex) => ({
      stringIndex,
      fret: midi - openStringMidi,
    })).filter((position) => position.fret >= 0 && position.fret <= maximumFret);
  }

  /**
   * Chooses one position per note, trading distance from the preferred fret
   * against distance from the previous note. Greedy rather than a full search
   * over the phrase: a solo is short, the hand moves forward, and a player
   * reading the result cares far more that consecutive notes sit together than
   * that the total is globally minimal.
   */
  static mapNotes(midiNotes: number[], options: MappingOptions = {}): FretPosition[] {
    const { preferredFret } = { ...DEFAULT_OPTIONS, ...options };

    const positions: FretPosition[] = [];
    let previousFret: number | null = null;

    for (const midi of midiNotes) {
      const candidates = FretboardUtil.positionsFor(midi, options);
      // A note outside the instrument's range is dropped rather than forced to
      // the nearest playable pitch, which would quietly change the melody.
      if (candidates.length === 0) continue;

      const best = candidates.reduce((bestSoFar, candidate) =>
        FretboardUtil.cost(candidate, preferredFret, previousFret) <
        FretboardUtil.cost(bestSoFar, preferredFret, previousFret)
          ? candidate
          : bestSoFar,
      );

      positions.push(best);
      previousFret = best.fret;
    }

    return positions;
  }

  /**
   * How many octaves to move a phrase so it lands nearest the preferred fret.
   *
   * A hummed melody has the right shape and the wrong register — a voice sits
   * one to two octaves below a lead guitar line. Shifting by **whole octaves**
   * is what keeps the melody identical; anything else transposes it into a
   * different tune.
   */
  static chooseOctaveShift(midiNotes: number[], preferredFret = DEFAULT_OPTIONS.preferredFret): number {
    if (midiNotes.length === 0) return 0;

    // Scored by where the notes actually land rather than against a nominal
    // target pitch: "around the twelfth fret" is a position on the neck, and
    // the same pitch sits at a different fret on every string, so any single
    // reference pitch answers the wrong question. Trying the shifts and
    // measuring is both simpler to reason about and consistent with mapNotes by
    // construction.
    const candidateShifts = [0, 1, -1, 2, -2, 3, -3];

    return candidateShifts.reduce((bestShift, shift) =>
      FretboardUtil.placementCost(midiNotes, shift, preferredFret) <
      FretboardUtil.placementCost(midiNotes, bestShift, preferredFret)
        ? shift
        : bestShift,
    );
  }

  /**
   * Mean distance from the preferred fret once the phrase is shifted, with
   * unplayable notes penalised heavily — a shift that puts half the melody off
   * the neck is worse than one that merely sits high.
   */
  private static placementCost(midiNotes: number[], octaveShift: number, preferredFret: number): number {
    const UNPLAYABLE_PENALTY = 100;

    const total = FretboardUtil.transpose(midiNotes, octaveShift).reduce((runningTotal, midi) => {
      const candidates = FretboardUtil.positionsFor(midi);
      if (candidates.length === 0) return runningTotal + UNPLAYABLE_PENALTY;

      const nearest = Math.min(
        ...candidates.map(
          (position) => Math.abs(position.fret - preferredFret) + TREBLE_STRING_WEIGHT * position.stringIndex,
        ),
      );
      return runningTotal + nearest;
    }, 0);

    return total / midiNotes.length;
  }

  static transpose(midiNotes: number[], octaveShift: number): number[] {
    return midiNotes.map((midi) => midi + octaveShift * 12);
  }

  private static cost(position: FretPosition, preferredFret: number, previousFret: number | null): number {
    const base = Math.abs(position.fret - preferredFret) + TREBLE_STRING_WEIGHT * position.stringIndex;
    if (previousFret === null) return base;

    return base + MOVEMENT_WEIGHT * Math.abs(position.fret - previousFret);
  }
}

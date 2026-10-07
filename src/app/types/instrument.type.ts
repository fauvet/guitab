export const INSTRUMENTS = ["guitar", "ukulele"] as const;

/**
 * The instrument chord diagrams are drawn for. The song text never changes with
 * it — only which fingering database, and how many strings, a chord name maps to.
 */
type Instrument = (typeof INSTRUMENTS)[number];

export default Instrument;

export function isInstrument(value: unknown): value is Instrument {
  return INSTRUMENTS.some((instrument) => instrument === value);
}

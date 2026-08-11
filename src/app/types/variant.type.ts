export default interface Variant {
  frets: string[];
  fingers: string[];
  barres: number[];
  capo?: boolean;
  baseFret: number;
  midi: number[];
}

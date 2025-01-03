export default interface Variant {
  frets: number[];
  fingers: number[];
  barres: number[];
  capo: boolean | undefined;
  baseFret: number;
  midi: number[];
}

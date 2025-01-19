export default interface Variant {
  frets: string[];
  fingers: string[];
  barres: number[];
  capo: boolean | undefined;
  baseFret: number;
  midi: number[];
}

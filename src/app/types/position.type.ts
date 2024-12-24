export default interface Position {
  frets: number[];
  fingers: number[];
  barres: number[];
  capo: boolean | undefined;
  baseFret: number;
  midi: number[];
}

import Variant from "./variant.type";

/**
 * One chord as it is stored in `src/assets/guitar.json`: a root key, a suffix,
 * and the fingerings that play it.
 *
 * The JSON is data we do not own, so this describes only the members the app
 * actually reads. That is deliberate — a type mirroring the whole file would
 * have to change every time the data does, for no benefit.
 */
export default interface ChordObject {
  key: string;
  suffix: string;
  variants: Variant[];
}

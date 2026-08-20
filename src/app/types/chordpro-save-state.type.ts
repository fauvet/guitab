import { FileTarget } from "./file-target.type";
import { FileTargetUtil } from "../utils/file-target.util";

export default interface ChordproSaveState {
  fileTarget: null | FileTarget;
  chordproContent: string;
}

type NullableChordproSaveState = ChordproSaveState | null | undefined;

export function areChordproSaveStatesEquals(
  chordproSaveState1: NullableChordproSaveState,
  chordproSaveState2: NullableChordproSaveState,
): boolean {
  return (
    // Reference equality on the target itself would report a different file on
    // every read, the target being a wrapper built on demand — see
    // FileTargetUtil.areSame.
    FileTargetUtil.areSame(chordproSaveState1?.fileTarget ?? null, chordproSaveState2?.fileTarget ?? null) &&
    chordproSaveState1?.chordproContent === chordproSaveState2?.chordproContent
  );
}

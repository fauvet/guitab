export default interface ChordproSaveState {
  fileHandle: null | File | FileSystemFileHandle;
  chordproContent: string;
}

type NullableChordproSaveState = ChordproSaveState | null | undefined;

export function areChordproSaveStatesEquals(
  chordproSaveState1: NullableChordproSaveState,
  chordproSaveState2: NullableChordproSaveState,
): boolean {
  return (
    chordproSaveState1?.fileHandle === chordproSaveState2?.fileHandle &&
    chordproSaveState1?.chordproContent === chordproSaveState2?.chordproContent
  );
}

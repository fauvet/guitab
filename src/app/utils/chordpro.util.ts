export class ChordproUtil {
  static readonly EXTENSIONS: `.${string}`[] = [".cho", ".crd", ".chopro", ".chord", ".pro"];
  static readonly PREFERRED_EXTENSION = ChordproUtil.EXTENSIONS[0];

  static findTitle(chordproContent: string): string | null {
    return /{title:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }

  static findArtist(chordproContent: string): string | null {
    return /{artist:([^}]*)}/.exec(chordproContent)?.[1]?.trim() ?? null;
  }
}

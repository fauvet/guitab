---
name: chordpro-domain
description: "Use when working with ChordPro format parsing, chord diagrams, guitar variants, svguitar rendering, or any chordpro/chord/svguitar related code. Covers domain model, libraries, regex patterns, and chord normalization."
---

# ChordPro Domain Knowledge

## ChordPro Format

ChordPro is a plain-text markup format for chord charts. Key syntax:

```
{title: Wonderful Tonight}
{artist: Eric Clapton}
{meta: youtube https://youtu.be/xxxxx}

[Em7]It's late in the [D]evening
[A7sus4]She's wondering what [G]clothes to wear

{define: Em7 base-fret 0 frets 0 2 2 0 3 0 fingers 0 2 3 0 4 0}

{comment: Chorus}
{verse:
  [G]This song is [D]easy to play
}

{tab:
  e|---0---0---|
  B|---0---0---|
}
```

### Supported Directives

| Directive                                                          | Purpose                        |
| ------------------------------------------------------------------ | ------------------------------ |
| `{title: ...}`                                                     | Song title                     |
| `{artist: ...}`                                                    | Artist name                    |
| `{meta: youtube <url>}`                                            | Associate a YouTube video      |
| `{define: Name base-fret N frets X X X X X X fingers N N N N N N}` | Custom chord fingering         |
| `{comment: ...}`                                                   | Inline comment / section label |
| `{verse:}` / `{chorus:}`                                           | Section markers                |
| `{tab: ... }`                                                      | Guitar tablature block         |

### Supported File Extensions

`.cho`, `.crd`, `.chopro`, `.chord`, `.pro`

## Key Libraries

### chordproject-parser

Parses ChordPro text into HTML for display:

```typescript
import * as ChordProjectParser from "chordproject-parser";

const chordParser = new ChordProjectParser.ChordProParser();
const song = chordParser.parse(chordSheet);
const settings = new ChordProjectParser.FormatterSettings();
settings.showChords = true;
settings.showMetadata = true;
const html = new ChordProjectParser.HtmlFormatter(settings).format(song);
```

### chordproject-editor

External DOM-based editor widget — accessed via global object (no TypeScript types):

```typescript
// @ts-ignore
import * as ChordProjectEditor from "chordproject-editor";

const editor = ChordProjectEditor.Main.getEditor();
const content = editor.getContent();
editor.setContent("new content");
```

⚠ The editor is initialized after the DOM is ready. Always guard with null checks before calling editor methods.

### svguitar

Renders SVG guitar chord diagrams. The primary type is `Chord`:

```typescript
import { Chord, SVGuitarChord } from "svguitar";

const chord: Chord = {
  fingers: [
    [1, 2],
    [2, 3],
    [3, 2],
  ], // [string (1=high e), fret]
  barres: [{ fret: 2, fromString: 5, toString: 1 }],
  title: "Am",
};
```

See `SvgGuitarUtil.buildChord()` for the lookup that normalizes a chord name and
finds its `Variant`, and `SvgGuitarUtil.toChord()` for converting a `Variant`
into a `Chord`.

## The `Variant` Type

A chord variant is one specific fingering stored in `src/assets/guitar.json`:

```typescript
interface Variant {
  frets: string[]; // Fret per string (e.g. ["0","2","2","1","0","0"])
  fingers: string[]; // Finger number per string ("0" = open/muted)
  barres: number[]; // Fret numbers where barres exist
  capo: boolean | undefined;
  baseFret: number; // 1-indexed starting fret
  midi: number[];
}
```

## Chord Normalization

When looking up chords, apply enharmonic equivalents:

| Input | Normalized |
| ----- | ---------- |
| `Db`  | `C#`       |
| `Gb`  | `F#`       |
| `D#`  | `Eb`       |
| `G#`  | `Ab`       |
| `A#`  | `Bb`       |

Applied inline in `SvgGuitarUtil.buildChord()`.

## Custom Chord Parsing

Custom chords are defined inline via `{define:}` directives and take precedence over `guitar.json` variants. The regex pattern in `ChordproUtil` extracts them:

```
{define: <Name> base-fret <N> frets <f1> <f2> <f3> <f4> <f5> <f6> [fingers <n1>...<n6>]}
```

Use `ChordproUtil.findCustomVariant(chordproContent, chordName)` to extract a custom variant from the current song content.

## Utility Classes

| Class           | Key Methods                                                    |
| --------------- | --------------------------------------------------------------- |
| `ChordproUtil`  | `findChordNames()`, `findCustomVariant()`, `buildFileName()`, `EXTENSIONS` |
| `SvgGuitarUtil` | `buildChord()`, `toChord()`                                     |
| `FileUtil`      | `readFile()`, `loadSampleFile()`, `loadEmptyFile()`             |

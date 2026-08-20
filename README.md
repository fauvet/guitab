<div align="center">
  <img src="src/assets/icons/logo.svg" alt="GuiTab logo" width="96" />
  <h1>GuiTab</h1>
  <p>A ChordPro guitar chord chart editor and viewer, built as a Progressive Web App.</p>

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?logo=reactivex&logoColor=white)](https://rxjs.dev)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-enabled-5A0FC8?logoColor=white)](https://web.dev/progressive-web-apps/)

</div>

---

## Links

- [Application](https://fauvet.github.io/guitab/)
- [Demo](https://fauvet.github.io/guitab/?load=demo)

## Features

- Edit ChordPro files with syntax highlighting and one-click directive insertion
- Side-by-side rendered chord sheet viewer
- SVG guitar chord diagram grid, with support for custom chord definitions
- Solo tab editor
- Import chords over lyrics
- Open and save files via the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (with a file input fallback)
- Recent files history stored locally
- YouTube video embed via `{meta: youtube <url>}`
- Undo/redo history
- Keyboard shortcuts (Ctrl+O, Ctrl+S, Ctrl+Z...)
- Zoom control
- Wake Lock and Bluetooth keep-alive for hands-free reading
- Draft auto-recovery on page reload
- Installable as a PWA, with native file handler for `.cho`, `.crd`, `.chopro`, `.chord`, `.pro`
- Also builds as an Android app from the same source, via [Capacitor](https://capacitorjs.com)

## Tech stack

|                  |                                                                          |
| ---------------- | ------------------------------------------------------------------------ |
| Framework        | [Angular 22](https://angular.dev) (standalone components, OnPush)        |
| UI               | [Angular Material 22](https://material.angular.io)                       |
| Reactive state   | [RxJS 7](https://rxjs.dev)                                               |
| ChordPro parsing | [chordproject-parser](https://www.npmjs.com/package/chordproject-parser) |
| ChordPro editor  | [chordproject-editor](https://www.npmjs.com/package/chordproject-editor) |
| Chord diagrams   | [svguitar](https://github.com/omnibrain/svguitar)                        |
| Testing          | [Vitest 4](https://vitest.dev), in jsdom                                 |
| PWA              | [Angular Service Worker](https://angular.dev/ecosystem/service-workers)  |
| Android          | [Capacitor](https://capacitorjs.com)                                     |

## Getting started

```bash
npm run setup:env  # Placeholder Firebase config — required once on a fresh clone
npm start          # Dev server at http://localhost:4200
npm run build      # Production build into docs/
npm test           # Unit tests
npm run verify     # Everything CI runs: lint, format, docs, types, coverage
npm run deploy     # Deploy to GitHub Pages
```

`src/environments/environment.ts` holds the Firebase configuration and is
git-ignored, so nothing compiles until it exists. `npm run setup:env` writes a
placeholder that is enough to build and test; replace it with the real values to
use sign-in and cloud storage locally.

## Android

The Android app is built from the same source with Capacitor. It needs a JDK and
the Android SDK — installing Android Studio is the simplest way to get both.

```bash
npm run build:capacitor   # Angular build for the WebView, into dist/capacitor
npm run cap:sync          # the above, then copy it into android/
npm run cap:run:android   # sync, then build and launch on a device or emulator
npm run cap:open:android  # open the project in Android Studio instead
```

`android/app/google-services.json` is git-ignored like `environment.ts`, and
`npm run setup:env` writes a placeholder so the project builds without it. The
placeholder cannot sign in: to use Google sign-in on a device, register an Android
app in the Firebase console under the `appId` from `capacitor.config.ts`, add your
signing certificate's SHA-1, and replace the file with the one it gives you.

Note that `rgcfaIncludeGoogle` in `android/variables.gradle` links Google's
proprietary `play-services-auth` into the APK. It is needed for native Google
sign-in and is a licensing decision as much as a build one — the reasoning is next
to the flag, and in `.claude/skills/capacitor-android/SKILL.md`.

## ChordPro format

GuiTab works with [ChordPro](https://www.chordpro.org) files. Here is a quick overview of the supported syntax:

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

Supported directives: `{title}`, `{artist}`, `{meta}`, `{define}`, `{comment}`, `{verse}`, `{chorus}`, `{tab}`.

For the full spec, see [chordpro.org](https://www.chordpro.org/chordpro/chordpro-introduction/).

## License

Copyright © 2024 Guillaume FAUVET.

GuiTab is free software, licensed under the **GNU General Public License, version 3
or later** — see [LICENSE](LICENSE). It was MIT-licensed until the pitch detection
feature landed: that feature is built on [aubio](https://aubio.org), whose
real-time onset detection has no permissively licensed equivalent, and embedding it
requires the whole application to carry the same licence.

The practical consequence, stated plainly: anyone may use, study, modify and
redistribute GuiTab, but a derived work must also be released under the GPL. Code
from this repository can no longer be reused in a permissively licensed or
proprietary project.

Any dependency added from now on must be GPL-3.0 compatible. Permissive licences
(MIT, Apache-2.0, BSD) are compatible and remain preferable at equal quality;
copyleft-stronger licences such as the AGPL are not.

## Changelog

Notable changes are recorded in [CHANGELOG.md](CHANGELOG.md), following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
name: capacitor-android
description: GuiTab packaged as an Android app with Capacitor — the second build configuration, the four browser APIs a WebView does not have and what replaces each, the native project's manifest and Gradle switches, and what still has to be verified on a device. Use when touching capacitor.config.ts, anything under android/, a Capacitor plugin, or when something works in the browser and not in the app.
---

# The Android build

The same source ships twice: as the PWA on GitHub Pages, and as an APK. Capacitor
serves the built `dist/capacitor/browser` from a WebView, so the Angular code is
unchanged — what differs is the platform underneath it, and it differs in four
places that matter.

## Two build configurations, not one

`npm run build` is the PWA. `npm run build:capacitor` is the app, and differs in
exactly three ways, all of them forced by the WebView:

- **`baseHref: "/"`**. The Pages build is served under a subpath; a WebView serves
  from the root, and the subpath would 404 every asset.
- **`outputPath: "dist/capacitor"`**, so `docs/` stays the deploy artifact.
- **no service worker**. The assets are already on the device, so one could only
  add a way to serve a stale copy of files it cannot update. `app.config.ts` has
  the matching guard — without it the registration 404s on every launch.

`npx cap sync android` copies the build into the native project. It regenerates
`android/app/src/main/assets/`, which is git-ignored and listed in
`.prettierignore` — Prettier reads the root `.gitignore` only, so nested ones have
to be repeated there.

## What a WebView does not have

Each of these is handled at the boundary that already existed, never by an
`if (isNative)` at the call site. `PlatformService` is the one place that asks.

| Missing                                                           | Replaced by                                                                         | Lives in                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `FileSystemFileHandle`, and the open/save pickers                 | `@capawesome/capacitor-file-picker` + `@capacitor/filesystem`                       | `storage/native/` behind `IFileAccessRepository` |
| `signInWithPopup` — Google rejects OAuth from an embedded WebView | `@capacitor-firebase/authentication`, `skipNativeAuth`, then `signInWithCredential` | `AuthService`                                    |
| `navigator.wakeLock`                                              | `@capacitor-community/keep-awake`                                                   | `WakeLockService`                                |
| `beforeunload` — apps are backgrounded, not unloaded              | `@capacitor/app` `appStateChange` and `backButton`                                  | `BeforeUnloadService`                            |

Two consequences worth carrying:

- **The JS Firebase SDK stays the only owner of the session.** The native plugin
  runs the Google consent flow and returns an ID token, and stops there. `user$`
  and every Realtime Database repository read one auth state; two SDKs each holding their
  own idea of who is signed in is the failure `skipNativeAuth` exists to avoid.
- **`isKeptAwake$` means something weaker on Android.** There is no event for the
  system dropping the window flag, so it follows the request rather than an
  observed reality. Returning to the foreground re-asserts it, which is what keeps
  the approximation honest. The intention/reality split described in
  `WakeLockService` still holds everywhere else.

## The native project

`android/` is committed, so hand edits survive. Three of them are load-bearing:

- **`RECORD_AUDIO`** in the manifest. Capacitor forwards the WebView's
  `getUserMedia` prompt, but without the declaration Android refuses before the
  user is ever asked — the microphone simply never starts.
- **Intent filters**, standing in for the web manifest's `file_handlers`. ChordPro
  has no registered MIME type, so matching is on the file name, and Android's
  `pathPattern` is not a regular expression: `.*\.cho` stops at the first dot in
  the path, so every extension needs its two-dot twin as well.
- **`rgcfaIncludeGoogle`** in `variables.gradle`. The plugin defaults it to false,
  which leaves `play-services-auth` out of the APK and native Google sign-in
  broken. Turning it on is also a licensing decision — see below.

`android/app/google-services.json` is git-ignored for the same reason as
`src/environments/environment.ts`, and `npm run setup:env` writes a placeholder so
a fresh clone and CI still build. The placeholder cannot sign in: replace it with
the file the Firebase console gives you for an Android app registered under this
`applicationId`, with your signing certificate's SHA-1 added.

## The licensing question

GuiTab is GPL-3.0-or-later. `rgcfaIncludeGoogle = true` links `play-services-auth`,
which is under Google's proprietary Android SDK terms, into the APK. Distributing
a GPL binary linked against a proprietary library is the situation the GPL governs;
the GPLv3 system-library exception is arguable for Play Services on Android, but
arguable is not settled. Setting the flag back to false gives up native Google
sign-in — anonymous accounts and local storage keep working — and removes the
question. See `.claude/rules/dependencies-licensing.instructions.md`.

## Not yet verified on a device

Everything above builds and is covered by unit tests with the plugins mocked, but
no APK has been run on hardware. The piece most likely to need adjustment is
**writing back to a picked `content://` URI**: reading one through
`Filesystem.readFile` is well supported, writing to one depends on the persistable
permission Android granted with the pick. If a save fails there, the fallback is a
save-as into `Directory.Documents`, which `saveFileAs()` already does.

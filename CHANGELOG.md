# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Nothing has been tagged yet, so everything below sits under **Unreleased**. The
first entry moves to `## [1.0.0]` when the first release is cut.

## [Unreleased]

### Changed

- **The project is now licensed under the GNU General Public License, version 3
  or later.** It was MIT-licensed until real-time pitch detection landed: that
  feature is built on aubio, whose onset detection has no permissively licensed
  equivalent in a browser, and embedding it requires the whole application to
  carry the same licence. Code from this repository can no longer be reused in a
  permissive or proprietary project.
- The interface now uses Material 3. Colours, elevation and spacing shift slightly
  across every button, dialog and bottom sheet; the palette is derived from the same
  indigo the app already used as its installed-icon colour, so the app still looks
  like itself. Two panels that were quietly rendering in grey fallback colours — the
  chords-over-lyrics import preview and the pitch monitor's error text — now follow
  the theme.
- Turning on "Wake lock" now says so when it cannot work — on a browser without the
  API, or when the request is refused. It used to switch on and let the screen dim
  anyway, which looks like the app failing rather than the browser declining. The
  setting also shows whether the screen is actually being held awake, rather than
  only that it was asked for.
- **The screen stays awake after switching apps.** Browsers take the wake lock back
  as soon as the page is hidden, and nothing asked for it again — so answering a
  message between two songs used to leave the setting switched on over a screen that
  dimmed for the rest of the session. It is now taken back when you return.
- A failed anonymous sign-in now shows a message instead of failing silently. It used
  to only reach the browser console, so a misconfigured or unreachable Firebase
  project looked like an ordinary signed-out state.
- **Cloud storage moved from Cloud Firestore to Realtime Database.** GuiTab's actual
  need — a file's name mapped to its ChordPro content — is a plain key/value store,
  not a document database. One real trade-off: Realtime Database's web client has no
  disk persistence, so a recently opened file or an in-progress draft is only
  available offline if the local (`localStorage`) copy already has it.

### Added

- **A dedicated Song library dialog**, reachable from the file menu, lists every
  song saved to the account (or device, when signed out) — not just the most
  recent ones — with the same album cover Quick Access already shows. It can
  import several ChordPro files at once, download any entry back to disk,
  download everything as one `.zip`, or delete an entry — none of which was
  possible before. Quick Access itself now shows only the 5 most recent songs,
  as a fast shortcut rather than the only way to reach the rest.
- **Hum a solo and get a tablature.** The solo tab editor can open the
  microphone, show the note being sung as it is sung — with its octave, so two
  A's an octave apart never read the same — and turn the phrase into tablature
  lines. A voice sits one to two octaves below a lead guitar, so the octave is
  transposed on the way to the tab and not on the display: what is shown is what
  was heard. The position on the neck is a setting, defaulting to around the
  twelfth fret.
- An audio file can be analysed instead of the microphone, with the plain
  warning that it only works on a track that already holds a single melody line.
- An in-app footer linking the source, the licence and the issue tracker, and
  showing the running version.
- `npm run setup:env`, which writes a placeholder Firebase configuration so a
  fresh clone can build and test before any Firebase access is set up.
- ESLint, coverage thresholds, an instruction-tree integrity check, and a CI
  workflow that runs all of them on every push and pull request.

### Fixed

- **Every confirmation the app asks for a native, browser-styled `confirm()`
  popup** — deleting a song from the library, discarding unsaved changes,
  verifying a downloaded file — now shows a Material dialog that matches the
  rest of the app instead.
- **A dialog meant to fill most of the screen — Song library, Solo tab
  editor, the chords-over-lyrics import, the external tool embeds — was
  capped at Material's default 560px regardless of the width it asked for.**
  `MatDialog` only honours `width` if `maxWidth` is also set; none of these
  passed one, so every one of them opened as a narrow box in the middle of a
  much wider screen, with its "Close" button reading as centred rather than
  right-aligned simply because the whole dialog was narrow.
- **The album cover in the Song library and Quick Access could render on top
  of the song title next to it.** The cover is a component, not a plain
  `<img>`, and a custom element has no intrinsic size — without an explicit
  size on its host, `matListItemIcon`'s CSS treated it like a 24px icon
  glyph and let the 48px image overflow into the text beside it.
- **Importing several ChordPro files with no `{title:}`/`{artist:}` of their
  own only kept the last one.** The name given to a saved song fell back to
  the literal string `"null (null)"` when both were missing, so every such
  import collided on the same key and silently overwrote the previous one.
  Untitled content now falls back to the imported file's own name instead, so
  distinct files stay distinct; content with genuinely no title, artist, or
  origin file falls back to "Untitled" rather than "null (null)".
- **A song downloaded from the Song library got a bare or `.txt`-looking name
  instead of `.cho`.** The download used the song's display name directly,
  which never carried an extension.
- **Opening or saving any file crashed outright on Firefox, Safari, and every
  mobile browser.** The code told a real local-disk handle apart from
  everything else with `instanceof FileSystemFileHandle`, but that global only
  exists on Chromium's File System Access API — every other browser never
  declares it at all, so the bare reference threw a `ReferenceError` instead
  of the intended "no, it isn't one." Since this app is used one-handed on a
  phone, that meant most real users. The check now goes through `typeof`
  first, which is the one operator that never throws on an undeclared
  identifier.
- **Ctrl+S (and the file menu's "Save file") popped a local-disk save dialog,
  or silently triggered a download, for any song opened from Quick Access, a
  new file, the demo, or a restored draft** — leftover behaviour from before
  cloud storage existed, since none of those ever held a real on-disk file
  handle. Saving now upserts straight to the account (or device, when signed
  out) with no dialog, the same as every other save path; the disk-oriented
  flow is reserved for a file genuinely opened from local disk and for the
  explicit "Save file as…".
- **A draft saved right after startup could silently vanish from draft
  recovery.** Like the Quick Access bug below, draft recovery read the
  signed-in state synchronously, before the automatic anonymous sign-in on
  launch had resolved — so an early draft save could land in `localStorage`
  while recovery was already reading from Firebase. It now waits for the
  first resolved auth state, the same fix already applied to Quick Access.
- **Ctrl+Shift+S (Save As) and Ctrl+Shift+Z (redo) never worked.** Holding Shift
  makes the browser report an uppercase letter, which no shortcut matched, so
  both keystrokes did nothing at all.
- The three toolbar images in the tools sheet had no text alternative and were
  announced as nothing by a screen reader.
- Several controls became briefly enabled before the app knew whether they
  should be, because a not-yet-emitted value read as "no".
- Draft sync threw `Invalid document reference` for every signed-in user.
  The draft was stored at a 3-segment Firestore path, which the SDK only
  accepts for a collection, not the single document the draft actually is.
- **A file opened right after startup could silently vanish from Quick
  Access.** Saving to Quick Access read the signed-in state synchronously,
  before the automatic anonymous sign-in on launch had resolved — so an early
  save landed in `localStorage` while the list was already reading from
  Firestore, and never showed up again. Saving now waits for the first
  resolved auth state instead of racing it. Opening a file through the OS —
  "Open with GuiTab", or double-clicking a `.cho` file — never added it to
  Quick Access at all; it now does, the same as opening it from within the app.
- Signing out left the previous session's user briefly reachable through
  `AuthService` — it only cleared once the automatic anonymous sign-in that
  follows every sign-out had resolved, rather than immediately.
- The login button's tooltip could read "Signed in as null" for a Google
  account with no display name; it now falls back to the email address, then
  a generic label.
- If the cloud sync behind Quick Access ever failed — a permissions problem,
  a dropped connection — the list simply stayed empty forever with nothing
  logged and nothing shown, on every subsequent visit. A failure is now
  surfaced with a message instead of failing silently.
- **A batch of actions that used to fail silently now show a message and log
  the real error:** opening or saving a file when the picker is refused or the
  disk write fails, saving a keyboard-triggered file action (Ctrl+S,
  Ctrl+Shift+S), copying a generated tab or converted lyrics to the clipboard,
  and opening a file from Quick Access or the OS file handler when the cloud
  sync fails. Every message a save or sync produces now goes through one
  consistent notification style instead of each screen wording and timing its
  own.

## Before this changelog

The entries below summarise the work recorded in git history before the project
started keeping a changelog. They are grouped by what they gave the user, not by
the order they landed in.

### Editing and viewing

- ChordPro editing with a live rendered chord sheet beside it, one-click
  directive insertion, undo and redo history, and a zoom control.
- An SVG chord-diagram grid, including custom fingerings defined inline with
  `{define:}`.
- A solo tab editor that turns line-by-line note entry into a six-string ASCII
  tablature.
- Import of chord charts written as chords over lyrics.
- A YouTube video embedded from a `{meta: youtube <url>}` directive.
- Keyboard shortcuts for the file and history operations, deliberately inactive
  while a dialog is open.

### Files and persistence

- Open and save through the File System Access API, with a file-input fallback
  where it is unavailable.
- A recent-files history, and automatic draft recovery so a reload does not lose
  unsaved work.
- Anonymous sign-in on first visit, upgradable to a Google account while keeping
  the same identity and the same files.
- Per-user cloud storage in Firestore with offline support, falling back to
  local storage when no session exists.

### Playing

- Installable as a PWA, registered as a handler for `.cho`, `.crd`, `.chopro`,
  `.chord` and `.pro` files.
- Wake lock and a Bluetooth keep-alive, so the screen stays on and a pedal stays
  connected while playing.

### Housekeeping

- Migrated to Angular 22 with standalone components throughout.
- Replaced Karma and Jasmine with Vitest.
- Removed the `ngx-toastr` dependency in favour of Angular Material's snackbar.

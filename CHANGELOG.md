# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Nothing has been tagged yet, so everything below sits under **Unreleased**. The
first entry moves to `## [1.0.0]` when the first release is cut.

## [Unreleased]

### Changed

- **Theme colors now come from the logo's own red-orange and wood tones**
  instead of an unrelated indigo/blue, fixing a washed-out pale-pink surface
  color and bringing the PWA install screen's colors in line with the app
  icon.
- **Body text now renders in Atkinson Hyperlegible**, a typeface designed by
  the Braille Institute of America to disambiguate commonly-confused
  characters (1/l/I, 0/O) — chosen for legibility of chord and fret numbers,
  not just a modern look. Self-hosted, no network dependency.
- **Success and error snackbars are now visually distinct** — errors use the
  theme's error color, successes a new green — instead of looking identical.
- **Saving is automatic** — content persists to the account a few seconds
  after typing stops, with no manual Open, Save or Save As. Open is Import in
  the Song library dialog; Save As is Download. New file and Song library are
  direct buttons in the header.
- **Licensed under the GNU General Public License, version 3 or later.**
- **Material 3 theme**, applied across every button, dialog and bottom sheet,
  including the chords-over-lyrics import preview.
- **Wake lock reports failure** when the API is unavailable or the request is
  refused, and shows whether the screen is actually being held awake.
- **Wake lock is re-acquired on returning to the tab** after switching apps.
- **A failed anonymous sign-in shows a message.**
- **Cloud storage runs on Firebase Realtime Database.** No disk persistence:
  a cached file or draft is available offline only if the local
  (`localStorage`) copy already has it.

### Added

- **Song library dialog**, reachable from the header: lists every saved song,
  imports several ChordPro files at once, downloads an entry or the whole
  library as one `.zip`, deletes an entry, and filters the list by name
  (accent- and case-insensitive) through a search field next to Import and
  Download all.
- An in-app footer linking the source, the licence and the issue tracker, and
  showing the running version.
- `npm run setup:env`, writing a placeholder Firebase configuration.
- ESLint, coverage thresholds, an instruction-tree integrity check, and a CI
  workflow running all of them on every push and pull request.
- A pre-commit hook (Husky + lint-staged) running ESLint and Prettier on
  staged files, so a formatting regression is caught before it is committed
  instead of after it reaches CI.
- Toggling show lyrics, wake lock or Bluetooth keep-alive in Settings shows a
  confirmation snackbar stating which state it switched to.

### Fixed

- The Bluetooth keep-alive icon in Settings now swaps between its dedicated
  on/off glyphs, instead of reusing the "on" glyph regardless of state.
- Zoom, drafts and the recent-files list no longer risk an uncaught error if
  `localStorage` rejects a write (Safari private browsing, a full quota) —
  the failure is now logged instead.
- Each saved song keeps a stable id independent of its display name; autosave
  updates that one record even when the derived `{title:}`/`{artist:}` name
  changes.
- Draft and cloud saves go through `update()`, so `createdAt` is preserved
  across writes.
- Every confirmation — deleting a song, discarding unsaved changes, verifying
  a downloaded file — shows a Material dialog instead of the native
  `confirm()` popup.
- Song library, Solo tab editor, chords-over-lyrics import and external tool
  embed dialogs set `maxWidth`, so their requested `width` is honoured.
- The album cover in the Song library and Quick Access has an explicit size
  and no longer overlaps the song title.
- An imported file with no `{title:}`/`{artist:}` falls back to the file's
  own name, then to "Untitled".
- A song downloaded from the Song library has a `.cho` extension.
- File-handle detection uses `typeof`, working on every browser rather than
  only Chromium.
- Ctrl+S and the file menu's "Save file" save directly to the account (or
  device, when signed out) with no dialog, for every file regardless of
  origin.
- Draft recovery waits for the first resolved auth state before reading from
  Firebase.
- Ctrl+Shift+S and Ctrl+Shift+Z are recognised regardless of the letter case
  the browser reports while Shift is held.
- The toolbar images in the tools sheet have a text alternative for screen
  readers.
- Controls that depend on an async value no longer render briefly enabled
  before that value resolves.
- Draft sync uses a document reference valid for a single document.
- Saving to Quick Access waits for the first resolved auth state; opening a
  file through the OS file handler adds it to Quick Access.
- Signing out clears the previous session's user immediately.
- On mobile, closing a dialog or bottom sheet no longer opens the on-screen
  keyboard while the viewer (not the editor) is the visible pane.
- The login button's tooltip falls back to the account email, then a generic
  label, when a Google account has no display name.
- A failed cloud sync for Quick Access is surfaced with a message instead of
  leaving the list silently empty.
- File open/save, keyboard-triggered save, clipboard copy of a generated tab
  or converted lyrics, and Quick Access/file-handler sync failures show a
  message and log the error, through one consistent notification style.
- The header and footer toolbars no longer show a spurious horizontal
  **and vertical** scrollbar on interaction: every icon button's invisible
  accessible touch target was permanently a few pixels wider and taller
  than the row itself — an overflow `overflow-x: auto` (which per the CSS
  spec forces `overflow-y` to compute as `auto` too) only revealed once
  something, like a click, made the browser paint the scrollbar.
- The Song library dialog's Close button no longer scrolls out of view: its
  root wasn't stretched to the dialog's fixed height, so a long enough song
  list could grow the whole dialog past the bottom of the screen. Import,
  Download all and the search field now stay pinned above the list too,
  which is the only part that scrolls.

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

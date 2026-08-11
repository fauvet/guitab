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

### Added

- An in-app footer linking the source, the licence and the issue tracker, and
  showing the running version.
- `npm run setup:env`, which writes a placeholder Firebase configuration so a
  fresh clone can build and test before any Firebase access is set up.

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

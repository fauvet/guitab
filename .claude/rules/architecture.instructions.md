---
description: "Use when working on component interactions, data flows, state transitions, service wiring, or any feature that spans multiple files. Describes the full runtime architecture of the Guitab app."
---

# Guitab Runtime Architecture

## Component Tree

`AppComponent` is the root. It directly renders:

```
AppComponent
├── HeaderActionsBarComponent          (top toolbar)
│   └── LoginComponent                   (Google sign-in / sign-out button)
├── <div.content>
│   ├── <div.container-chordpro>
│   │   ├── ChordproEditorComponent    (Ace editor widget)
│   │   └── ChordproViewerComponent    (rendered chord sheet)
│   └── ChordproChordsViewerComponent  (SVG chord diagrams grid)
├── FooterActionsBarComponent          (bottom toolbar)
├── AppFooterComponent                 (source, licence, version)
└── <router-outlet />                  (present, but the app has no second route)
```

Dialogs and bottom sheets are opened imperatively via `MatDialog` / `MatBottomSheet` — they are not part of the static template.

## Central Data Flow: ChordPro Content Pipeline

`ChordproService.chordproContent$` (BehaviorSubject) is the **single source of truth** for the song text. All rendering derives from it.

```
User types in editor
  └─> ChordproEditorComponent (MutationObserver on #chordProjectEditor)
        └─> chordproService.updateChordproContent()
              └─> chordproContent$.next(newContent)
                    ├─> ChordproViewerComponent
                    │     └─> ChordProjectParser → HtmlFormatter → innerHTML
                    ├─> ChordproChordsViewerComponent
                    │     └─> ChordproUtil.findChordNames() → SvgGuitarUtil.buildChord() → chords$
                    └─> ChordproService.onChordproContentChanged()
                          └─> parseMetaYouTube() → youTubeUrl$
                                └─> FooterActionsBarComponent (YouTube iframe embed)
```

**Key guard**: `setChordproContent()` returns early if content is unchanged (avoids infinite loops between editor widget and service).

## File Open Flow

```
BottomSheetManageFileComponent / KeyboardShortcutService.openFile()
  └─> chordproService.hasUnsavedChanges() → ConfirmService.confirm() if needed
        └─> window.showOpenFilePicker() or <input type="file"> fallback
              └─> appContextService.setFileHandle(file)
                    └─> FileUtil.getFileContent(file) → fileHandleWithContent$.next()
                          └─> ChordproService.onFileHandleWithContentChanged()
                                ├─> resetHistoryState()
                                ├─> updateChordproSaveState(content)
                                └─> setChordproContent(content) ──> triggers full pipeline above
```

Side-effects after open: `appContextService.setEditing(false)` (preview mode), `cachedFilesService.saveFile(content)`.

## File Save Flow

```
KeyboardShortcutService.saveFile()
  ├─> a real FileSystemFileHandle exists → write through it, then cachedFilesService.saveFile(content)
  └─> otherwise (Quick Access, new file, demo, draft) → cachedFilesService.saveFile(content) directly
```

saveFileAs() (Ctrl+Shift+S) is the separate, explicit "get a local copy" action — showSaveFilePicker(),
or a FileSaver blob download — and never runs as a side effect of a plain save. The filename comes from
the content itself — `ChordproUtil.buildFileName()` reads `{title:}` and `{artist:}`.

## App Bootstrap & Draft Recovery

On startup, `AppComponent.ngOnInit()` reads `ActivatedRoute.queryParamMap`:

- `?load=demo` → `FileUtil.loadSampleFile()` → `setFileHandle()` → `setEditing(true)`
- otherwise → `beforeUnloadService.findDraftUnsavedChordproContent()`, which reads the active `IDraftRepository` (Realtime Database when authenticated, localStorage otherwise) and restores a draft flagged `hasUnsavedChanges` — or falls back to `FileUtil.loadEmptyFile()` and a blank slate

## Service Dependency Graph

```
BluetoothKeepAliveService ← inaudible tone so a speaker does not sleep between songs
WakeLockService           ← holds the screen wake lock, re-takes it on tab return
     ↓ injected by
AppContextService        ← holds file handle, editing mode, wake lock, Bluetooth
     ↓ injected by
ChordproService          ← subscribes to fileHandleWithContent$ in constructor
     ↓ injected by
KeyboardShortcutService  ← file operations (open/save/undo/redo)
BeforeUnloadService      ← hasUnsavedChanges() + draft via IDraftRepository
HeaderActionsBarComponent
FooterActionsBarComponent
BottomSheetManageFileComponent
BottomSheetSettingsComponent
NotificationService ← the only service allowed to touch MatSnackBar
ConfirmService      ← the only service allowed to open DialogConfirmComponent
FirebaseService ← initializes Firebase app + Realtime Database (no offline persistence)
     ↓ injected by
AuthService     ← anonymous sign-in on startup, Google link/sign-in, isAnonymous()
     ↓ injected by
├── CachedFilesService   ← delegates to ICachedFilesRepository
├── BeforeUnloadService  ← delegates to IDraftRepository
└── LoginComponent

LocalStorageService ← used by ZoomService, LocalCachedFilesRepository, LocalDraftRepository

AubioLoaderService  ← fetches aubio's WebAssembly from assets/ at runtime; it sits
                      inside services/pitch-detection/, being a detail of that boundary
     ↓ injected by
PitchDetectionService ← the Web Audio boundary that matters: microphone,
                        AudioContext, pitch + onset detection
     ↓ injected by
PitchMonitorComponent ← opened inside DialogSoloTabEditorComponent

ICachedFilesRepository (interface)
  ├── LocalCachedFilesRepository   ← localStorage key CACHED_FILES
  └── FirebaseCachedFilesRepository ← Realtime Database /users/{uid}/cachedFiles/

IDraftRepository (interface)
  ├── LocalDraftRepository         ← localStorage key DRAFT
  └── FirebaseDraftRepository      ← Realtime Database /users/{uid}/draft
```

`AppContextService` and `ChordproService` are the two most central services. Any feature touching file content or rendering will flow through both.

## State Ownership

| State                                  | Owner                           | Changed by                                          | Consumed by                                                   |
| -------------------------------------- | ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `chordproContent$`                     | `ChordproService`               | editor mutations, file open, undo/redo              | ViewerComponent, ChordsViewer, FooterBar                      |
| `fileHandleWithContent$`               | `AppContextService`             | open file, new file                                 | ChordproService, BottomSheet, KeyboardShortcut                |
| `isEditing$`                           | `AppContextService`             | UI buttons, file open/new                           | Header, Footer, AppComponent (CSS class), ChordsViewer        |
| `chordproSaveState$`                   | `ChordproService`               | file open, file save                                | `hasUnsavedChanges()`, BeforeUnloadService                    |
| `youTubeUrl$`                          | `ChordproService`               | auto-parsed from `{meta:youtube}` on content change | FooterActionsBarComponent                                     |
| `hasEditorUndo$` / `hasEditorRedo$`    | `ChordproService`               | content change → Ace UndoManager                    | HeaderActionsBarComponent                                     |
| `isRemovableChordEnabled$`             | `ChordproService`               | Ace cursor position listener                        | FooterActionsBarComponent                                     |
| `areLyricsDisplayed$`                  | `ChordproService`               | BottomSheetSettings toggle                          | CSS class `js-are-lyrics-hided` on `document.body`            |
| `isWakeLock$` (the intention)          | `AppContextService`             | BottomSheetSettings toggle                          | `WakeLockService` (constructor subscription)                  |
| `isKeptAwake$` (the reality)           | `WakeLockService`               | lock granted, released, or taken back by the system | BottomSheetSettings — the two diverge, hence both             |
| `isBluetoothKeptAlive$`                | `AppContextService`             | BottomSheetSettings toggle                          | `BluetoothKeepAliveService` (constructor subscription)        |
| `user$`                                | `AuthService`                   | Firebase `onAuthStateChanged`                       | `CachedFilesService`, `BeforeUnloadService`, `LoginComponent` |
| `cachedFiles$`                         | active `ICachedFilesRepository` | after every open/save                               | `CachedFilesService` → `BottomSheetManageFileComponent`       |
| `zoomStep$`                            | `ZoomService`                   | +/- buttons in Header                               | `font-size` on the `<html>` element, which scales every `rem` |
| `status$` / `currentNote$` / `frames$` | `PitchDetectionService`         | microphone blocks, or a decoded audio file          | `PitchMonitorComponent`                                       |

## Dialog & Bottom Sheet Wiring

| Opened by                             | Component                               | Data in                 | On dismiss / result                                                        |
| ------------------------------------- | --------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| HeaderActionsBarComponent             | `BottomSheetManageFileComponent`        | —                       | file ops; calls `requestEditorFocus()`                                     |
| HeaderActionsBarComponent             | `BottomSheetToolsComponent`             | —                       | opens external tool dialogs                                                |
| HeaderActionsBarComponent             | `BottomSheetSettingsComponent`          | —                       | settings toggles                                                           |
| FooterActionsBarComponent             | `BottomSheetInsertDirectiveComponent`   | —                       | inserts `{directive:}` via ChordproService                                 |
| FooterActionsBarComponent             | `DialogSelectChordComponent`            | —                       | on select: `chordproService.insertChord(name)`                             |
| ChordproViewerComponent (chord click) | `DialogDiagramChordComponent`           | `{ chordName: string }` | read-only chord diagram                                                    |
| BottomSheetToolsComponent             | `DialogExternalToolComponent`           | `{ src: string }`       | iframe embed (lyrics.ovh, songbpm.com, etc.)                               |
| BottomSheetToolsComponent             | `DialogSoloTabEditorComponent`          | —                       | standalone tab grid generator                                              |
| BottomSheetToolsComponent             | `DialogImportChordsOverLyricsComponent` | —                       | result inserted at the caret                                               |
| DialogSoloTabEditorComponent          | `PitchMonitorComponent` (inline)        | —                       | emits `transcribed`, appended to the editor                                |
| BottomSheetManageFileComponent        | `DialogFileGalleryComponent`            | —                       | full song library: open, download, delete, import via `CachedFilesService` |

All bottom sheets call `chordproService.requestEditorFocus()` on dismiss to restore Ace editor focus.

## Keyboard Shortcuts (KeyboardShortcutService)

A single `keydown` listener on `document`, which stands down entirely while a
Material overlay is open (`.cdk-overlay-backdrop-showing`). The bindings
themselves are one chain in that service and are not copied here — the copy that
used to be got them wrong, listing Ctrl+Shift+S as working for months after it
had stopped.

## Humming a Solo

A separate chain from the ChordPro pipeline, meeting it only at the solo tab
editor's textarea:

```
microphone / audio file → PitchDetectionService (AubioLoaderService → aubio)
  → PitchFrame { timeMs, frequency, isOnset } → frames$
    → PitchTraceUtil (trace) · PitchUtil (read-out)
    → NoteSegmentationUtil → FretboardUtil → SoloTabInputUtil
      → appended to the textarea → SoloTabUtil → the ASCII tab
```

Everything from `PitchFrame` rightwards is pure and lives in `src/app/utils/`.
`PitchDetectionService` is the only place that touches Web Audio and
`AubioLoaderService` the only one that touches aubio — the same boundary
Firebase has, for the same reason. **The octave shift is applied on the way to
the tab, never to the display**, so the player can see the tool heard them
correctly. How the detection works: the `web-audio-pitch` skill.

## isEditing Mode

`AppContextService.isEditing$` is the main UI mode switch:

- `true` (edit mode): Ace editor visible, Footer shows chord insert/remove tools, ChordsViewer allows clicking diagrams to insert chords at cursor
- `false` (preview mode): editor hidden, viewer takes full space, chord tools hidden

`AppComponent` adds/removes the CSS class `is-editing` on its host element based on this flag.

## Unsaved Changes Guard

`chordproService.hasUnsavedChanges()` compares `chordproSaveState$` (snapshot at last open/save) against the current `{ fileHandle, chordproContent }`.

Used in two places: `window.beforeunload` (`BeforeUnloadService` triggers the browser's
native warning and saves a draft to localStorage) and before `openFile()` or
`newFile()` (a `ConfirmService` dialog).

Draft structure stored under the `DRAFT` localStorage key: `{ chordproContent: string, hasUnsavedChanges: boolean }`.

## LocalStorage Keys

Three keys, each owned by one service and declared as a constant in it:
`BeforeUnloadService` (the draft), `CachedFilesService` (recent files) and
`ZoomService` (the zoom step). The names and the stored shapes live in those
files rather than being copied here, where they would go stale unnoticed.

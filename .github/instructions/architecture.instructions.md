---
description: "Use when working on component interactions, data flows, state transitions, service wiring, or any feature that spans multiple files. Describes the full runtime architecture of the Guitab app."
---

# Guitab Runtime Architecture

## Component Tree

`AppComponent` is the root. It directly renders:

```
AppComponent
├── HeaderActionsBarComponent          (top toolbar)
├── <div.content>
│   ├── <div.container-chordpro>
│   │   ├── ChordproEditorComponent    (Ace editor widget)
│   │   └── ChordproViewerComponent    (rendered chord sheet)
│   └── ChordproChordsViewerComponent  (SVG chord diagrams grid)
└── FooterActionsBarComponent          (bottom toolbar)
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
  └─> chordproService.hasUnsavedChanges() → confirm() if needed
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
  ├─> If FileSystemFileHandle exists:
  │     fileHandle.createWritable() → write → close
  │     chordproService.updateChordproSaveState()  (clears unsaved flag)
  │     snackBar.open(...)  (success feedback)
  └─> Else: saveFileAs() → showSaveFilePicker() or FileSaver.saveAs(blob)

Both paths: cachedFilesService.saveFile(content) to update localStorage history.
```

`saveFileAs()` builds the filename via `ChordproUtil.buildFileName(content)` → extracts `{title:}` and `{artist:}` → `"Title (Artist).cho"`.

## App Bootstrap & Draft Recovery

On startup, `AppComponent.ngOnInit()` reads `ActivatedRoute.queryParamMap`:

- `?load=demo` → `FileUtil.loadSampleFile()` → `setFileHandle()` → `setEditing(true)`
- Otherwise → `beforeUnloadService.findDraftUnsavedChordproContent()`:
  - If a draft with `hasUnsavedChanges: true` exists in localStorage → restore it via `chordproService.setChordproContent(draftContent)`
  - Otherwise → `FileUtil.loadEmptyFile()` → blank slate

## Service Dependency Graph

```
AppContextService        ← holds file handle, editing mode, wake lock, Bluetooth
     ↓ injected by
ChordproService          ← subscribes to fileHandleWithContent$ in constructor
     ↓ injected by
KeyboardShortcutService  ← file operations (open/save/undo/redo)
BeforeUnloadService      ← hasUnsavedChanges() + draft in localStorage
HeaderActionsBarComponent
FooterActionsBarComponent
BottomSheetManageFileComponent
BottomSheetSettingsComponent

LocalStorageService ← used by ZoomService, CachedFilesService, BeforeUnloadService
```

`AppContextService` and `ChordproService` are the two most central services. Any feature touching file content or rendering will flow through both.

## State Ownership

| State | Owner | Changed by | Consumed by |
|-------|-------|------------|-------------|
| `chordproContent$` | `ChordproService` | editor mutations, file open, undo/redo | ViewerComponent, ChordsViewer, FooterBar |
| `fileHandleWithContent$` | `AppContextService` | open file, new file | ChordproService, BottomSheet, KeyboardShortcut |
| `isEditing$` | `AppContextService` | UI buttons, file open/new | Header, Footer, AppComponent (CSS class), ChordsViewer |
| `chordproSaveState$` | `ChordproService` | file open, file save | `hasUnsavedChanges()`, BeforeUnloadService |
| `youTubeUrl$` | `ChordproService` | auto-parsed from `{meta:youtube}` on content change | FooterActionsBarComponent |
| `hasEditorUndo$` / `hasEditorRedo$` | `ChordproService` | content change → Ace UndoManager | HeaderActionsBarComponent |
| `isRemovableChordEnabled$` | `ChordproService` | Ace cursor position listener | FooterActionsBarComponent |
| `areLyricsDisplayed$` | `ChordproService` | BottomSheetSettings toggle | CSS class `js-are-lyrics-hided` on `document.body` |
| `isWakeLock$` | `AppContextService` | BottomSheetSettings toggle | `WakeLockUtil.setWakeLock()` (constructor subscription) |
| `isBluetoothKeptAlive$` | `AppContextService` | BottomSheetSettings toggle | `BluetoothUtil.setBluetoothKeptAlive()` (constructor subscription) |
| `cachedFiles$` | `CachedFilesService` | after every open/save | BottomSheetManageFileComponent |
| `zoomStep$` | `ZoomService` | +/- buttons in Header | CSS `--zoom` variable on `<html>` element |

## Dialog & Bottom Sheet Wiring

| Opened by | Component | Data in | On dismiss / result |
|-----------|-----------|---------|---------------------|
| HeaderActionsBarComponent | `BottomSheetManageFileComponent` | — | file ops; calls `requestEditorFocus()` |
| HeaderActionsBarComponent | `BottomSheetToolsComponent` | — | opens external tool dialogs |
| HeaderActionsBarComponent | `BottomSheetSettingsComponent` | — | settings toggles |
| FooterActionsBarComponent | `BottomSheetInsertDirectiveComponent` | — | inserts `{directive:}` via ChordproService |
| FooterActionsBarComponent | `DialogSelectChordComponent` | — | on select: `chordproService.insertChord(name)` |
| ChordproViewerComponent (chord click) | `DialogDiagramChordComponent` | `{ chordName: string }` | read-only chord diagram |
| BottomSheetToolsComponent | `DialogExternalToolComponent` | `{ src: string }` | iframe embed (lyrics.ovh, songbpm.com, etc.) |
| BottomSheetToolsComponent | `DialogSoloTabEditorComponent` | — | standalone tab grid generator |

All bottom sheets call `chordproService.requestEditorFocus()` on dismiss to restore Ace editor focus.

## Keyboard Shortcuts (KeyboardShortcutService)

Listens on `document` `keydown`. Skipped entirely when a Material overlay is open (`.cdk-overlay-backdrop-showing`).

| Shortcut | Method | Action |
|----------|--------|--------|
| Ctrl+Z | `undo()` | `chordproService.undoContent()` |
| Ctrl+Y / Ctrl+Shift+Z | `redo()` | `chordproService.redoContent()` |
| Ctrl+Alt+N | `newFile()` | check unsaved → load empty.cho → `setEditing(true)` |
| Ctrl+O | `openFile()` | check unsaved → file picker → open |
| Ctrl+S | `saveFile()` | save to fileHandle, or trigger Save As |
| Ctrl+Shift+S | `saveFileAs()` | `showSaveFilePicker()` or browser download fallback |

## isEditing Mode

`AppContextService.isEditing$` is the main UI mode switch:

- `true` (edit mode): Ace editor visible, Footer shows chord insert/remove tools, ChordsViewer allows clicking diagrams to insert chords at cursor
- `false` (preview mode): editor hidden, viewer takes full space, chord tools hidden

`AppComponent` adds/removes the CSS class `is-editing` on its host element based on this flag.

## Unsaved Changes Guard

`chordproService.hasUnsavedChanges()` compares `chordproSaveState$` (snapshot at last open/save) against the current `{ fileHandle, chordproContent }`.

Used in three places:
1. `window.beforeunload` — `BeforeUnloadService` triggers browser native warning, saves draft to localStorage
2. Before `openFile()` — confirmation dialog
3. Before `newFile()` — confirmation dialog

Draft structure stored under the `DRAFT` localStorage key: `{ chordproContent: string, hasUnsavedChanges: boolean }`.

## LocalStorage Keys

| Key | Owner service | Stored value |
|-----|--------------|--------------|
| `DRAFT` | `BeforeUnloadService` | `{ chordproContent: string, hasUnsavedChanges: boolean }` |
| `CACHED_FILES` | `CachedFilesService` | `CachedFile[]` — `{ name, chordproContent, date }` |
| `ZOOM` | `ZoomService` | `number` (step value, -10 to +10) |

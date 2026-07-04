# Guitab — Copilot Instructions

## What This App Does

Guitab is a **ChordPro guitar chord/tab editor and viewer** — a Progressive Web App (PWA) for musicians to edit, view, and perform chord charts in the ChordPro format. It runs entirely in the browser with no backend.

## Tech Stack

- **Angular 17** (standalone components — no NgModules)
- **TypeScript 5.4** (strict mode: all strict flags enabled)
- **Angular Material 17** (dialogs, bottom sheets, buttons, lists, icons)
- **RxJS 7** (BehaviorSubjects for state, Observables for async data flow)
- **chordproject-parser** — parses ChordPro text into HTML for rendering
- **chordproject-editor** — external editor widget for ChordPro text input
- **svguitar** — renders SVG guitar chord diagrams
- **ngx-toastr** — toast notifications
- **Karma + Jasmine** — unit testing

## Project Structure

```
src/app/
├── components/   # Standalone UI components (14 total)
├── services/     # Root-provided singleton services (7 total)
├── types/        # TypeScript interfaces and type helpers
└── utils/        # Utility classes with static methods only
```

## Architecture Rules

- **No NgModules**: every component is `standalone: true` and imports its own dependencies
- **OnPush everywhere**: all components use `changeDetection: ChangeDetectionStrategy.OnPush`
- **inject() over constructor**: dependencies are injected with `inject()` at field declaration, not via constructor parameters
- **BehaviorSubject for state**: services expose state as `private readonly foo$ = new BehaviorSubject<T>(initial)`, surfaced as `getFoo$(): Observable<T> { return this.foo$.asObservable(); }` and `getFoo(): T { return this.foo$.getValue(); }`
- **Unsubscribe pattern**: components use `private readonly unsubscribe$ = new Subject<void>()` with `takeUntil(this.unsubscribe$)` in `ngOnInit`, and `this.unsubscribe$.next()` in `ngOnDestroy`
- **Static utilities**: util classes contain only static methods, never instantiated

## Naming Conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| Component | `kebab-name/kebab-name.component.ts` | `chordpro-editor.component.ts` |
| Service | `kebab-name/kebab-name.service.ts` | `chordpro.service.ts` |
| Utility | `kebab-name.util.ts` | `svg-guitar.util.ts` |
| Type | `kebab-name.type.ts` | `cached-file.type.ts` |
| Spec | `*.spec.ts` alongside source | `chordpro.service.spec.ts` |

## Key Services

| Service | Purpose |
|---------|---------|
| `AppContextService` | Global app state: file handle, editing mode, wake lock, Bluetooth keep-alive |
| `ChordproService` | Core editing engine: content, undo/redo history, chord insert/remove, YouTube URL |
| `KeyboardShortcutService` | Global keyboard shortcuts (Ctrl+Z, Ctrl+S, Ctrl+O, etc.) |
| `BeforeUnloadService` | Unsaved-change detection + LocalStorage draft caching |
| `LocalStorageService` | Typed BehaviorSubject wrappers backed by localStorage |
| `CachedFilesService` | Recently opened files metadata (name, content, date) |
| `ZoomService` | Font-size zoom (+/- steps), persisted to localStorage |

## Build & Test Commands

```bash
npm test           # Run unit tests (Karma + Jasmine) 
npm run build      # Production build → docs/ (GitHub Pages)
npm start          # Dev server at localhost:4200
```

## Domain Vocabulary

- **ChordPro**: text markup format for chord charts. Chords inline as `[ChordName]`, directives as `{key: value}`.
- **Variant**: a specific fingering of a chord (frets, fingers, barres, baseFret, capo, midi)
- **Custom chord**: user-defined via `{define: ChordName base-fret N frets X X X X X X}`
- **Cached file**: recently opened file stored in localStorage (name + content + date)
- **SaveState**: snapshot of (fileHandle + content) used to detect unsaved changes
- Supported file extensions: `.cho`, `.crd`, `.chopro`, `.chord`, `.pro`

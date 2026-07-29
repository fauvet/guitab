# Guitab — Copilot Instructions

## What This App Does

Guitab is a **ChordPro guitar chord/tab editor and viewer** — a Progressive Web App (PWA) for musicians to edit, view, and perform chord charts in the ChordPro format. It runs entirely in the browser with no backend.

## Tech Stack

- **Angular 22** (standalone components — no NgModules)
- **TypeScript 5.4** (strict mode: all strict flags enabled)
- **Angular Material 22** (dialogs, bottom sheets, buttons, lists, icons)
- **RxJS 7** (BehaviorSubjects for state, Observables for async data flow)
- **Firebase 11** — Authentication (anonymous + Google) + Firestore (cloud persistence with IndexedDB offline)
- **chordproject-parser** — parses ChordPro text into HTML for rendering
- **chordproject-editor** — external editor widget for ChordPro text input
- **svguitar** — renders SVG guitar chord diagrams
- **Vitest** — unit testing (Karma + Jasmine removed)

## Project Structure

```
src/
├── environments/
│   ├── environment.template.ts   # shape committed to git
│   └── environment.ts            # Firebase credentials — git-ignored (created locally or via CI secrets)
src/app/
├── components/   # Standalone UI components (15 total, incl. LoginComponent)
├── services/     # Root-provided singleton services
│   ├── auth/         # AuthService — Firebase Auth (anonymous + Google)
│   ├── firebase/     # FirebaseService — app init + Firestore
│   ├── app-context/
│   ├── before-unload/
│   ├── cached-files/
│   ├── chordpro/
│   ├── keyboard-shortcut/
│   ├── local-storage/
│   └── zoom/
├── storage/      # Persistence abstraction layer
│   ├── repositories/  # ICachedFilesRepository, IDraftRepository interfaces + InjectionTokens
│   ├── local/         # localStorage implementations
│   └── firebase/      # Firestore implementations
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
| `BeforeUnloadService` | Unsaved-change detection + draft persistence via `IDraftRepository` |
| `LocalStorageService` | Typed BehaviorSubject wrappers backed by localStorage (used by ZoomService and local repositories) |
| `CachedFilesService` | Recently opened files — delegates to active `ICachedFilesRepository` |
| `ZoomService` | Font-size zoom (+/- steps), persisted to localStorage |
| `FirebaseService` | Initializes Firebase app + Firestore with IndexedDB offline persistence |
| `AuthService` | Firebase Auth — anonymous sign-in on startup, Google link/sign-in, exposes `isAnonymous()` |

## Build & Test Commands

```bash
npm test           # Run unit tests (Vitest)
npm run build      # Production build → docs/ (GitHub Pages)
npm start          # Dev server at localhost:4200
```

## Firebase Setup

- **Single Firebase environment**: there is no dev/prod split — local dev and the deployed app both use the same project (`guitab-8b990`)
- Config shape in `src/environments/environment.template.ts` (committed)
- Actual values go in `environment.ts` — **git-ignored**; created locally by copying the template, and generated in CI from GitHub secrets
- `firestore.rules` at project root — deploy with `firebase deploy --only firestore:rules`
- Requires Firebase project **guitab-8b990** with **Anonymous Auth** and **Google Sign-in** enabled

## Persistence Architecture

All persistence goes through repository interfaces in `src/app/storage/repositories/`:

| Interface | Data | Firestore path |
|-----------|------|----------------|
| `ICachedFilesRepository` | `CachedFile[]` (recently opened files) | `/users/{uid}/cachedFiles/{fileId}` |
| `IDraftRepository` | `Draft` (unsaved content) | `/users/{uid}/draft` |

Each interface has two implementations: `local/` (localStorage) and `firebase/` (Firestore).

`CachedFilesService` and `BeforeUnloadService` inject both and delegate to the Firestore implementation when `AuthService.getUser()` is non-null, falling back to localStorage. Since `AuthService` signs in anonymously on startup, a Firebase `uid` is almost always available.

**Rules:**
- Never call `localStorage` directly in services — use `LocalStorageService.buildBehaviorSubject()` or a repository
- Never add persistence logic directly in `CachedFilesService` or `BeforeUnloadService` — implement a new repository instead
- Firestore documents must include `ownerId`, `createdAt`, `updatedAt` (enforced by security rules)

## Domain Vocabulary

- **ChordPro**: text markup format for chord charts. Chords inline as `[ChordName]`, directives as `{key: value}`.
- **Variant**: a specific fingering of a chord (frets, fingers, barres, baseFret, capo, midi)
- **Custom chord**: user-defined via `{define: ChordName base-fret N frets X X X X X X}`
- **Cached file**: recently opened file persisted in Firestore `/users/{uid}/cachedFiles/` (name + content + date)
- **Draft**: unsaved in-progress content stored in Firestore `/users/{uid}/draft` (`{ chordproContent, hasUnsavedChanges }`)
- **SaveState**: snapshot of (fileHandle + content) used to detect unsaved changes — in-memory only, not persisted
- **Repository**: interface abstracting a persistence backend; implementations in `storage/local/` and `storage/firebase/`
- **Anonymous user**: Firebase Auth user with `isAnonymous: true` — created automatically on startup, can be upgraded to a Google account via `linkWithPopup` (preserves `uid` and data)
- **Tenant**: per-user data space in Firestore at `/users/{uid}/`; currently personal only (no sharing between users)
- Supported file extensions: `.cho`, `.crd`, `.chopro`, `.chord`, `.pro`

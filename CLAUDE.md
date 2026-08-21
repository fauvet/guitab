# GuiTab — CLAUDE.md

A ChordPro chord-chart editor and viewer, shipped as an installable PWA. Everything
runs in the browser; Firebase provides sign-in and per-user cloud storage, nothing
else. It also captures a hummed melody through the microphone and turns it into an
ASCII tab.

## Hard rules

1. **Every component is standalone and `OnPush`.** No NgModules, no default change
   detection. Dependencies come from `inject()` at field level, never from a
   constructor parameter.
2. **Never touch Firebase outside `src/app/services/` and `src/app/storage/`.**
   Components call a service; persistence goes through a repository interface.
   ESLint enforces this.
3. **Never touch Web Audio outside the two services that own it** — pitch
   detection and the Bluetooth keep-alive. Same boundary, same reason: it is
   what keeps the musical logic testable without a microphone. ESLint enforces
   this too, on the globals rather than on imports.
4. **State lives in a private `BehaviorSubject`**, exposed as `getFoo$()` and
   `getFoo()`. Components subscribe with `takeUntil(this.unsubscribe$)` and fire
   `unsubscribe$.next()` in `ngOnDestroy`. A leaked subscription is a bug.
5. **A util is a class of static methods and nothing else.** Pure in, pure out, no
   `inject()`, no side effect. If it needs a dependency it is a service.
6. **No `any`.** The only sanctioned cast is at a boundary where data genuinely
   arrives untyped — a Realtime Database snapshot, a WASM return value.
7. **Never restate what the code already says.** Versions, file trees, route
   tables, coverage numbers: link to the file, never copy it. The test: could a
   commit that does not touch this document make the sentence false? Then the code
   should be the one saying it.
8. **Every dependency added must be GPL-3.0 compatible.** See
   `.claude/rules/dependencies-licensing.instructions.md`.
9. **Never commit or push unless explicitly asked.**
10. **Never call `MatSnackBar` outside `src/app/services/notification/` and
    `src/app/components/`.** Services and repositories throw or reject with a
    clear `Error` instead; only a component decides how a failure reaches the
    screen. ESLint enforces this. See "Errors are never swallowed" in
    `.claude/rules/engineering-principles.instructions.md`.

## Tech stack

Angular 22 (standalone, OnPush) · TypeScript strict · Angular Material 22 · RxJS 7 ·
Firebase Auth + Realtime Database · Vitest 4 · aubio (WebAssembly) for pitch and
onset detection. Exact versions: `package.json`.

## Project structure

```
src/app/
├── components/   # standalone UI, one folder per component
├── services/     # root singletons — the only place with side effects
├── storage/      # repository interfaces + local/ and firebase/ implementations
├── types/        # shared interfaces
└── utils/        # static-method classes, pure, no framework
```

The one-way rule: `components/ → services/ → storage/ → firebase`, and every layer
may call `utils/`. Nothing ever points back up. Full runtime picture, data flows and
state ownership: `.claude/rules/architecture.instructions.md`.

## Commands

```bash
npm start              # dev server on localhost:4200
npm run build          # production build into docs/
npm test               # unit tests (Vitest via the Angular unit-test builder)
npm run test:coverage  # same, with the thresholds enforced in angular.json
npm run lint           # ESLint (lint:fix to autofix)
npm run format         # Prettier (format:check in CI)
npm run check:docs     # instruction-tree integrity
npm run setup:env      # dummy src/environments/environment.ts, for CI and fresh clones
npm run verify         # everything above, in the order CI runs it
npm run start:agent    # dev server on localhost:4205 against the Firebase emulators, not npm start's port or the real project
npm run emulators:agent  # the Firebase Auth + Database emulators start:agent talks to
```

`src/environments/environment.ts` is git-ignored. A fresh clone has to run
`npm run setup:env` — or copy the template by hand — before anything builds.
`start:agent`/`emulators:agent` exist so an agent can run and click through the
app without colliding with a developer's own `npm start` or touching the real
Firebase project — see `.claude/skills/dev-server/SKILL.md`.

## Where the rules live

Read the matching document **before** you start, not after:

- Any component: `.claude/rules/angular-components.instructions.md`
- Any service: `.claude/rules/angular-services.instructions.md`
- Any test, or any code that will need one: `.claude/rules/testing.instructions.md`
- A feature spanning several files, or any doubt about data flow:
  `.claude/rules/architecture.instructions.md`
- Naming, error handling, size budgets, DRY as applied here:
  `.claude/rules/engineering-principles.instructions.md`
- Styling and layout: `.claude/rules/styling.instructions.md`
- Anything a user can see, click or hear:
  `.claude/rules/accessibility.instructions.md`
- Whether an interaction is the right one — confirmation vs. undo, feedback
  wording, consistency: `.claude/rules/ux.instructions.md`
- Adding a dependency: `.claude/rules/dependencies-licensing.instructions.md`
- Committing, branching, reviewing: `.claude/rules/git-workflow.instructions.md`
- Editing any `.md` in this repo: `.claude/rules/documentation.instructions.md`

Domain and stack knowledge lives in `.claude/skills/` — one skill per brick of the
stack, loaded on demand rather than read every session.

## One tree, one owner per topic

`.github/copilot-instructions.md`, `.github/instructions/` and `.github/skills/`
are **symlinks** into this tree. One content, two toolchains, no duplication.
`npm run check:docs` fails the build if any of them becomes a real file again — a
second tree is how the last one ended up contradicting itself.

If two documents describe the same thing, one of them is wrong. Update the owner and
link from anywhere else.

| Topic                                             | Owner                                    |
| ------------------------------------------------- | ---------------------------------------- |
| Versions, file lists, coverage thresholds, routes | the code and config themselves           |
| Runtime architecture, data flows, state ownership | the architecture rule document           |
| How to write code today                           | the matching `.claude/rules/*.md`        |
| How a library or a format works                   | the matching `.claude/skills/*/SKILL.md` |

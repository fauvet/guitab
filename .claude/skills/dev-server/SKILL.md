---
name: dev-server
description: How an agent should launch and drive GuiTab locally without colliding with the developer's own `npm start` or writing test data into the real Firebase project — the isolated port and build configuration to use, the Firebase Emulator Suite scripts, and how to drive the browser. Use whenever running the app to verify a UI change, not just `npm test`/`npm run build`.
---

# Running GuiTab as an agent

Two things an agent must never do to the developer: steal their dev server's
port, or write throwaway test data into the real, single Firebase project this
app has (`environment.ts` holds `guitab-8b990` — there is no separate
staging/dev project, by design, see `environment.template.ts`). Both are
solved by a dedicated build configuration and two npm scripts — not by faking
credentials or intercepting network requests by hand.

## Serve on 4205, never 4200

The developer keeps their own `ng serve` on **port 4200**; `ng serve` refuses
to share a port rather than silently picking another one. `npm run
start:agent` (`ng serve --configuration agent`) is pinned to **port 4205** in
`angular.json`'s `serve.configurations.agent` — use it, don't pass `--port`
yourself, and never touch port 4200 at all, not even to check it.

## Firebase: the local Emulator Suite, not a fake project

The "agent" build configuration also file-replaces
`src/environments/firebase-emulator.ts` (default: `FIREBASE_EMULATOR_CONFIG =
null`) with `firebase-emulator.agent.ts`, which points `FirebaseService` and
`AuthService` at `127.0.0.1:9099`/`:9000` via `connectAuthEmulator`/
`connectDatabaseEmulator`. `environment.ts` itself — the real project
config — is never touched or duplicated; the emulator redirects the same SDK
calls to a local, ephemeral, in-memory backend instead of intercepting or
faking anything client-side.

Start both, in the background, before opening the app:

```bash
lsof -ti:9099,9000,4400,4500 -sTCP:LISTEN | xargs -r kill   # leaked previous run
nohup npm run emulators:agent > /tmp/.../emulators.log 2>&1 &  # firebase emulators:start --only auth,database
timeout 60 bash -c 'until curl -sf http://127.0.0.1:9099 >/dev/null; do sleep 1; done'

lsof -ti:4205 -sTCP:LISTEN | xargs -r kill
nohup npm run start:agent > /tmp/.../agent-server.log 2>&1 &
timeout 60 bash -c 'until curl -sf http://localhost:4205 >/dev/null; do sleep 1; done'
```

Stop both when done — `firebase emulators:start` always opens an internal hub
(4400) and reserves 4500 alongside the auth/database ports:

```bash
lsof -ti:4205,9099,9000,4400,4500 -sTCP:LISTEN | xargs -r kill
```

**If the emulators aren't running**, `npm run start:agent` still works: the
emulator connection attempt just fails fast (connection refused), anonymous
sign-in never resolves, and `CachedFilesService`/the draft repository stay on
`localStorage` — enough for anything that doesn't need Firebase at all (most
UI/layout checks). Start the emulators too for anything that saves, imports,
signs in, or opens the Song library with seeded data.

**With the emulators running, use the real UI** — Import a file, click Save —
instead of seeding `localStorage` by hand. It now safely round-trips through
the local Realtime Database emulator. To inspect what landed there:

```bash
curl -s "http://127.0.0.1:9000/.json?ns=guitab-8b990-default-rtdb"
```

(The namespace is derived from the real `databaseURL` in `environment.ts`,
not from the `--project demo-guitab` flag `emulators:agent` passes — that
flag only scopes the Auth emulator's project association.)

## Driving the browser

`chromium-cli` is not installed in this environment. Use Playwright directly —
it's already a project dependency, and its Chromium binary is pre-installed:

```bash
npx --no-install playwright install --dry-run chromium   # confirms the cache path, no download
node some-script.mjs   # a plain script using `import { chromium } from "playwright"`
```

Headless Chromium exposes `showOpenFilePicker` (`FileUtil.canOpenFilePicker()`
returns `true`), so `DialogFileGalleryComponent`'s Import button calls it
directly — and it hangs forever with no OS dialog to answer. To test Import,
strip it before navigating so the app takes its own existing fallback path
(the hidden `<input type="file">`), then drive that input directly:

```js
await page.addInitScript(() => {
  delete window.showOpenFilePicker;
});
// ...
await page
  .locator(".file-input")
  .setInputFiles({ name: "song.cho", mimeType: "text/plain", buffer: Buffer.from("...") });
```

Write throwaway scripts to the scratchpad or the repo root and delete them
before finishing — `git status --short` should show only the files actually
meant to change.

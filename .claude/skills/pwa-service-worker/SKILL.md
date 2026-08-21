---
name: pwa-service-worker
description: GuiTab as an installable PWA — the Angular service worker and its caching groups, the web manifest and its file handlers, the GitHub Pages deployment quirks, and why a change can appear not to ship. Use when touching ngsw-config.json, the manifest, the deploy workflow, or when the deployed app is serving stale code.
---

# The PWA layer

GuiTab installs to a phone's home screen, opens `.cho` files from the file manager,
and works offline. Three pieces make that true, and each has a way of failing
quietly.

## The service worker

Registered from `app.config.ts`, configured by `ngsw-config.json`, and **enabled only
in production builds**. `npm start` has no service worker at all, which is deliberate
— caching during development is a way to lose an afternoon — but it also means
service-worker behaviour cannot be tested with the dev server. Build and serve
`docs/` to see it.

Two asset groups:

- **`app`** — `index.html`, the JS and CSS bundles, the manifest. `installMode:
"prefetch"`: fetched during installation, so the shell is available offline
  immediately.
- **`assets`** — everything under `/assets/**` plus fonts and images.
  `installMode: "lazy"` with `updateMode: "prefetch"`: not downloaded until first
  requested, but refreshed eagerly once known.

**Anything the app fetches at runtime and is not listed here will not be cached**,
and will therefore fail offline. A lazily loaded chunk is handled by the build's
hashed-asset list, but a file added to `src/assets/` at runtime — a WebAssembly
binary, a model — is worth checking rather than assuming.

### Updates arrive on the second visit

This is the behaviour that generates most "my fix did not deploy" reports. The
service worker serves the cached version, downloads the new one in the background,
and activates it on the **next** load. A user who opens the app once after a deploy
sees the old code, and they are not wrong.

`SwUpdate` from `@angular/service-worker` can surface a "reload for the new version"
prompt. There is none today; if the staleness starts to matter, that is the fix, not
disabling the cache.

To clear the slate while debugging: unregister the worker and clear storage in the
browser's application panel. A hard refresh alone is not enough.

## The manifest

`src/manifest.webmanifest`, listed in `angular.json`'s assets so it ships to the
build output.

`display: "standalone"` is what removes the browser chrome once installed — worth
remembering when a layout looks different on a phone from in a tab: there is no
address bar, and the viewport is taller.

`file_handlers` is the interesting part. It registers the app as a handler for
`.cho`, `.crd`, `.chopro`, `.chord` and `.pro`, so opening one from the file manager
launches GuiTab. This list must stay in step with `ChordproUtil.EXTENSIONS`
and the file picker's accept types — three places, one fact, and nothing checks
them against each other. Changing one means changing all three.

Icons are a single SVG declared at many sizes. That works and keeps the repo simple;
some platforms prefer raster icons for the splash screen, so a missing splash on a
particular Android version is a known limitation rather than a bug.

## Deployment, and its two surprises

`npm run build` outputs into **`docs/`**, not `dist/`, because that is what GitHub
Pages serves. `docs/` is git-ignored despite the name.

The CI workflow then does two things that look like hacks and are not:

- It flattens `docs/browser/*` up into `docs/`. The Angular application builder emits
  a `browser/` subdirectory that Pages will not look inside.
- It copies `index.html` to `404.html`. Pages has no rewrite rules, so a deep link
  would 404; serving the app from the 404 page is the standard SPA workaround. If
  routing ever breaks on a refresh but works on navigation, this is why.

`baseHref` is `/guitab/` in `angular.json`, matching the repository-name path Pages
serves from. A change to the hosting location means changing it, the manifest's
`scope` and `start_url` together.

## Offline is a feature, not a side effect

The app is meant to be usable on stage with no signal. The service worker covers the
code side unconditionally. The data side is thinner than it looks: Realtime
Database's web client has no disk persistence, so a cached file or draft is only
available offline if the local (`localStorage`) repository already has it — see
`.claude/skills/firebase-realtime-database/SKILL.md`. Before adding anything that
fetches at runtime, ask what it does with no network — and make the failure visible
rather than a silent empty state.

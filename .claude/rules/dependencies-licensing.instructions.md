---
description: "Use before adding, upgrading or replacing any npm dependency. Covers GPL-3.0 compatibility, the questions to ask before taking on a package, and the bundle budget."
applyTo: "package.json"
---

# Dependencies and licensing

## GuiTab is GPL-3.0-or-later

This is not an incidental fact about the repo — it constrains every dependency
added from now on, and it was a deliberate trade. The full rationale is in
`README.md`; the short version is that real-time **onset detection** has no
permissively licensed implementation in the browser, aubio has one, and aubio is
GPL.

### The compatibility table

| Licence of the dependency | Verdict |
| ------------------------- | ------- |
| MIT, ISC, BSD-2/3, Apache-2.0, Unlicense, CC0 | ✅ Compatible, and **preferred at equal quality** |
| GPL-2.0-or-later, GPL-3.0, LGPL | ✅ Compatible |
| GPL-2.0-**only** | ❌ Incompatible with GPL-3.0 — no upgrade clause |
| AGPL-3.0 | ❌ Stronger copyleft; taking it on would relicense the app again |
| SSPL, BUSL, "source available", Commons Clause | ❌ Not free software |
| No licence field, no LICENSE file | ❌ Treat as all rights reserved |

Being compatible is not being welcome. A permissive dependency keeps the door open
for the parts of this codebase that could one day be extracted; a copyleft one
closes it further. Reach for GPL only when it buys a capability nothing else has —
which has happened exactly once.

### Check it, do not assume it

```bash
npm view <package> license
```

`npm view` reports the `license` **field**, which is the publisher's claim, not a
verdict. Two traps have already bitten this repo:

- **The field can be missing** while the code is plainly licensed — read the
  bundled `LICENSE` file.
- **The wrapper and the payload can disagree.** `aubiojs` ships an MIT notice for
  its JavaScript glue, but the WebAssembly it embeds is compiled aubio, which is
  GPL-3.0. The licence of the artifact you ship is the strictest one inside it, not
  the one on the wrapper. Always look at what the package actually contains.

## Before adding anything at all

In order, and stop at the first "yes":

1. **Can the platform do it?** The Web Audio API, the File System Access API and
   `Intl` already cover a surprising amount.
2. **Can twenty lines in `src/app/utils/` do it?** A static-method util is pure,
   testable without mocks, and never becomes an upgrade problem. Note-naming,
   fret mapping and octave arithmetic all live there for exactly this reason.
3. **Is it maintained, typed and tree-shakeable?** Check the date of the last
   release, whether it ships its own types, and whether it is ESM.

Every dependency is permanent in practice. Removing one is a project; adding one is
a click.

## Weight

The production budgets are in `angular.json` and CI fails on them — do not restate
the numbers here, they move.

What matters is *where* the weight lands. A heavy dependency behind a dynamic
`import()` costs nothing until the user opens the feature that needs it, and that is
how both audio engines are loaded: the app shell must never pay for a microphone the
user has not switched on. If a package cannot be loaded lazily and does not fit the
initial budget, it is not an option.

## Recording the decision

A dependency taken on for a non-obvious reason gets one line in `CHANGELOG.md` and,
if it changed the shape of the app, a paragraph in the skill that covers it. The
next person to wonder "why is this here?" should not have to read git history.

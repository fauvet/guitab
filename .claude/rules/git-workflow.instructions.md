---
description: "Use before committing, branching, opening a pull request or reviewing one. Covers commit format, the definition of done, and the order to read a diff in."
---

# Git, review and definition of done

## The pre-commit hook is the floor, not the ceiling

Husky runs `lint-staged` on every commit (`.husky/pre-commit`, config in
`package.json`'s `lint-staged` key): staged `.ts` files get `eslint --fix` then
`prettier --write`; staged `.html`/`.scss`/`.css`/`.json`/`.webmanifest`/`.md`
files get `prettier --write`. A commit whose staged files fail ESLint after the
autofix pass is rejected outright — lint-staged reverts to the pre-commit state, nothing lands half-fixed.

This exists because a formatting regression once reached `main` unnoticed and
only surfaced when CI ran on an unrelated later change — the hook catches it at
commit time instead, on whichever files are actually staged, without waiting for
a push. It does not run `check:docs`, `typecheck` or the test suite — those stay
in `npm run verify` and CI, because a pre-commit hook has to stay fast enough
that nobody is tempted to reach for `--no-verify`. Reaching for `--no-verify` is
still covered by the Git Safety Protocol regardless: skipping hooks needs an
explicit ask, this hook included.

## Never commit or push unless asked

Staging, committing, pushing and opening a pull request are the author's calls, not
a side effect of finishing a task. This is deliberately not enforced by a deny rule:
one is trivially sidestepped, so it would buy false assurance while fighting the
branch-per-change workflow. It is a judgement call, and this is where the judgement
lives.

## Commits

Conventional Commits:

```
<type>(<scope>): <imperative summary under ~72 chars>

Why this change exists and what it trades off. Not a restatement of the diff —
the diff is right there.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
Scopes are the area touched: `chordpro`, `editor`, `storage`, `auth`, `pwa`,
`docs`.

The type is not decoration: it decides the release. `main` only takes squash
merges, so a pull request's **title** becomes the commit semantic-release reads —
`fix` ships a patch, `feat` a minor, a `!` or a `BREAKING CHANGE:` footer a major,
and every other type ships nothing. That subject line is also the `CHANGELOG.md`
entry a player reads, so write it for them. `.github/workflows/pr-title.yml`
rejects a title outside the format.

Never write GitHub's skip marker — `skip ci` between square brackets — anywhere in a
commit message, even quoted to describe the release job. GitHub skips every workflow
for a head commit that contains it, with no failed run to show for it; only the
release commit semantic-release writes may carry it.

- One logical change per commit. A commit that both fixes a bug and reformats four
  files can be neither reviewed nor reverted.
- **No drive-by reformatting.** Prettier already runs on everything; if formatting
  noise appears in a diff you did not touch, something is misconfigured.
- The message explains _why_. "Fix bug" tells a future reader nothing. "Autosave
  must skip while a file is loading, otherwise opening a song overwrites it with
  its own content before the player types anything" tells them everything.

## Branches

`<type>/<short-slug>`, e.g. `feat/zoom-controls`. Work goes on a branch; nothing
lands directly on `main`, which is deployed on every push.

## Definition of done

Before calling a change finished, all of it:

- [ ] `npm run verify` passes — lint, format, docs, typecheck, tests, coverage.
- [ ] The behaviour is covered by a test that would fail without the change.
- [ ] No new `any`, no new NgModule, no component without `OnPush`.
- [ ] No Firebase import outside `services/` and `storage/`; no Web Audio outside
      `services/bluetooth-keep-alive/`.
- [ ] Every new subscription has a matching `takeUntil(this.unsubscribe$)`.
- [ ] A new dependency was checked against
      `dependencies-licensing.instructions.md` and lands lazily if it is heavy.
- [ ] A user-visible change is titled `feat` or `fix`, so it reaches the
      generated `CHANGELOG.md`. Never edit that file by hand.
- [ ] If a convention changed, **exactly one** document is updated — the owner from
      the table in the root `CLAUDE.md`. Editing two means one is a duplicate.

## Pull requests

The body covers what changed, why, what you verified — commands and their results,
not "tested locally" — and anything deliberately left out. CI must be green.

`.github/workflows/cicd.yml` carries everything that builds or ships. Its
verification jobs (lint, typecheck, test, database-rules, build) run on every
branch and every pull request. On a push to `main`, `release` runs semantic-release
once verification passes, `build` then builds the release commit — the displayed
version comes from `package.json` — and `deploy` publishes that artifact, gated by
`needs:` on all of them. Its job list is not restated here. The one other
workflow, `pr-title.yml`, only checks a pull request's title, kept apart because
it has to re-run when the title is edited.

`database.rules.json` is not deployed by this workflow — `database-rules` tests it
against a local emulator on every branch, but shipping a rules change is a manual
`firebase deploy --only database` after merge. See
`.claude/skills/firebase-realtime-database/SKILL.md`.

One thing worth knowing before editing either: `src/environments/environment.ts` is
git-ignored, and a pull request from a fork has no access to repository secrets.
Every job that builds or tests therefore runs `npm run setup:env` first, which
writes dummy Firebase values. Nothing contacts Firebase at build or unit-test time,
so this is sound — but removing that step breaks every PR while passing on `main`,
which is a confusing failure to debug.

## Reviewing

Read in this order — roughly the order in which mistakes get expensive:

1. **Do the tests describe the intended behaviour?** Read them first. A test that
   only describes what the code happens to do proves nothing, and the rest of the
   review becomes guesswork.
2. **Boundaries.** Did a component reach into Firebase or Web Audio? Did a util
   grow an `inject()`? Did a dependency point back up a layer?
3. **Subscriptions.** Every `subscribe` needs a `takeUntil`. A leak here costs a
   re-render storm, and it will not show up in any test.
4. **Correctness at the edges.** Empty content, a file that fails to decode, a
   denied microphone permission, a note below the lowest string, the very first and
   very last element.
5. **Naming and size.** Would a newcomer guess what this does from its name?
6. **Style.** Last, and briefly — Prettier and ESLint already own most of it.

Say what you would change and why. "Consider extracting this" without a reason costs
the author a round trip. Approve when it is better than what is there, not when it
is perfect.

---
description: "Use before committing, branching, opening a pull request or reviewing one. Covers commit format, the definition of done, and the order to read a diff in."
---

# Git, review and definition of done

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
Scopes are the area touched: `chordpro`, `pitch`, `editor`, `storage`, `auth`,
`pwa`, `docs`.

- One logical change per commit. A commit that both fixes a bug and reformats four
  files can be neither reviewed nor reverted.
- **No drive-by reformatting.** Prettier already runs on everything; if formatting
  noise appears in a diff you did not touch, something is misconfigured.
- The message explains *why*. "Fix bug" tells a future reader nothing. "Onset
  detection must open a new note even at identical pitch, otherwise two hummed
  notes merge into one held note" tells them everything.

## Branches

`<type>/<short-slug>`, e.g. `feat/pitch-monitor`. Work goes on a branch; nothing
lands directly on `main`, which is deployed on every push.

## Definition of done

Before calling a change finished, all of it:

- [ ] `npm run verify` passes — lint, format, docs, typecheck, tests, coverage.
- [ ] The behaviour is covered by a test that would fail without the change.
- [ ] No new `any`, no new NgModule, no component without `OnPush`.
- [ ] No Firebase import outside `services/` and `storage/`; no Web Audio outside
      `services/pitch-detection/`.
- [ ] Every new subscription has a matching `takeUntil(this.unsubscribe$)`.
- [ ] A new dependency was checked against
      `dependencies-licensing.instructions.md` and lands lazily if it is heavy.
- [ ] User-visible changes are in `CHANGELOG.md` under `Unreleased`.
- [ ] If a convention changed, **exactly one** document is updated — the owner from
      the table in the root `CLAUDE.md`. Editing two means one is a duplicate.

## Pull requests

The body covers what changed, why, what you verified — commands and their results,
not "tested locally" — and anything deliberately left out. CI must be green;
`.github/workflows/ci.yml` is the list of jobs and this document does not restate
it.

One thing worth knowing before editing CI: `src/environments/environment.ts` is
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

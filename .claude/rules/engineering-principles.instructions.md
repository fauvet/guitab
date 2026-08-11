---
description: "Use when naming things, sizing a file or function, handling errors, or deciding whether two similar blocks are really duplication. The language-agnostic principles, as they apply to this codebase."
applyTo: "src/**/*.ts"
---

# Engineering principles

## Push logic down into `utils/`

This is the single most useful habit in this codebase. A `utils/` class is a set of
static methods with no `inject()`, no subscription and no side effect — so it is
testable with plain input/output assertions and no mocks at all.

`SoloTabUtil.convert()` is the model: a string goes in, a tab and a list of
suggestions come out, and its test file covers every branch without ever
constructing a component. The pitch-detection feature is built the same way — all
the musical reasoning is in `utils/`, and the service is a thin shell around Web
Audio that exists only because microphones cannot be pure functions.

When a component or a service grows a block of reasoning that does not touch the
framework, it belongs one layer down.

## DRY is about knowledge, not characters

Two blocks that look alike but answer different questions are not duplication, and
merging them buys a coupling you will fight later.

- Real duplication: the `BehaviorSubject` + `getFoo$()` + `getFoo()` triplet, which
  is one decision — "how this app holds state" — repeated in every service. It is
  worth a helper the day a fourth service needs it.
- Not duplication: two dialog components with the same skeleton but different
  content. They change for different reasons.

Rule of three. The second occurrence is a coincidence; the third is a pattern.

## Naming

- Files: kebab-case with an explicit suffix — `foo.component.ts`, `foo.service.ts`,
  `foo.util.ts`, `foo.type.ts`. The suffix says what the thing is, so the import
  line reads without opening it.
- Observables end in `$`. Private state is `foo$`, the getter is `getFoo$()`.
- Booleans read as assertions: `isEditing`, `hasUnsavedChanges`, `isRemovable`.
- Name for intent, not for type: `preferredFret`, not `fretNumber`.

### No abbreviations, including single letters

`questionIndex`, never `qIdx`. `event`, never `e`. `index`, never `i`.
`frequency`, never `freq`. This is not taste: given the same defect to find,
developers read word identifiers measurably faster than letters or abbreviations,
and abbreviations buy nothing over a bare letter. The usual objection — "it only
lives for three lines" — is exactly the case that was measured, and it did not hold.

Names that are not ours to choose stay as they are: `id`, `db`, `_` for a
deliberately unused parameter, and anything a platform fixes for us
(`import.meta`, `user.uid`, `snapshot.val()`). A ChordPro directive name is not a
variable either — `{define:}` is `define` however the surrounding identifier is
spelled.

## Size budgets

Warnings, not merge blockers — a prompt to think, not a rule to game:

- Function ≤ 40 lines.
- File ≤ 400 lines.
- Component ≤ 200 lines before extracting a child component or a util.

A component past budget is almost always hiding a util inside itself.

## Errors are never swallowed

- No empty `catch`. If there is genuinely nothing to do, the comment says why.
- Type the caught value: `catch (error: unknown)`, never implicitly `any`.
- A failure the user caused, or needs to know about, surfaces through `MatSnackBar`
  or inline text — never through `console.log` alone. Microphone permission denied,
  an audio file that cannot be decoded, a save that failed: all three are visible.
- Services either resolve or reject. They do not return a sentinel the caller has to
  remember to check.

## Immutability

Never mutate state, inputs or arguments. Build new objects and arrays; mark shared
types `readonly`. Angular's `OnPush` change detection compares references — mutating
an array in place is the classic reason a view stops updating, and it looks like a
framework bug for about an hour.

## Comments

Explain *why*, never *what*. The guard in `ChordproService.setChordproContent()`
that returns early on unchanged content deserves a comment about the infinite loop
it prevents; a comment saying "sets the content" does not. Delete commented-out
code — git remembers it.

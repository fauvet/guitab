---
description: "Use when writing or changing CSS in this project. Covers component-scoped styles, the global stylesheet's narrow role, Material theming, and mobile-first layout."
applyTo: "src/**/*.css,src/**/*.scss"
---

# Styling

## Every component owns its CSS

A component styles itself through the `styleUrl` sibling file that the Angular CLI
generates. Angular's default view encapsulation scopes those rules to the component,
so there is no naming scheme to invent and no BEM.

`src/styles.scss` is the **only** global stylesheet. It carries what genuinely
cannot live in a component: the Material theme, the `:root` custom properties, resets,
and the body-level classes that a service toggles — `js-are-lyrics-hided`, driven by
`ChordproService`.

Adding a rule to `styles.scss` because it is easier than finding the right component
is how a global stylesheet becomes unmaintainable. The bar: **three unrelated
components already need it**, or a service sets it on `document.body`.

## Custom properties over hardcoded values

Never inline a colour a second time. The first occurrence can stay where it is; the
second means the value carries a meaning, and a meaning gets a name in the `:root`
block of `styles.scss` — `--chord-color`, not `#db3e00` written twice.

Two palettes meet here and they are not interchangeable. Material's theme tokens cover
the chrome — toolbars, dialogs, sheets, states — and overriding one of those is always
better than out-specifying a Material component's own selector. The chord sheet's
palette is ours, because no theme knows what a chord or a tab section is; that is what
the `:root` block holds, and it stays small on purpose.

Spacing and radii are deliberately **not** tokenised: they vary per component with no
shared meaning to name, and a token nobody consumes is dead configuration.

## No inline styles

`style="…"` and `[ngStyle]` defeat the encapsulation, cannot express hover or media
queries, and cannot be overridden. If a value is computed at runtime, set a CSS
custom property on the element and consume it in the stylesheet. `ChordproViewerComponent`
measures the widest chord and writes `--max-chord-width` on the document element;
`styles.scss` is what decides that the lyrics-hidden layout uses it.

**The one sanctioned exception is the zoom.** `ZoomService` writes `font-size` directly
on `<html>`, and that is correct: it is not a value one element needs, it is the scale
every `rem` in the application resolves against. A stylesheet rule cannot express "the
whole document, at a factor the user picks at runtime" — the root font size is the
mechanism, not a workaround for one. Reach for this only when the thing you are setting
really is the page-wide régime.

## Layout

- **Mobile-first.** This app is used on a phone, on a music stand, at arm's length.
  Base styles target the small screen; widen with `@media (min-width: …)`. A
  `max-width` query means two breakpoints to keep at the same pixel, and they drift —
  the footer bar switched at 1440 while the toolbar switched at 1439 for a while,
  which nobody notices until a window is exactly that wide.

  There is one honest reason to reach for `max-width` anyway, and `styles.scss` carries
  the only instance with the reasoning next to it: hiding an element is
  display-agnostic, un-hiding it is not, so a base rule that hides something a
  third-party component styles cannot be undone above the breakpoint without hardcoding
  that library's `display`. When you own the `display`, you do not have this problem and
  min-width is the answer.

- Interactive targets are at least 44 × 44 px. A mistyped chord on stage is worse
  than a slightly larger button.
- `@media (pointer: coarse)` to neutralise sticky hover states on touch.
- Keep `:focus-visible` styling. Removing a focus ring without replacing it is an
  accessibility bug — see `accessibility.instructions.md`.

## Class names are not a public API

Never select by class in a test. Query by role, by label, or by `data-testid`.
A class is a styling detail; the state is the contract. When a test needs to see a
state, expose it as a `data-*` attribute and assert on that.

## Component style budget

`angular.json` sets a per-component stylesheet budget and the build warns past it.
Hitting it means the component is doing too much, not that the budget is wrong —
extract a child component and let it carry its own styles.

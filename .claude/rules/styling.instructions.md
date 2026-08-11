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
cannot live in a component: the Material theme, `:root` custom properties, resets,
and the body-level classes that a service toggles (`js-are-lyrics-hided`, driven by
`ChordproService`, and the `--zoom` variable owned by `ZoomService`).

Adding a rule to `styles.scss` because it is easier than finding the right component
is how a global stylesheet becomes unmaintainable. The bar: **three unrelated
components already need it**, or a service sets it on `document.body`.

## Custom properties over hardcoded values

Colours, spacing, radii and the touch-target size come from custom properties
declared in `styles.scss`. Add one when the value you need is missing rather than
inlining a hex code — a value that appears twice will appear five times.

Angular Material's own theme tokens are already custom properties. Prefer overriding
a Material token to fighting a Material component with a more specific selector.

## No inline styles

`style="…"` and `[ngStyle]` defeat the encapsulation, cannot express hover or media
queries, and cannot be overridden. If a value is computed at runtime, set a CSS
custom property on the element and consume it in the component's stylesheet — that
is exactly how the zoom level reaches the page.

## Layout

- **Mobile-first.** This app is used on a phone, on a music stand, at arm's length.
  Base styles target the small screen; widen with `@media (min-width: …)`. Never
  `max-width` queries.
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

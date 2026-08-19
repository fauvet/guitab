---
description: "Use when adding or changing anything a user can see, click, hear or navigate to. Covers semantic HTML, accessible names, live regions for real-time updates, and keyboard support."
applyTo: "src/**/*.html"
---

# Accessibility

Target: **WCAG 2.2 level AA**. This app is used one-handed, on a phone, often
propped on a music stand — the accessibility floor is not optional polish, it is the
same work as making it usable while holding a guitar.

## Semantic HTML before ARIA

The best ARIA is the ARIA you did not need. A `<button>` is focusable,
keyboard-activatable and correctly announced for free; a `<div (click)>` is none of
those and needs four attributes to catch up.

- Actions are `<button>`. Navigation is `<a>`. Do not swap them.
- Headings descend without skipping levels.
- Group related controls in a `<fieldset>` with a `<legend>`.

Angular Material components already carry their roles. Do not add a `role` on top of
`mat-dialog` or `mat-list` — you will only override something correct.

## Every control has an accessible name

The icon-only toolbar buttons are this codebase's main exposure: an icon has no text
node, so without help a screen reader announces nothing at all. Every one of them
carries `aria-label` **and** `title` — the label for assistive technology, the title
for the tooltip a sighted user gets on hover. Keep both in sync.

For form controls, prefer a real `<label for="…">` paired with an `id`, or a
`mat-label` inside a `mat-form-field`. A placeholder is **not** a label: it
disappears on focus and is not announced by every screen reader.

## Live regions for real-time changes

The pitch monitor is the sharpest case in the app: the detected note changes
continuously with no user action at all. A sighted user watches it; anyone else is
told nothing unless you say so.

- Status text that updates in place gets `role="status"` — a polite live region.
- A validation error that appears after an action gets `role="alert"`.
- **Do not put a live region on the note read-out itself.** It changes several times
  a second, and a screen reader would announce nothing but noise. Announce the
  meaningful, settled events instead — recording started, recording stopped, the
  segmented notes once they exist. The continuous trace is a visual aid, and its
  container is marked `aria-hidden` with the note list as its accessible equivalent.

That distinction — announce what settles, hide what streams — is the rule to carry
to any future real-time display.

## Keyboard

- Everything reachable and operable with Tab, Enter, Space, and arrows where a
  widget implies them.
- Never remove a focus ring without replacing it. `:focus-visible` is the contract.
- Dialogs and bottom sheets get Material's focus trap for free. Do not hand-roll a
  modal; use `MatDialog` and inherit the contract.
- Keyboard shortcuts are global and registered in `KeyboardShortcutService`, which
  deliberately stands down while a Material overlay is open. Any new shortcut goes
  there, not in a component listener, or it will fire inside dialogs.

## Visual

- Contrast at least 4.5:1 for text, 3:1 for large text and UI boundaries.
- Never encode meaning in colour alone. A detected note that is in tune is green
  **and** labelled; keep both halves.
- Respect `prefers-reduced-motion` if you add animation.

## Testing accessibility

`getByRole` and `getByLabelText` are accessibility assertions in disguise. If an
element cannot be queried by its role and accessible name, a screen-reader user
cannot find it either — that is a finding, not a reason to reach for a
`data-testid`. Keep `data-testid` for things with no accessible identity by design,
such as the SVG trace container.

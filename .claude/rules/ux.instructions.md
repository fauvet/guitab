---
description: "Use when designing or reviewing a user-facing interaction — a new feature, a toolbar button, a confirmation, a piece of feedback text. Covers proportionality, reversibility, feedback wording and consistency, as distinct from accessibility (assistive tech) and styling (visual/CSS)."
---

# UX principles

This document is about the **shape** of an interaction — how many steps it takes,
whether it interrupts the player or gets out of the way, what it says when it
finishes. `accessibility.instructions.md` owns whether that interaction reaches a
screen reader or a keyboard. `styling.instructions.md` owns how it looks. A
component can pass both of those and still be the wrong interaction for the job —
that is this document's territory.

## Match the interaction to how often it happens

Before adding a control or a flow, ask three questions: what does this cost the
player to do, how often will they actually do it, and is there a lighter or more
conventional pattern that already fits better than the one about to be built. This
app is used one-handed, on a phone, propped on a music stand — a step that is fine
once a session is annoying at the fifth song and unusable at the twentieth.

The app is already consistent about this, and the consistency is worth protecting:

- `KeyboardShortcutService` calls the browser's native `confirm()` only for
  moments that are both rare and impossible to walk back — discarding unsaved
  changes is one example. Nothing else interrupts the player first.
- `FileUtil.loadEmptyFile()` loads a real, empty ChordPro file at boot and on "new
  file." There is no placeholder screen, no "nothing here yet" state to design
  around, because a blank chart _is_ the normal starting point, not an edge case.
- Draft recovery (`BeforeUnloadService`) runs on every load and is silent. An
  "we restored your draft" dialog would fire constantly for an event the player
  never asked about — the interruption would cost more than the thing it protects
  against.

When a new feature is tempted to add a modal, a settings toggle, or an extra
confirmation, check whether an existing lighter pattern (disable a button, undo,
say nothing) already covers the same risk at lower cost.

## Reversibility beats confirmation

A cheap-to-reverse action should let the player undo it, not stop them before they
take it. A blocking prompt is reserved for the handful of moments that genuinely
cannot be undone.

`ChordproService`'s `getHasEditorUndo$()` / `getHasEditorRedo$()`, wired into
`HeaderActionsBarComponent`, is why `confirm()` stays rare: everything typed into
the editor is one undo away from gone, so nothing about editing needs to ask
first. Reach for `confirm()` only when undo genuinely cannot cover the action —
its existing, sparse use in `KeyboardShortcutService` is the calibration, not a
floor to build on. How a declined `confirm()` is treated as a quiet cancel rather
than an error is already covered in "Errors are never swallowed" in
`engineering-principles.instructions.md`; this section is about _when_ to reach for
the prompt at all, not what to do once the player answers it.

## Say what happened, not that something happened

`NotificationService` fixes the mechanics for every caller: how long a message
stays up and whether it carries a dismiss action are decided by severity, not by
the call site — an error lingers and asks to be dismissed, a success clears
itself. Read the current values there rather than passing a custom duration or
adding a second action button per call.

The wording has its own convention worth keeping:

- Errors read "Could not [verb] the [noun]." — specific about what failed, not
  "Something went wrong."
- Success messages are terse and factual — a filename and a past-tense verb, not a
  congratulatory tone.

Which component is allowed to call `NotificationService` at all is
`engineering-principles.instructions.md`'s boundary; this section is about what the
message says once it is on screen.

## Busy is a caption, not a spinner

The app's established idiom for "this will take a moment" is: disable the controls
that would re-trigger the same work, and show a short `role="status"` caption next
to them. `PitchMonitorComponent`'s `isBusy()` state is the model — Record and
"Audio file" disable themselves and a "Loading the pitch detector…" caption
appears while `AubioLoaderService` fetches the WebAssembly module. There is no
`mat-progress-spinner` anywhere in the app, and introducing one would be a second
idiom for the same problem. A new feature with a genuine load delay (a Firebase
round trip, another WASM module) should disable-and-caption rather than invent a
new loading pattern.

## One name for one action, everywhere

The same action gets the same icon and the same label grammar wherever it appears
— toolbar, bottom sheet, dialog. Two shapes cover every control in the app:

- **"Verb (shortcut)"** for something that happens immediately — a present-tense
  verb, with its keyboard shortcut shown in parentheses if it has one. The
  shortcut itself belongs to `KeyboardShortcutService` and only to it: do not
  quote a binding here or anywhere else outside that service — see
  `architecture.instructions.md`'s "Keyboard Shortcuts" section for the incident
  that convention exists to prevent.
- **"Noun…"**, with an ellipsis, for anything that opens a menu, sheet or dialog
  rather than acting directly.

Introducing a third phrasing for a new control — a question, an adjective, a
different shortcut notation — breaks the pattern a returning player has already
learned from every other button. That every icon-only control also carries a
matched `aria-label` and `title` is `accessibility.instructions.md`'s rule; this
one is about what those strings say, not that they exist.

## Silence is a valid answer

Not every state change needs to tell the player about it. `BeforeUnloadService`
saves a draft on every content change and says nothing, on purpose — it is a
background safety net, not something the player asked for, and recovery on the
next load is just as silent. `NotificationService` is for the outcome of something
the player deliberately triggered (open, save, sign in); it is not a running
commentary on things the app does for them automatically. If a future change to
autosave or draft recovery is tempted to add a toast "so the player knows it
worked," that is a sign the feature has drifted from a safety net into a workflow
step — check which one it actually is before adding the notification.

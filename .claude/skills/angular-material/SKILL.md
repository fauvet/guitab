---
name: angular-material
description: Angular Material 22 as used in GuiTab — opening dialogs and bottom sheets and getting results back, icon buttons and the custom SVG icon registry, snackbars, theming through tokens. Use when adding or changing any Material component, or when a dialog result, an icon or a theme override is not behaving.
---

# Angular Material in this project

Material supplies every interactive surface here: the toolbars, the dialogs, the
bottom sheets that replace menus on a phone, and the snackbars. The app has no
hand-rolled overlay, and should not grow one — Material's focus trap, backdrop and
scroll blocking are the accessibility contract, and reimplementing them means
reimplementing all three.

## Bottom sheets are the mobile menu

This app opens a bottom sheet where a desktop app would open a menu, because a sheet
is reachable with a thumb. `BottomSheetToolsComponent`,
`BottomSheetSettingsComponent`, `BottomSheetManageFileComponent` and
`BottomSheetInsertDirectiveComponent` are all the same shape:

```typescript
private readonly bottomSheet = inject(MatBottomSheet);

openTools(): void {
  this.bottomSheet.open(BottomSheetToolsComponent);
}
```

Inside the sheet, `inject(MatBottomSheetRef)` gives `dismiss(result?)`.

**Every sheet dismissal calls `chordproService.requestEditorFocus()`.** The editor
loses focus when the overlay opens, and without this the user's next keystroke goes
nowhere. It is easy to forget in a new sheet and impossible to notice in a test.

## Dialogs, and getting a result back

```typescript
private readonly dialog = inject(MatDialog);

openEditor(): void {
  this.dialog
    .open(DialogSoloTabEditorComponent, { height: "95%", width: "95%" })
    .afterClosed()
    .subscribe((result: string | undefined) => {
      if (result) {
        this.chordproService.insertChordproContentAtCaret(result);
      }
    });
}
```

Two things this shape gets right and hand-written versions get wrong:

- **`afterClosed()` emits `undefined` when the user cancels** — the backdrop, Escape,
  and a `mat-dialog-close` button with no value all produce it. The `if (result)`
  guard is not defensive noise; it is the cancel path.
- **Sizing is passed at open time, not styled in CSS.** The dialog lives in an
  overlay container outside the component's DOM, so a component stylesheet cannot
  reach it. `height` and `width` here, or a `panelClass` plus a rule in
  `src/styles.scss`.

Inside a dialog, use the structural directives so Material handles scrolling and
button alignment: `mat-dialog-title`, `<mat-dialog-content>`,
`<mat-dialog-actions align="end">`. Rolling your own layout produces a dialog whose
content scrolls the whole overlay on a phone.

`inject(MatDialogRef<T>)` closes it with a value; `MAT_DIALOG_DATA` injects what the
opener passed. A dialog test therefore has to provide `MatDialogRef` — usually
`{ provide: MatDialogRef, useValue: { close: vi.fn() } }`.

## Icons, including the custom ones

Material's own icon font is available through `material-icons`, so
`<mat-icon>data_object</mat-icon>` works with no setup.

Icons the font does not have are registered as SVG at startup, in
`AppComponent.ngOnInit()` via `MatIconRegistry` and `DomSanitizer`, from
`src/assets/icons/material/`. They are then used by name:

```html
<mat-icon svgIcon="variable_insert"></mat-icon>
```

Adding one means dropping the file in that folder **and** registering it — an
unregistered `svgIcon` renders as empty space with no console error, which is a
frustrating five minutes.

Every icon-only button needs `aria-label` **and** `title`: the icon carries no text
node, so without them a screen reader announces nothing at all. See
`.claude/rules/accessibility.instructions.md`.

## Snackbars for transient feedback

`MatSnackBar` is the app's toast: a successful save, a failure that does not block.
`ngx-toastr` was removed deliberately — do not reintroduce a second notification
system.

A snackbar is not a place for anything the user must act on or must not miss. It
disappears, and it is announced once. Errors that need a decision belong in a dialog
or inline next to the control.

## Theming

The theme is defined once in `src/styles.scss`. Material 3 exposes its palette as
CSS custom properties, so overriding a token is preferable to out-specifying a
component's own selector — an override written against Material's internal class
names breaks on a minor upgrade, and the failure is visual, so no test catches it.

When a Material component must look different in one place, pass it a class and
style that class. Reach for `::ng-deep` last: it is deprecated, it leaks out of the
component's encapsulation, and there is usually a token that does the job.

## Testing components that use Material

Import `NoopAnimationsModule` in the `TestBed`, or animation timers leave the
fixture unstable and tests flake in ways unrelated to what they assert:

```typescript
await TestBed.configureTestingModule({
  imports: [MyComponent, NoopAnimationsModule],
  providers: [{ provide: MatDialogRef, useValue: { close: vi.fn() } }],
}).compileComponents();
```

Query by role and accessible name — `getByRole("button", { name: /insert/i })` —
never by Material's internal class names, which are not a public API.

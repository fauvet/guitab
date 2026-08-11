---
name: angular-standalone
description: Angular 22 mechanics as used in GuiTab — standalone components without NgModules, OnPush change detection, inject() dependency injection, the built-in control flow blocks, signals versus RxJS, and the application bootstrap. Use when writing or debugging any Angular code, or when an Angular API you remember has changed.
---

# Angular 22 in this project

Angular has changed shape substantially across its last several major versions, and
most of what you may remember about it is now either optional or gone. This is what
is true here.

## No NgModules, anywhere

There is no `AppModule`. The app boots from `src/main.ts` through
`bootstrapApplication(AppComponent, appConfig)`, and `src/app/app.config.ts` holds
the providers that used to live in a module's `providers` array — the router,
animations, the service worker registration.

`standalone: true` was required when standalone components were introduced; since
Angular 19 it is the **default** and writing it out is noise. Existing components
that still carry it are not wrong, just dated.

Every component declares what its own template uses:

```typescript
@Component({
  selector: "app-example",
  imports: [MatButtonModule, MatIconModule, AsyncPipe, ChildComponent],
  templateUrl: "./example.component.html",
  styleUrl: "./example.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

If the template uses `| async`, `AsyncPipe` goes in `imports`. Forgetting it is the
most common failure, and the error message names the pipe, so trust it.

## OnPush is mandatory here

`ChangeDetectionStrategy.OnPush` on every component, without exception. It means the
view is only re-checked when an `@Input` reference changes, an event fires from the
template, or an `AsyncPipe` emits.

Two consequences that bite:

- **Mutating an array or object in place will not update the view.** Build a new
  one. This looks like a framework bug for about an hour.
- **State changed outside Angular's knowledge needs a nudge.** A `requestAnimation
Frame` loop reading audio, a `MutationObserver`, a callback from a non-Angular
  widget — none of them trigger change detection on their own. Push the value
  through a `BehaviorSubject` consumed by `AsyncPipe` and the problem disappears;
  that is why this codebase does it everywhere rather than calling
  `ChangeDetectorRef.markForCheck()` by hand.

## inject() over constructor parameters

```typescript
export class ExampleComponent {
  private readonly chordproService = inject(ChordproService);
}
```

Not a style preference: `inject()` works in field initialisers, so a service is
available before the constructor body runs, and it composes with inherited classes
without threading arguments through `super()`. Constructor injection still works;
do not mix the two in one class.

`inject()` may only be called in an injection context — a field initialiser, a
constructor, or a factory. Calling it inside a method throws at runtime, and the
error message is unhelpful.

## Built-in control flow

Use the blocks, not the structural directives. They need no import, are typed more
precisely, and `@for` requires a `track` expression, which is the whole point:

```html
@if (note(); as note) {
<p>{{ note.name }}{{ note.octave }}</p>
} @else {
<p>Waiting for a sound…</p>
} @for (position of positions; track position.stringIndex) {
<li>{{ position.fret }}</li>
} @empty {
<li>No notes yet</li>
}
```

Never track by array index when the collection can reorder — Angular will reuse the
wrong DOM node and the display silently desynchronises from the data.

## Signals and RxJS

Angular's signals are available and are the framework's direction of travel. This
codebase deliberately stays on **RxJS `BehaviorSubject` + `AsyncPipe`** for shared
state, because that is what every existing service does and a half-migrated app is
worse than either end state. See
`.claude/rules/angular-services.instructions.md`.

Where signals fit without splitting the codebase: purely local component state with
no cross-component consumer, and `input()` / `output()` in new components. If you
need to bridge, `toSignal()` and `toObservable()` from `@angular/core/rxjs-interop`
do it — but do not introduce a bridge just to use the newer API.

## Lifecycle

`ngOnInit` for subscriptions and initial reads, `ngOnDestroy` to tear them down.
`ngAfterViewInit` when you genuinely need a `@ViewChild` element — it is `undefined`
in `ngOnInit`.

`@ViewChild("editor") editorRef!: ElementRef<HTMLTextAreaElement>` reads a template
reference. The `!` is honest here: Angular assigns it, TypeScript cannot see that.

## Zone.js is still here

`zone.js` is in the polyfills and the app is not zoneless. That means ordinary async
work still triggers change detection automatically — but do not rely on it, because
`OnPush` narrows what that actually re-renders, and the codebase's `BehaviorSubject`
discipline is what makes updates predictable.

## The dev server and the build

`npm start` serves on 4200 with source maps and no optimisation. `npm run build`
produces the production bundle **into `docs/`**, which is what GitHub Pages serves —
an unusual output path, and the reason `docs/` is git-ignored despite the name.

Bundle budgets live in `angular.json` and the build fails past the error threshold.
A heavy dependency belongs behind a dynamic `import()`, which esbuild splits into its
own chunk automatically.

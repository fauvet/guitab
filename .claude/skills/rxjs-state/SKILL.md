---
name: rxjs-state
description: The RxJS patterns this app is built on — BehaviorSubject as the state container, the getFoo$/getFoo pair, takeUntil teardown, and which operators to reach for. Use when adding state to a service, subscribing from a component, or debugging a stream that fires too often, never, or after the component is gone.
---

# RxJS as this app's state layer

There is no state-management library, deliberately. RxJS subjects in root-provided
services are the store, and `AsyncPipe` is the connection to the view. This is
enough for an app of this size, and adding Redux-shaped machinery on top would
create a second, stale copy of state that already has one home.

## BehaviorSubject, never Subject, for state

`BehaviorSubject` requires an initial value and replays the latest one to every new
subscriber. That is exactly what state means: a component created five minutes after
the last change still needs to know the current value.

A plain `Subject` is right for **events** — "the editor requested focus", "teardown
now" — where a late subscriber has genuinely missed nothing.

Getting this wrong produces the most confusing bug in the codebase's shape: a
component that renders empty because it subscribed after the only emission.

## The exposure pattern

```typescript
@Injectable({ providedIn: "root" })
export class ExampleService {
  private readonly value$ = new BehaviorSubject<string>("");

  getValue$(): Observable<string> {
    return this.value$.asObservable();
  }

  getValue(): string {
    return this.value$.getValue();
  }

  setValue(value: string): void {
    if (this.getValue() === value) return;
    this.value$.next(value);
  }
}
```

Three rules hold this together:

- **The subject is private and `asObservable()` is what leaves the service.** A
  consumer holding the subject can call `.next()` on it, and state acquires a second
  owner. This is not theoretical tidiness — it is why you can answer "who changed
  this?" by reading one file.
- **`getValue()` exists for imperative reads**, inside event handlers where
  subscribing would be absurd. Do not use it to avoid understanding a stream.
- **The equality guard is load-bearing.** `ChordproService` and the editor widget
  write to each other; without the early return they loop forever. Any state a view
  can both read and write needs it. For objects and arrays, compare with something
  that actually works — `lodash.isEqual` is already a dependency and
  `DialogSoloTabEditorComponent` uses it for exactly this.

## Subscribing from a component

```typescript
export class ExampleComponent implements OnInit, OnDestroy {
  private readonly exampleService = inject(ExampleService);
  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.exampleService
      .getValue$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((value) => this.onValueChanged(value));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }
}
```

`takeUntil` must be **last** in the pipe. An operator placed after it can resubscribe
to a source and outlive the teardown, which reintroduces the leak the pattern exists
to prevent.

A leaked subscription in this app costs more than memory: the service is a singleton
that lives forever, so every destroyed component's callback keeps firing, and with
several of them a single state change triggers a re-render storm.

### Prefer AsyncPipe where you can

If the value only feeds the template, do not subscribe at all:

```html
<p>{{ value$ | async }}</p>
```

`AsyncPipe` subscribes, unsubscribes on destroy, and marks the view for check under
`OnPush` — three things you would otherwise write by hand and one you would forget.
Subscribe manually only when the value drives logic rather than display.

## Operators worth knowing here

| Operator               | Where it earns its place                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `debounceTime`         | Editor input and the solo-tab textarea — recomputing a whole tab on every keystroke is wasted work         |
| `distinctUntilChanged` | The declarative version of the equality guard, for a stream you consume rather than own                    |
| `combineLatest`        | A view needing two pieces of state at once; it emits only after **all** sources have emitted at least once |
| `switchMap`            | An async call that a newer one should cancel — the audio-file decode when a second file is chosen          |
| `filter` + `map`       | Narrowing before doing work, rather than branching inside the subscriber                                   |
| `takeUntil`            | Teardown, always last                                                                                      |

Avoid nesting `subscribe` inside `subscribe`. That is `switchMap` (cancel the
previous), `mergeMap` (let them race) or `concatMap` (queue them) — pick the one
whose name describes what should happen to the earlier request, because that
decision is real and nesting hides it.

## Streams that are not state

Not everything belongs in a subject. A `requestAnimationFrame` loop reading audio
frames emits far too fast to drive a template directly — several times per frame
budget. Push the _settled_ result into a subject (the current note, the segmented
list) and keep the raw stream inside the service. The rule is the same one the
accessibility rules state for live regions: publish what settles, keep what streams
internal.

## Testing

Use `of(value)` for a fake service getter, and assert on what the component does
with it:

```typescript
const mockService = { getValue$: vi.fn().mockReturnValue(of("hello")) };
```

For time-dependent operators, wait for the condition with `vi.waitFor` rather than for a
duration — `fakeAsync` does not work under this runner, and neither does
`vi.useFakeTimers()`. The reason and the working shape:
`.claude/rules/testing.instructions.md`.

---
name: new-service
description: Scaffolds a new root-provided Angular service for GuiTab under src/app/services/ — the spec first, then the BehaviorSubject state pattern. Use when adding shared state, a side effect, or a boundary to an external API. For pure input/output logic use a util instead, and for UI use new-component.
---

## First, is it really a service?

Three homes, and picking the wrong one is the expensive mistake:

| It…                                                                                                                        | Belongs in                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| takes data and returns data, with no dependency and no side effect                                                         | `src/app/utils/` — a class of static methods           |
| holds state shared between components, or touches the outside world (Firebase, Web Audio, the file system, `localStorage`) | `src/app/services/`                                    |
| only persists and reloads one kind of record                                                                               | `src/app/storage/` — a repository behind its interface |

Prefer a util. It is testable with no mocks at all, and most "services" people reach
for are a pure function wearing a decorator. See
`.claude/rules/engineering-principles.instructions.md`.

## Two files, spec first

```
src/app/services/<name>/<name>.service.spec.ts   ← first, and it must fail
src/app/services/<name>/<name>.service.ts
```

```typescript
import { TestBed } from "@angular/core/testing";
import { PitchDetectionService } from "./pitch-detection.service";

describe("PitchDetectionService", () => {
  let service: PitchDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: OtherService, useValue: { getFoo: vi.fn() } }],
    });
    service = TestBed.inject(PitchDetectionService);
  });

  it("should expose the last detected note", () => {
    // …
  });
});
```

Mock with `vi.fn()` and `vi.spyOn`. Jasmine is not installed.

## The state pattern

State is a **private** `BehaviorSubject`, exposed through a getter for the stream
and a getter for the current value. Never expose the subject itself — a component
that can call `.next()` on another layer's state is a component that will.

```typescript
@Injectable({ providedIn: "root" })
export class ExampleService {
  private readonly otherService = inject(OtherService);
  private readonly value$ = new BehaviorSubject<string>("");

  getValue$(): Observable<string> {
    return this.value$.asObservable();
  }

  getValue(): string {
    return this.value$.getValue();
  }

  setValue(value: string): void {
    if (this.getValue() === value) return; // guard against feedback loops
    this.value$.next(value);
  }
}
```

The early-return guard is not optional decoration. `ChordproService` needs it
because the editor widget and the service write to each other, and without it they
loop forever. Any state a view can both read and write wants the same guard.

`providedIn: "root"` always — never `providedIn: 'any'`, never a module provider.

## Boundaries

A service that wraps an external API is the **only** place that API may appear:
Firebase lives in `services/` and `storage/`, Web Audio lives in
`services/pitch-detection/`. ESLint enforces both. That boundary is what lets the
rest of the app be tested without a network or a microphone, so keep the surface
narrow — expose what callers need, not what the library offers.

If the service subscribes to another service in its constructor, it owns that
subscription for the lifetime of the app. That is acceptable for a root singleton,
but say so in a comment, because it is the one place `takeUntil` is legitimately
absent.

## Then

Run `npm test` and `npm run lint`, make the assertion pass, and record the service
in the dependency graph and state-ownership table of
`.claude/rules/architecture.instructions.md` — in the same commit.

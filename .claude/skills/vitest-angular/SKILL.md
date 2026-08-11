---
name: vitest-angular
description: Running and writing tests in GuiTab — Vitest through the Angular unit-test builder, TestBed for standalone components, vi.fn mocking, fakeAsync for debounced streams, and coverage. Use when a test fails for an unclear reason, when mocking a service, or when testing anything asynchronous or browser-API-dependent.
---

# Vitest through the Angular builder

The runner is **Vitest**, driven by `@angular/build:unit-test` — configured in
`angular.json` under the `test` target, not in a `vitest.config.ts`. There is no
Karma and no Jasmine: `jasmine.createSpyObj`, `jasmine.any` and friends do not
exist, and an instruction telling you otherwise is out of date.

`describe`, `it`, `expect`, `beforeEach` and `vi` are globals, declared through
`"types": ["vitest/globals"]` in `tsconfig.spec.json`. Nothing is imported from
`vitest` in a spec file.

```bash
npm test               # one run
npm run test:coverage  # with the thresholds enforced in angular.json
```

A spec lives beside its subject: `foo.util.ts` → `foo.util.spec.ts`.

## The three shapes of a test

**A util** — the cheapest and best. No `TestBed`, no mocks, no framework:

```typescript
import { SoloTabUtil } from "./solo-tab.util";

describe("SoloTabUtil", () => {
  it("should pad shorter values with dashes to match the longest on a line", () => {
    const result = SoloTabUtil.convert("10 2 3");
    expect(result.generatedSoloTab.split("\n")[1]).toBe("2-");
  });
});
```

Push logic here and this is the test you get to write. Everything else is more
expensive.

**A service** — `TestBed` for injection, dependencies replaced by plain objects:

```typescript
const mockAuthService = { getUser$: vi.fn().mockReturnValue(of(null)), getUser: vi.fn() };

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: mockAuthService }],
  });
  service = TestBed.inject(ExampleService);
});
```

A mock is an object literal with `vi.fn()` members. It only needs the methods the
subject actually calls — a mock that mirrors the whole real class is a second
implementation to maintain.

**A component** — standalone components go in `imports`, never `declarations`:

```typescript
await TestBed.configureTestingModule({
  imports: [MyComponent, NoopAnimationsModule],
  providers: [{ provide: MatDialogRef, useValue: { close: vi.fn() } }],
}).compileComponents();

fixture = TestBed.createComponent(MyComponent);
component = fixture.componentInstance;
fixture.detectChanges();
```

`NoopAnimationsModule` for anything Material. A dialog needs `MatDialogRef`
provided, or construction throws before your assertion runs.

## OnPush means detectChanges is not optional

Every component here is `OnPush`, so the view does not re-render because a field
changed. Set state, call `fixture.detectChanges()`, then assert on the DOM. A test
that asserts on `component.someField` instead is testing the class, not the
component — prefer asserting what a user could see.

## Asynchrony

- `fakeAsync` + `tick(200)` for `debounceTime` and timers. Deterministic, instant.
- `async` + `await fixture.whenStable()` for promises.
- **Never a real `setTimeout` or a fixed sleep.** A test that waits for a duration
  rather than a condition is a test that will flake on a slow CI runner, and a flaky
  test trains everyone to ignore red.

```typescript
it("should recompute after the debounce window", fakeAsync(() => {
  component.setSoloTab("0 2 2");
  tick(200);
  fixture.detectChanges();
  expect(component.generatedSoloTab$.getValue()).not.toBe("");
}));
```

## Browser APIs jsdom does not have

The test environment is jsdom, and it is missing more than you expect. `AudioContext`,
`navigator.mediaDevices`, `navigator.clipboard`, the File System Access API and
`ResizeObserver` are all absent — a component touching one throws on construction
with an error that names something unrelated.

Stub them on `globalThis` in `beforeEach`, and restore in `afterEach`:

```typescript
vi.stubGlobal("AudioContext", vi.fn(() => ({ close: vi.fn(), createAnalyser: vi.fn() })));
```

Canvas is the other trap: jsdom does not implement `getContext`, so anything drawing
to a canvas cannot be asserted on. That is why the pitch trace is an SVG
`<polyline>` and its geometry lives in a util — the util is tested directly, and the
component only has to be shown to pass it through.

## Isolation

`vi.restoreAllMocks()` and `localStorage.clear()` in `afterEach`. State leaking
between tests produces failures that depend on execution order, which is the worst
kind to debug.

## Coverage is a floor

Thresholds live in `angular.json` and CI fails below them. They exist to catch whole
files nobody tested, not to be optimised. Never delete a meaningful assertion to make
a number pass, and never add a test whose only purpose is to execute a line — 100%
coverage of a wrong design is still a wrong design.

`should create` alone is a smoke test. It is honest for a component that only lays
out a template, and insufficient for anything that decides something.

---
description: "Use when writing, reviewing, or fixing unit tests. Covers Vitest setup, Angular TestBed for standalone components, spy patterns, and async testing conventions for this project."
applyTo: "**/*.spec.ts"
---

# Testing Conventions

## Framework

- **Runner**: Vitest (via `@angular/build:unit-test`, `runner: "vitest"` in `angular.json`)
- **Globals**: `describe`, `it`, `expect`, `beforeEach`, `vi` — provided by `vitest/globals` (configured in `tsconfig.spec.json`)
- **Angular testing**: `@angular/core/testing` (`TestBed`, `ComponentFixture`) — but not
  `fakeAsync` / `tick`, which this runner cannot support; see **Async Testing** below
- Run with: `npm test`

Mocks are `vi.fn()` and `vi.spyOn`. Vitest is the only test framework installed, so
anything else you may remember writing is not available here.

## Component Test Setup

Components are standalone (implicit since Angular 19 — no `standalone: true` needed). They go in `imports`, not `declarations`:

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MyComponent } from "./my-component.component";

describe("MyComponent", () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent], // standalone component goes in imports, not declarations
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
```

## Service Test Setup

```typescript
import { TestBed } from "@angular/core/testing";
import { MyService } from "./my-service.service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
```

## Mocking Dependencies

Use `vi.fn()` to create mock functions and build mock service objects:

```typescript
const mockChordproService = {
  getChordproContent$: vi.fn().mockReturnValue(of("")),
  setChordproContent: vi.fn(),
};

await TestBed.configureTestingModule({
  imports: [MyComponent],
  providers: [{ provide: ChordproService, useValue: mockChordproService }],
}).compileComponents();
```

Mocks are cleared with `vi.clearAllMocks()` in `beforeEach` when they are shared
across tests: `vi.restoreAllMocks()` restores spies but leaves `vi.fn()` call
history, so a "was not called" assertion otherwise depends on execution order.

A service provided by a module in the component's own `imports` — `MatBottomSheet`
from `MatBottomSheetModule`, for instance — is provided at **component** level
and shadows anything the `TestBed` declares at root. Use
`TestBed.overrideProvider()` for those, or the real one is injected and the mock
is silently never called.

Use `vi.spyOn` to spy on real methods:

```typescript
const spy = vi.spyOn(service, "methodName").mockReturnValue(42);
```

## Async Testing

> ⚠️ **`fakeAsync` and `tick()` do not work under this runner.** They throw
> `Expected to be running in 'ProxyZone', but it was not found` before the test
> body runs, because the Vitest runner does not install the proxy zone Angular's
> fake-async implementation needs. Vitest's own `vi.useFakeTimers()` does not
> help either: zone.js has already patched `setTimeout` by the time it swaps in,
> so RxJS keeps scheduling on the real one.

For a debounced or otherwise delayed value, wait for the **condition**:

```typescript
it("should recompute the preview only after the user stops typing", async () => {
  component.setSoloTab("5 7 7");

  expect(component.generatedSoloTab$.getValue()).not.toContain("5");

  await vi.waitFor(() => expect(component.generatedSoloTab$.getValue()).toContain("5"));
});
```

`vi.waitFor` polls until the assertion passes or times out. Never sleep for a
fixed duration instead — a test that waits 250 ms for a 200 ms debounce passes
on your machine and fails on a loaded CI runner, and a flaky test trains
everyone to ignore red.

Use `async/await` + `fixture.whenStable()` for Promise-based async:

```typescript
it("should load file", async () => {
  component.loadFile();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(component.content).toBeTruthy();
});
```

## Change Detection

With `ChangeDetectionStrategy.OnPush`, always call `fixture.detectChanges()` after state changes:

```typescript
it("should render updated content", () => {
  component.text = "hello";
  fixture.detectChanges(); // required for OnPush
  const el = fixture.nativeElement.querySelector("p");
  expect(el.textContent).toContain("hello");
});
```

## Structure

- One `describe` block per class
- Nested `describe` for method groups when the class is complex
- `it` descriptions use plain English: `"should return empty array when input is null"`
- Group related `it` blocks with inner `describe`

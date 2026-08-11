---
description: "Use when writing, reviewing, or fixing unit tests. Covers Vitest setup, Angular TestBed for standalone components, spy patterns, and async testing conventions for this project."
applyTo: "**/*.spec.ts"
---

# Testing Conventions

## Framework

- **Runner**: Vitest (via `@angular/build:unit-test`, `runner: "vitest"` in `angular.json`)
- **Globals**: `describe`, `it`, `expect`, `beforeEach`, `vi` — provided by `vitest/globals` (configured in `tsconfig.spec.json`)
- **Angular testing**: `@angular/core/testing` (`TestBed`, `ComponentFixture`, `fakeAsync`, `tick`)
- Run with: `npm test`

> ⚠️ Karma and Jasmine have been removed. Do NOT use `jasmine.*` APIs.

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
      imports: [MyComponent],  // standalone component goes in imports, not declarations
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
  providers: [
    { provide: ChordproService, useValue: mockChordproService },
  ],
}).compileComponents();
```

Use `vi.spyOn` to spy on real methods:

```typescript
const spy = vi.spyOn(service, "methodName").mockReturnValue(42);
```

## Async Testing

Use `fakeAsync` + `tick()` for async operations and timers (from `@angular/core/testing`):

```typescript
import { fakeAsync, tick } from "@angular/core/testing";

it("should update after delay", fakeAsync(() => {
  component.triggerUpdate();
  tick(100);
  fixture.detectChanges();
  expect(component.value).toBe("updated");
}));
```

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
  fixture.detectChanges();  // required for OnPush
  const el = fixture.nativeElement.querySelector("p");
  expect(el.textContent).toContain("hello");
});
```

## Structure

- One `describe` block per class
- Nested `describe` for method groups when the class is complex
- `it` descriptions use plain English: `"should return empty array when input is null"`
- Group related `it` blocks with inner `describe`

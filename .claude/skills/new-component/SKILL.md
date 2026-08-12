---
name: new-component
description: Scaffolds a new Angular standalone component for GuiTab under src/app/components/ — the spec file first, then the template, styles and class. Use when adding any UI element to this app. For a root-provided singleton holding state or performing side effects, use new-service instead.
---

Four files, created in this order. The order is the point: the spec comes first so
the component is shaped by what it has to do, not by what it happens to render.

```
src/app/components/<name>/<name>.component.spec.ts   ← first, and it must fail
src/app/components/<name>/<name>.component.html
src/app/components/<name>/<name>.component.css
src/app/components/<name>/<name>.component.ts
```

`<name>` is kebab-case and the class is its PascalCase form with a `Component`
suffix: `pitch-monitor` → `PitchMonitorComponent`, selector `app-pitch-monitor`.

## 1. The spec

Write one assertion describing the behaviour you want, run it, and confirm it fails
for the intended reason — a failed expectation, not a missing import.

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { PitchMonitorComponent } from "./pitch-monitor.component";

describe("PitchMonitorComponent", () => {
  let component: PitchMonitorComponent;
  let fixture: ComponentFixture<PitchMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PitchMonitorComponent, NoopAnimationsModule],
      providers: [{ provide: SomeService, useValue: { getFoo$: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PitchMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should show the detected note name", () => {
    // …
  });
});
```

Mock injected services with `vi.fn()`. Full conventions:
`.claude/rules/testing.instructions.md`.

## 2. The template and styles

Keep logic out of the template: compute above, expose a named member, bind to it.
Use the built-in control flow (`@if`, `@for`) rather than `*ngIf` / `*ngFor`.

Every interactive element needs an accessible name — icon-only buttons carry both
`aria-label` and `title`. See `.claude/rules/accessibility.instructions.md` and
`.claude/rules/styling.instructions.md`.

## 3. The class

```typescript
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-<name>",
  imports: [],
  templateUrl: "./<name>.component.html",
  styleUrl: "./<name>.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <Name>Component implements OnInit, OnDestroy {
  private readonly someService = inject(SomeService);
  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.someService
      .getFoo$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((foo) => this.onFooChanged(foo));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }
}
```

Non-negotiable: `OnPush`, `inject()` at field level, `takeUntil(this.unsubscribe$)`
on every subscription. `standalone: true` is the default since Angular 19 and is not
written out.

## 4. Wire it up

A component is reachable either from a parent template (add it to that parent's
`imports`) or opened imperatively through `MatDialog` / `MatBottomSheet`. Dialogs
are not part of any static template — see the wiring table in
`.claude/rules/architecture.instructions.md`.

Then run `npm test` and `npm run lint`, and make the assertion pass with the
smallest change that does it.

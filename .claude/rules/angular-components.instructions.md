---
description: "Use when creating or modifying Angular components. Covers standalone component pattern, OnPush change detection, inject() dependency injection, and RxJS unsubscribe conventions used in this project."
applyTo: "src/app/components/**/*.ts"
---

# Angular Component Conventions

## Required Metadata

Every component must include these properties in its `@Component` decorator:

```typescript
@Component({
  selector: "app-my-component",
  imports: [/* only what this component uses */],
  templateUrl: "./my-component.component.html",
  styleUrl: "./my-component.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

- **No NgModules, ever.** Standalone is the default since Angular 19, so writing
  `standalone: true` adds nothing — do not add it back.
- `ChangeDetectionStrategy.OnPush` — mandatory on every component, and ESLint fails the
  build without it
- `imports` — declare all Angular Material modules, pipes, and child components used in the template

## Dependency Injection

Use `inject()` at the field declaration level — **not** constructor parameters:

```typescript
// ✅ Correct
export class MyComponent {
  private readonly myService = inject(MyService);
  private readonly dialog = inject(MatDialog);
}

// ❌ Wrong
export class MyComponent {
  constructor(private myService: MyService) {}
}
```

## RxJS Unsubscribe Pattern

Use `Subject<void>` + `takeUntil` to avoid memory leaks:

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    this.someService
      .getData$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((data) => this.handleData(data));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }
}
```

- Always implement `OnInit` and `OnDestroy` when subscribing
- Always use `takeUntil(this.unsubscribe$)` — never unsubscribe manually or store subscription references
- `unsubscribe$` must be `private readonly`

## Errors

Every `catch` pairs `console.error(error)` with a notification through
`NotificationService` — the only service allowed to call `MatSnackBar`, and only
components call it. See "Errors are never swallowed" in
`engineering-principles.instructions.md`.

## File Structure

Each component lives in its own folder with exactly these files:

```
components/my-component/
├── my-component.component.ts
├── my-component.component.html
├── my-component.component.css
└── my-component.component.spec.ts
```

## Imports Checklist

Common imports frequently needed:

```typescript
import { AsyncPipe } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
```

Import only what is used in the template — no barrel imports.

`NgIf` and `NgFor` are not on that list on purpose: conditionals and loops use the
built-in `@if` / `@for` blocks, which need no import at all. See
`.claude/skills/angular-standalone/SKILL.md`.

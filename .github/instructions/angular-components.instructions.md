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
  standalone: true,
  imports: [/* only what this component uses */],
  templateUrl: "./my-component.component.html",
  styleUrl: "./my-component.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

- `standalone: true` — no NgModules, ever
- `ChangeDetectionStrategy.OnPush` — mandatory on every component
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
    this.someService.getData$()
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
import { AsyncPipe, NgIf, NgFor } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
```

Import only what is used in the template — no barrel imports.

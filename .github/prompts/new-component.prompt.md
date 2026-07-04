---
description: "Generate a new Angular standalone component following Guitab conventions: OnPush, inject(), takeUntil unsubscribe, with .ts/.html/.css/.spec.ts files."
argument-hint: "Component name in kebab-case (e.g. chord-selector)"
agent: "agent"
---

Generate a new Angular standalone component for the Guitab project.

**Component name (kebab-case)**: $input

## Requirements

Follow the instructions in [angular-components.instructions.md](../instructions/angular-components.instructions.md) and the global project conventions in [copilot-instructions.md](../copilot-instructions.md).

Create these four files under `src/app/components/<component-name>/`:

### 1. `<component-name>.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-<component-name>",
  standalone: true,
  imports: [],
  templateUrl: "./<component-name>.component.html",
  styleUrl: "./<component-name>.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <ComponentName>Component implements OnInit, OnDestroy {
  private readonly unsubscribe$ = new Subject<void>();

  ngOnInit(): void {
    // subscribe with takeUntil(this.unsubscribe$)
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }
}
```

### 2. `<component-name>.component.html`

Minimal template appropriate for the component's purpose.

### 3. `<component-name>.component.css`

Empty or minimal styles scoped to the component.

### 4. `<component-name>.component.spec.ts`

Follow [testing.instructions.md](../instructions/testing.instructions.md):
- Use `TestBed.configureTestingModule({ imports: [<ComponentName>Component] })`
- Include a `"should create"` test
- Mock any injected services with `jasmine.createSpyObj`

After generating the files, check for any TypeScript errors and fix them.

---
description: "Generate a new Angular root service following Guitab conventions: providedIn root, inject(), BehaviorSubject state pattern, with .ts/.spec.ts files."
argument-hint: "Service name in kebab-case (e.g. playback)"
agent: "agent"
---

Generate a new Angular root-provided service for the Guitab project.

**Service name (kebab-case)**: $input

## Requirements

Follow the instructions in [angular-services.instructions.md](../instructions/angular-services.instructions.md) and the global project conventions in [copilot-instructions.md](../copilot-instructions.md).

Create these two files under `src/app/services/<service-name>/`:

### 1. `<service-name>.service.ts`

```typescript
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class <ServiceName>Service {

  // State fields — private readonly BehaviorSubject<T>
  private readonly someState$ = new BehaviorSubject<string>("");

  // Observable accessor — for subscriptions
  getSomeState$(): Observable<string> {
    return this.someState$.asObservable();
  }

  // Synchronous accessor — for one-time reads
  getSomeState(): string {
    return this.someState$.getValue();
  }

  // Private setter
  private setSomeState(value: string): void {
    this.someState$.next(value);
  }
}
```

Adapt state fields and methods to the service's actual purpose.

### 2. `<service-name>.service.spec.ts`

Follow [testing.instructions.md](../instructions/testing.instructions.md):
- Use `TestBed.inject(<ServiceName>Service)`
- Include a `"should be created"` test
- Test each public method and Observable emission

After generating the files, check for any TypeScript errors and fix them.

---
description: "Use when creating or modifying Angular services. Covers providedIn root pattern, BehaviorSubject state management, Observable exposure, and inject() usage for this project."
applyTo: "src/app/services/**/*.ts"
---

# Angular Service Conventions

## Required Decorator

```typescript
@Injectable({
  providedIn: "root",
})
export class MyService {
  // ...
}
```

All services are singletons provided at root. Never use `providedIn: 'any'` or module-based providers.

## Dependency Injection

Use `inject()` at the field declaration level — not via constructor parameters:

```typescript
export class MyService {
  private readonly otherService = inject(OtherService);
}
```

Constructor may still exist for subscription setup, but must not declare injected parameters:

```typescript
constructor() {
  this.someOtherService.getData$().subscribe((data) => this.handleData(data));
}
```

## State Management with BehaviorSubject

All state is held in private `BehaviorSubject` fields and exposed via two public methods:

```typescript
export class MyService {
  private readonly foo$ = new BehaviorSubject<string>("");
  private readonly isActive$ = new BehaviorSubject<boolean>(false);

  // Observable accessor — for subscriptions
  getFoo$(): Observable<string> {
    return this.foo$.asObservable();
  }

  // Synchronous accessor — for one-time reads
  getFoo(): string {
    return this.foo$.getValue();
  }

  // Setter — always private unless external mutation is explicitly required
  private setFoo(value: string): void {
    this.foo$.next(value);
  }
}
```

Rules:

- BehaviorSubjects are always `private readonly`
- Never expose a `BehaviorSubject` directly — use `asObservable()`
- Always provide both `getFoo$()` and `getFoo()` accessors
- Setters are private by default

## Explicit Initialization Pattern

When a service must be set up after components are mounted (e.g., to access the DOM), expose an explicit `initialize()` method called by the consuming component in `ngOnInit`:

```typescript
export class MyService {
  initialize(): void {
    // one-time setup logic
  }
}
```

## File Structure

Each service lives in its own folder:

```
services/my-service/
├── my-service.service.ts
└── my-service.service.spec.ts
```

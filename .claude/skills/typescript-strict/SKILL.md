---
name: typescript-strict
description: The TypeScript configuration GuiTab compiles under and what it forbids — full strict mode plus noPropertyAccessFromIndexSignature and strictTemplates, the no-any rule and its one exception, and how to type data arriving from Firestore, JSON or WebAssembly. Use when a type error is not obvious, when tempted to cast, or when adding a typing configuration.
---

# TypeScript as configured here

`tsconfig.json` turns on `strict` and then adds more. Read it rather than trusting
memory, but these are the flags that change how code has to be written:

| Flag | What it costs you |
| ---- | ----------------- |
| `strict` | No implicit `any`, strict null checks, strict function types |
| `noImplicitOverride` | Overriding a method requires the `override` keyword |
| `noPropertyAccessFromIndexSignature` | Index-signature members must use `data["key"]`, not `data.key` |
| `noImplicitReturns` | Every branch of a function returns, or none does |
| `noFallthroughCasesInSwitch` | A `case` without `break` is an error |
| `strictTemplates` (Angular) | Template expressions are type-checked against the component |

`noPropertyAccessFromIndexSignature` is the one that surprises people, and it is why
Firestore reads look like `data["chordproContent"]`. That is not a style choice — it
is the compiler insisting you acknowledge that the key might not exist.

`strictTemplates` means a typo in a template is a build error rather than a blank
element. It also means `| async` produces `T | null`, so a template binding to a
possibly-null value needs `@if (value$ | async; as value)` rather than optimism.

## No `any`

Not as a style rule — as a load-bearing one. `any` disables checking for everything
downstream of it, so one `any` in a service silently unchecks the components that
consume it.

The sanctioned exception is a **boundary where data genuinely arrives untyped**, and
there are exactly three in this codebase:

1. **Firestore.** `snapshot.data()` is `DocumentData`. Cast per field, at the
   repository, and keep the `?? ""` fallback — the database can hold anything the
   rules permit, whatever the cast claims.
2. **WebAssembly and untyped libraries.** A module with no types gets a narrow
   declaration written for it, not an `any` sprinkled at every call site.
3. **The ChordPro editor widget**, which has no types at all and is reached through
   a global object.

Everywhere else, a cast is hiding a modelling problem. `unknown` plus a narrowing
check is almost always the honest version:

```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
}
```

## Typing what comes from outside

**Declare the shape you rely on, not the shape that exists.** A library returning a
large object is easier to work with — and safer to swap — behind a local interface
naming only the members you call. That is what makes replacing an audio engine a
one-file change rather than an archaeology exercise.

**Model states as unions, not as optional-field soup.** `status: "idle" | "loading"
| "recording" | "error"` makes the impossible combinations unrepresentable;
`isLoading?: boolean` plus `isRecording?: boolean` invites the state where both are
true and nobody knows what the UI should do.

**`readonly` on anything shared.** `OnPush` compares references, so accidental
mutation is both a correctness bug and an invisible rendering one. `readonly` catches
it at compile time.

## JSON imports

`resolveJsonModule` is on, so `import packageJson from "../../package.json"` is typed
and works. Useful for reading the app's own version rather than retyping it — the
whole file lands in the bundle, which is fine for something small and wrong for
something large.

## The three tsconfigs

`tsconfig.json` holds the shared options; `tsconfig.app.json` compiles `src/` for the
build; `tsconfig.spec.json` adds `vitest/globals` for `*.spec.ts`. A type available
in tests but not in the app almost always means the wrong file was edited.

`npm run typecheck` runs the compiler with no emit — faster than a build when you
only want to know whether it is sound.

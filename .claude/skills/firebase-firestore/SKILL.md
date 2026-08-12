---
name: firebase-firestore
description: Firebase Auth and Firestore as wired in GuiTab — anonymous sign-in upgraded to Google, the repository abstraction over localStorage and Firestore, the per-user document layout, and the security rules that enforce it. Use when touching persistence, sign-in, firestore.rules, or the git-ignored environment file.
---

# Firebase in this project

Firebase does two jobs and no others: it says who the user is, and it stores that
user's files in the cloud. There is no backend, no cloud function, no server-side
logic. Everything else runs in the browser.

## One project, no dev/prod split

Local development and the deployed app both talk to the same Firebase project. There
is no emulator setup and no staging environment, so **anything you write while
developing lands in the real database**, under your own uid. That is survivable
because the data is per-user and low-stakes, but it is worth knowing before you
write a migration script.

`src/environments/environment.ts` holds the config and is **git-ignored**. A fresh
clone has none, and nothing builds until it exists — `npm run setup:env` writes one,
CI generates a dummy one, and the deploy workflow generates the real one from
repository secrets. The committed `environment.template.ts` defines the shape.

None of this is secret. Firebase web config is public by design: it identifies the
project, it does not authorise anything. The security rules are the actual boundary.

## Authentication

`AuthService` signs every visitor in **anonymously on startup**. There is no login
wall, and a first-time user gets a working uid without seeing a form.

A Google sign-in upgrades that anonymous account through `linkWithPopup`, which
**preserves the uid** — so the files created before signing in remain the same
user's files. This is the whole reason to link rather than sign in fresh, and
replacing the call with `signInWithPopup` would silently orphan every existing
document. `isAnonymous()` distinguishes the two states for the UI.

Consumers subscribe to `getUser$()`. It emits `null` before the first
`onAuthStateChanged` callback, so **guard on the user, not just on the absence of
data** — an empty file list one tick after boot is not an empty file list.

## Persistence goes through repositories, never directly

Two interfaces in `src/app/storage/repositories/` describe what can be stored:
`ICachedFilesRepository` for recently opened files, `IDraftRepository` for unsaved
work. Each has two implementations — `storage/local/` on `localStorage`,
`storage/firebase/` on Firestore.

`CachedFilesService` and `BeforeUnloadService` inject both and delegate to the
Firestore one when a user exists, falling back to local. Because sign-in is
automatic, Firestore is almost always the live one; the local path is what keeps the
app working offline and before auth resolves.

**Never add persistence logic to a service.** Add a repository implementation, and
never call `localStorage` directly — `LocalStorageService.buildBehaviorSubject()`
already gives a typed, reactive wrapper. ESLint blocks `firebase/*` imports outside
`services/` and `storage/`.

## Document layout and the fields the rules demand

```
/users/{uid}/draft                  ← { chordproContent, hasUnsavedChanges }
/users/{uid}/cachedFiles/{fileId}   ← { name, chordproContent, date }
```

Every written document must carry `ownerId`, `updatedAt`, and `createdAt` **on
creation only**. `FirebaseDraftRepository.saveDraft()` shows the shape: read the
document first, add `createdAt: serverTimestamp()` only when it does not exist, and
always refresh `updatedAt`.

Get this wrong and the write is rejected by the rules, not by a type error. The
failure surfaces as a permission-denied at runtime, which is why the pattern is
worth copying rather than reinventing.

Reads use `onSnapshot`, which pushes live updates into a `BehaviorSubject`. Its
`Unsubscribe` handle must be kept and called when the user changes — a repository
that forgets keeps streaming the previous user's documents after a sign-out.

Firestore data arrives untyped. The cast at that boundary
(`data["chordproContent"] as string`) is the one sanctioned place for it, and the
`?? ""` fallbacks stay: the database can hold anything the rules allow, whatever the
type claims.

## Security rules are the real boundary

`firestore.rules` at the repo root, deployed by the CI workflow. Its shape:

- **Default deny on everything**, then an allowance for `/users/{uid}/**`.
- Read and write only when `request.auth.uid == uid` — strict tenant isolation, no
  sharing between users today.
- `ownerId` must equal the caller's uid, so a document cannot be written on someone
  else's behalf.
- `createdAt` is immutable on update.
- `chordproContent` is size-capped, which is the only thing standing between a
  public write path and someone storing a film in your quota.

Any change here is a security change. Reason about it as one: the rules are the sole
protection on a database that any browser can reach, and there is no test tier
covering them in this repo — a mistake ships silently and stays until someone
notices their data is readable.

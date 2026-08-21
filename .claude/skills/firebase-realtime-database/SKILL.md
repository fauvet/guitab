---
name: firebase-realtime-database
description: Firebase Auth and Realtime Database as wired in GuiTab — anonymous sign-in upgraded to Google, the repository abstraction over localStorage and Realtime Database, the per-user record layout, and the security rules that enforce it. Use when touching persistence, sign-in, database.rules.json, or the git-ignored environment file.
---

# Firebase in this project

Firebase does two jobs and no others: it says who the user is, and it stores that
user's files in the cloud. There is no backend, no cloud function, no server-side
logic. Everything else runs in the browser.

## One project, no dev/prod split

Local development and the deployed app both talk to the same Firebase project. There
is no staging environment, so **anything you write while developing lands in the
real database**, under your own uid. That is survivable because the data is
per-user and low-stakes, but it is worth knowing before you write a migration
script. (The rules test suite does use a local emulator — see below — but that is a
test tier, not a dev environment the app itself connects to.)

`src/environments/environment.ts` holds the config and is **git-ignored**. A fresh
clone has none, and nothing builds until it exists — `npm run setup:env` writes one,
CI generates a dummy one, and the deploy workflow generates the real one from
repository secrets. The committed `environment.template.ts` defines the shape,
including `databaseURL` — Realtime Database, unlike Firestore, needs this to know
which regional instance to talk to.

None of this is secret. Firebase web config is public by design: it identifies the
project, it does not authorise anything. The security rules are the actual boundary.

## Authentication

`AuthService` signs every visitor in **anonymously on startup**. There is no login
wall, and a first-time user gets a working uid without seeing a form.

A Google sign-in upgrades that anonymous account through `linkWithPopup`, which
**preserves the uid** — so the files created before signing in remain the same
user's files. This is the whole reason to link rather than sign in fresh, and
replacing the call with `signInWithPopup` would silently orphan every existing
record. `isAnonymous()` distinguishes the two states for the UI.

Consumers subscribe to `getUser$()`. It emits `null` before the first
`onAuthStateChanged` callback, so **guard on the user, not just on the absence of
data** — an empty file list one tick after boot is not an empty file list.

## Persistence goes through repositories, never directly

Two interfaces in `src/app/storage/repositories/` describe what can be stored:
`ICachedFilesRepository` for recently opened files, `IDraftRepository` for unsaved
work. Each has two implementations — `storage/local/` on `localStorage`,
`storage/firebase/` on Realtime Database.

`CachedFilesService` and `BeforeUnloadService` inject both and delegate to the
Realtime Database one when a user exists, falling back to local. Because sign-in is
automatic, Realtime Database is almost always the live one; the local path is what
keeps the app working before auth resolves.

**Realtime Database's web client has no disk persistence.** Unlike Firestore's
`persistentLocalCache`, there is nothing to configure here — the SDK caches only in
memory while the app is running, and a page reload starts from nothing until the
first snapshot arrives again. If the app ever needs to show cached data instantly on
a cold load, that has to be built (e.g. seeding from the local repository first),
not assumed.

**Never add persistence logic to a service.** Add a repository implementation, and
never call `localStorage` directly — `LocalStorageService.buildBehaviorSubject()`
already gives a typed, reactive wrapper. ESLint blocks `firebase/*` imports outside
`services/` and `storage/`.

## Record layout and the fields the rules demand

Realtime Database is one JSON tree, not collections of documents — but the shape
GuiTab stores in it mirrors what Firestore held:

```
/users/{uid}/draft/current          ← { chordproContent, hasUnsavedChanges }
/users/{uid}/cachedFiles/{fileId}   ← { name, chordproContent, date }
```

`fileId` is the song's name, run through `RealtimeDatabaseUtil.sanitizeKey()`
(`src/app/utils/realtime-database.util.ts`) — a Realtime Database key forbids
`. # $ [ ]` in addition to `/`, which plain `encodeURIComponent` does not escape.

Every written record must carry `ownerId`, `updatedAt`, and `createdAt` **on
creation only**. `FirebaseDraftRepository.saveDraft()` shows the shape: read the
record first, then branch on whether it already exists. On creation, `set()` the
whole node including `createdAt: serverTimestamp()`. On every write after that,
`update()` — never `set()` — with `ownerId` and a refreshed `updatedAt`, and no
`createdAt` at all. `update()` merges into the existing node, so leaving
`createdAt` out of the payload leaves the stored value alone; `set()` would
overwrite the whole node and delete it.

Get this wrong and the write is rejected by the rules, not by a type error. A
`set()` used for an update silently drops `createdAt` from the node, which then
fails the rules' `hasChildren(['ownerId', 'updatedAt', 'createdAt'])` check — the
failure surfaces as a permission-denied at runtime, on every write after the
first, which is why the create/update split is worth copying rather than
reinventing.

Reads use `onValue`, which pushes live updates into a `BehaviorSubject`. Its
`Unsubscribe` handle must be kept and called when the user changes — a repository
that forgets keeps streaming the previous user's records after a sign-out.
`orderByChild("updatedAt")` only sorts ascending; `FirebaseCachedFilesRepository`
reverses the array client-side for a most-recent-first list.

Realtime Database data arrives untyped. The cast at that boundary
(`data["chordproContent"] as string`) is the one sanctioned place for it, and the
`?? ""` fallbacks stay: the database can hold anything the rules allow, whatever the
type claims.

## Security rules are the real boundary

`database.rules.json` at the repo root. Its shape:

- **Default deny on everything** (`.read`/`.write` both `false` at the root), then an
  allowance for `/users/$uid` — and because Realtime Database rules cascade down the
  tree, that one allowance covers every record underneath it, unlike Firestore where
  each depth needed its own explicit match.
- Read and write only when `auth.uid === $uid` — strict tenant isolation, no sharing
  between users today.
- A `.validate` rule at `users/$uid/$collection/$itemId` requires `ownerId` to equal
  the caller's uid, so a record cannot be written on someone else's behalf.
- The same rule keeps `createdAt` immutable once a record exists, and caps
  `chordproContent` — the only thing standing between a public write path and
  someone storing a film in your quota.

Any change here is a security change. Reason about it as one: the rules are the sole
protection on a database that any browser can reach.

`database.rules.spec.ts` exercises every branch above against a real Realtime
Database emulator via `@firebase/rules-unit-testing` — `npm run test:rules:emulator`
runs it locally, and CI runs the same thing as the `database-rules` job in
`cicd.yml`, on every branch. It uses the demo project `demo-guitab`, which needs no
credentials — the `demo-` prefix is what tells the emulator to run standalone.
**This is a test tier, not a deploy path**: the `deploy` job does not depend on it
shipping a rules change, because it never does. After merging one, deploy it by
hand:

```bash
firebase deploy --only database
```

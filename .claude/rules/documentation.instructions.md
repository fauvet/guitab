---
description: "Use before editing any Markdown in this repo, or when a change makes an instruction file wrong. Covers what each kind of document may say and how the single instruction tree is kept single."
applyTo: "**/*.md"
---

# Documentation and instruction files

Instruction files decide what the next change looks like, so a wrong one is a bug
with a long fuse. This document owns the question "which document does this change
touch, and how do I keep it true?" — the ownership table itself lives in the root
`CLAUDE.md`.

## What each kind of document may say

| Kind                        | Says                                            | Never says                                   |
| --------------------------- | ----------------------------------------------- | -------------------------------------------- |
| `CLAUDE.md`                 | What is true about this repo, today             | How to install anything                      |
| `.claude/rules/*.md`        | How to write code here, and why the rule exists | What the code currently contains, in detail  |
| `.claude/skills/*/SKILL.md` | How a library, format or domain works           | Project conventions — those belong to a rule |
| `README.md`                 | How to run, configure and deploy                | Any convention — link to the rule instead    |
| `CHANGELOG.md`              | What changed, for a user                        | Why the implementation is shaped that way    |

## Do not write down what the code already says

Hard rule 7 of `CLAUDE.md`, and this is where it is most often broken, because an
instruction file feels like a snapshot. It is not: it outlives the snapshot. Never
copy into prose a version number, a coverage percentage, a bundle budget, a route
table, a list of files, or a count of anything — link to the file that owns it.

The test for whether a sentence is safe: **could a commit that does not touch this
document make it false?** If yes, it is a fact about the code, and the code should
be the one saying it.

`architecture.instructions.md` sits closest to that line on purpose. Its data-flow
diagrams and state-ownership table are genuinely hard to reconstruct from the source
and cheap to keep true, so they earn their place — but they are the first thing to
check when a service changes shape, and the first thing to trim if they start
describing implementation rather than flow.

## One tree, and the check that keeps it one

`.github/copilot-instructions.md`, `.github/instructions/` and `.github/skills/`
are symlinks into `CLAUDE.md` and `.claude/`. That is what lets a
single file serve both Claude Code and Copilot — and it is why every rule file keeps
the `.instructions.md` suffix and its `applyTo:` frontmatter, which Copilot needs to
apply a rule to the right paths.

`npm run check:docs` fails the build on the three failures that killed the previous
setup:

1. **A second tree resurrected** — any of those three paths becoming a real file
   instead of a symlink, or a `.cursorrules` / `.windsurfrules` appearing.
2. **A referenced path that does not exist** — the cheapest possible check against
   documents that quietly rot after a rename.
3. **A file over its size budget** — bloat is drift's precondition.

Know what it cannot see: it cannot tell whether a sentence is _true_, only whether
the paths in it resolve. That part is on you.

Hitting a size budget is a signal, not an obstacle. Move the detail into the
document that owns the topic and link to it. Raising a budget to fit more prose is
the wrong fix.

## A document that has become false is a bug

Correct it where it is wrong, in the same commit as the code. Do not add a note
elsewhere saying it is out of date: two documents disagreeing is worse than one being
stale, because a stale document is merely wrong, while a contradiction makes the reader
guess which half to trust — and whichever they read first decides what they write.

If you genuinely cannot fix it in the same change, say so in one sentence, next to
the claim. The reader who lands on the claim is the one who needs the warning.

## Changing a convention

Exactly **one** document changes — the owner from the table in the root `CLAUDE.md`.
If your diff updates two, one of them is a duplicate: delete it and leave a link.
Update it in the same commit as the code, never as a follow-up. A rule that
describes the previous commit is the failure mode this whole tree exists to prevent.

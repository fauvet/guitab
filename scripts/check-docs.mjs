#!/usr/bin/env node
/**
 * Instruction-tree integrity check.
 *
 * The previous setup had two authoritative trees — .github/ for Copilot and
 * nothing for Claude — and they drifted until they contradicted each other: one
 * prompt taught `jasmine.createSpyObj` months after Jasmine had been removed
 * and the testing rules had forbidden it. Whichever an agent read first decided
 * whether the code it wrote compiled.
 *
 * There is now one tree, and this script fails the build on the three ways it
 * could stop being one:
 *
 *   1. A .github/ entry point becoming a real file instead of a symlink, or a
 *      Cursor/Windsurf rules file appearing. That is a second tree, by
 *      definition.
 *   2. A referenced path that no longer exists — the cheapest possible guard
 *      against a document quietly rotting after a rename.
 *   3. A file over its size budget. Bloat is drift's precondition: nobody
 *      re-reads a document they have stopped finishing.
 *
 * What it cannot see: whether a sentence is *true*. Only that its paths
 * resolve. That part is on the author.
 *
 * Run with `npm run check:docs`.
 */
import { readFileSync, existsSync, lstatSync, globSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const errors = [];

// ── 1. One tree only ────────────────────────────────────────────────────────
// These are the Copilot entry points. Each must be a symlink into
// CLAUDE.md or .claude/ — one content, two toolchains, no duplication.
const MUST_BE_SYMLINKS = [".github/copilot-instructions.md", ".github/instructions", ".github/skills"];

for (const path of MUST_BE_SYMLINKS) {
  const absolute = join(ROOT, path);
  if (!existsSync(absolute)) continue;
  if (!lstatSync(absolute).isSymbolicLink()) {
    errors.push(
      `${path} is a real file, not a symlink.\n` +
        `    It must link into CLAUDE.md or .claude/. A copy is a second tree, ` +
        `and a second tree is how the last one ended up contradicting itself.`,
    );
  }
}

const FORBIDDEN = [".cursorrules", ".cursor/rules/**", ".windsurfrules", ".github/prompts/**/*.md"];

for (const pattern of FORBIDDEN) {
  for (const found of globSync(pattern, { cwd: ROOT })) {
    errors.push(
      `Second instruction tree resurrected: ${found}\n` +
        `    All agent-facing instruction lives in CLAUDE.md and .claude/.`,
    );
  }
}

// AGENTS.md is allowed only as a symlink to CLAUDE.md — never a copy.
if (existsSync(join(ROOT, "AGENTS.md")) && !lstatSync(join(ROOT, "AGENTS.md")).isSymbolicLink()) {
  errors.push("AGENTS.md must be a symlink to CLAUDE.md, not a copy that can drift.");
}

// ── 2. Size budgets ─────────────────────────────────────────────────────────
// Hitting one is a signal, not an obstacle: move the detail into the document
// that owns the topic and link to it. Raising a budget to fit more prose is the
// wrong fix.
const BUDGETS = [
  { pattern: "CLAUDE.md", max: 130 },
  { pattern: ".claude/rules/*.md", max: 220 },
  { pattern: ".claude/skills/*/SKILL.md", max: 220 },
];

for (const { pattern, max } of BUDGETS) {
  for (const file of globSync(pattern, { cwd: ROOT })) {
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n").length;
    if (lines > max) {
      errors.push(
        `${file} is ${lines} lines (budget ${max}).\n` +
          `    Move the detail into the document that owns the topic and link to it.`,
      );
    }
  }
}

// ── 3. Every referenced path must exist ─────────────────────────────────────
const INSTRUCTION_FILES = [
  ...globSync("CLAUDE.md", { cwd: ROOT }),
  ...globSync(".claude/rules/*.md", { cwd: ROOT }),
  ...globSync(".claude/skills/*/SKILL.md", { cwd: ROOT }),
  ...globSync("README.md", { cwd: ROOT }),
];

// A repo-relative path in prose or backticks: src/…, .claude/…, scripts/…
const PATH_PATTERN = /(?:^|[\s`([])((?:src|scripts|\.claude|\.github|e2e|docs)\/[\w./*-]*[\w/])/g;

for (const file of INSTRUCTION_FILES) {
  const contents = readFileSync(join(ROOT, file), "utf8");
  const seen = new Set();

  for (const [, candidate] of contents.matchAll(PATH_PATTERN)) {
    // A glob is a description, not a path; and the output directory is built,
    // not committed.
    if (candidate.includes("*") || candidate.startsWith("docs/") || seen.has(candidate)) continue;
    seen.add(candidate);

    if (!existsSync(join(ROOT, candidate))) {
      errors.push(`${file} references ${candidate}, which does not exist.`);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`\nInstruction-tree check failed (${errors.length}):\n`);
  for (const error of errors) console.error(`  • ${error}\n`);
  process.exit(1);
}

console.log(`Instruction tree OK — ${INSTRUCTION_FILES.length} documents checked.`);

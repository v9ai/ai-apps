#!/usr/bin/env tsx
/**
 * Scan staged git diff for accidental secret leaks before commit.
 *
 * Currently checks for DeepSeek API key shape (sk-[a-f0-9]{32}). Extend
 * the SECRET_PATTERNS array as new providers are added.
 *
 * Designed to be wired into a pre-commit hook; for now it's a manual
 * `pnpm check:secret-leaks`.
 */
import { execSync } from "node:child_process";

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "DeepSeek API key", pattern: /\bsk-[a-f0-9]{32}\b/g },
];

// No paths are exempt by default. .env.example uses placeholder values, not
// real keys, so a future accidental example like
// `DEEPSEEK_API_KEY=sk-deadbeef...` would still trigger — that's intentional.

function getStagedDiff(): string {
  try {
    return execSync("git diff --cached --no-color", { encoding: "utf8" });
  } catch (e) {
    console.error("Failed to read staged diff:", e);
    process.exit(2);
  }
}

const diff = getStagedDiff();
if (!diff) {
  console.log("No staged changes — nothing to scan.");
  process.exit(0);
}

let leaks = 0;
for (const { name, pattern } of SECRET_PATTERNS) {
  const matches = diff.match(pattern);
  if (matches) {
    leaks += matches.length;
    console.error(
      `LEAK: ${name} (${matches.length} match${matches.length > 1 ? "es" : ""})`,
    );
    // Don't print the actual match — that would just leak it twice.
  }
}

if (leaks > 0) {
  console.error(
    `\n${leaks} potential secret(s) in staged changes. Refusing to pass.`,
  );
  console.error(
    "Unstage the offending file(s), rotate the key on the provider dashboard, and try again.",
  );
  process.exit(1);
}

console.log("OK — no known secret patterns in staged diff.");

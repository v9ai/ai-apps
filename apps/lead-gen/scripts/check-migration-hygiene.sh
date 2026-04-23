#!/usr/bin/env bash
# Warn if src/db/schema.ts is staged without a corresponding new migration file.
# Works from any cwd — matches paths relative to the repo root.
set -e

schema_changed=$(git diff --cached --name-only | grep -c "^apps/lead-gen/src/db/schema.ts$" || true)
migrations_added=$(git diff --cached --name-only --diff-filter=A | grep -c "^apps/lead-gen/migrations/" || true)

if [ "$schema_changed" -gt 0 ] && [ "$migrations_added" -eq 0 ]; then
  echo "WARNING: apps/lead-gen/src/db/schema.ts modified but no new migration file staged." >&2
  echo "  Run: pnpm --filter agentic-lead-gen db:generate" >&2
  echo "  If this is intentional (renames, comment tweaks), override with: git commit --no-verify" >&2
  exit 1
fi

exit 0

#!/bin/bash
# Pre-compact hook — backup transcript and save modified file state
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
TERMINAL="${CLAUDE_WORKTREE:-default}"
ITERATION="${CLAUDE_ITERATION:-0}"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  mkdir -p .claude/backups
  cp "$TRANSCRIPT_PATH" ".claude/backups/pre-compact-$(date +%s).jsonl" 2>/dev/null
fi

MODIFIED=$(git diff --name-only HEAD 2>/dev/null | head -20 | tr '\n' ', ')
if [ -n "$MODIFIED" ]; then
  python3 - "$SCRIPT_DIR" "$MODIFIED" "$TERMINAL" "$ITERATION" 2>/dev/null <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
import iteration_memory as mem
mem.store('Pre-compaction state: Modified files: ' + sys.argv[2], 'progress', sys.argv[3], int(sys.argv[4]))
PYEOF
fi

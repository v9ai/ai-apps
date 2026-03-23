#!/bin/bash
# Session start hook — outputs current state + relevant memories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cat > /dev/null  # drain stdin

echo "## Current State"
echo "- Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "- Last commit: $(git log --oneline -1 2>/dev/null || echo 'none')"
echo "- Uncommitted: $(git diff --shortstat 2>/dev/null)"
echo ""

if [ -f PROGRESS.md ]; then
  echo "## Iteration Progress"
  cat PROGRESS.md
  echo ""
fi

TERMINAL="${CLAUDE_WORKTREE:-default}"
QUERY=$(grep -m1 '.' PROGRESS.md 2>/dev/null | head -c 200)
QUERY="${QUERY:-current project status}"

python3 - "$SCRIPT_DIR" "$QUERY" "$TERMINAL" 2>/dev/null <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
import iteration_memory as mem
print(mem.recall_formatted(sys.argv[2], n=8))
print()
print(mem.dump_formatted(sys.argv[3], last_n=5))
PYEOF

if [ -f .claude/decisions-log.md ]; then
  echo ""
  echo "## Recent Decisions"
  tail -20 .claude/decisions-log.md
fi

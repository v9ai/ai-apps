#!/bin/bash
# Stop hook — save decisions and failures from the session transcript
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
TERMINAL="${CLAUDE_WORKTREE:-default}"
ITERATION="${CLAUDE_ITERATION:-0}"

[ -f PROGRESS.md ] && cp PROGRESS.md .claude/iteration-state.md 2>/dev/null

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  LAST_MSG=$(tail -20 "$TRANSCRIPT_PATH" | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text' 2>/dev/null | tail -1 | head -c 500)
  if [ -n "$LAST_MSG" ]; then
    if echo "$LAST_MSG" | grep -qiE '(decided|chose|using|switched to|important:|note:|warning:|gotcha:)'; then
      python3 - "$SCRIPT_DIR" "$LAST_MSG" "$TERMINAL" "$ITERATION" 2>/dev/null <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
import iteration_memory as mem
mem.store(sys.argv[2], 'decision', sys.argv[3], int(sys.argv[4]))
PYEOF
    fi

    if echo "$LAST_MSG" | grep -qiE '(error|failed|bug|issue|problem|broke)'; then
      python3 - "$SCRIPT_DIR" "$LAST_MSG" "$TERMINAL" "$ITERATION" 2>/dev/null <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
import iteration_memory as mem
mem.store(sys.argv[2], 'failure', sys.argv[3], int(sys.argv[4]))
PYEOF
    fi
  fi
fi

PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
echo "$(date -Iseconds) | terminal=$TERMINAL | iter=$ITERATION" >> "$PROJECT_DIR/.claude/iteration-log.txt" 2>/dev/null

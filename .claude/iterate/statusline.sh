#!/bin/bash
# Statusline script for iterate — outputs "iter N/M [score] [sim]" when a session is active.
# Reads JSON from stdin (Claude Code statusline protocol) to identify the current session.

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
HOOK_CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

# --- Locate the iterate dir for THIS session (same logic as kick-session.sh) ---
ITER_DIR=""

# Fast path: session_id prefix match
if [ -n "$SESSION_ID" ]; then
    CANDIDATE="/tmp/claude-iterate-${SESSION_ID:0:12}"
    if [ -f "$CANDIDATE/task.txt" ] && [ -f "$CANDIDATE/counter" ]; then
        ITER_DIR="$CANDIDATE"
    fi
fi

# Fallback: scan by session.txt or CWD match
if [ -z "$ITER_DIR" ]; then
    for d in /tmp/claude-iterate-*/; do
        [ -f "${d}task.txt" ] && [ -f "${d}counter" ] || continue
        _owner=$(cat "${d}session.txt" 2>/dev/null || echo "")
        if [ -n "$SESSION_ID" ] && [ "$_owner" = "$SESSION_ID" ]; then
            ITER_DIR="${d%/}"
            break
        fi
        if [ -z "$_owner" ] && [ -n "$HOOK_CWD" ]; then
            _stored_cwd=$(cat "${d}cwd.txt" 2>/dev/null || echo "")
            if [ "$_stored_cwd" = "$HOOK_CWD" ]; then
                ITER_DIR="${d%/}"
                break
            fi
        fi
    done
fi

# CLAUDE_ITERATE_DIR env var override
if [ -z "$ITER_DIR" ] && [ -n "${CLAUDE_ITERATE_DIR:-}" ] && [ -f "${CLAUDE_ITERATE_DIR}/task.txt" ]; then
    ITER_DIR="$CLAUDE_ITERATE_DIR"
fi

[ -z "$ITER_DIR" ] && exit 0

COUNT=$(cat "${ITER_DIR}/counter" 2>/dev/null || echo "")
TOTAL=$(cat "${ITER_DIR}/iterations.txt" 2>/dev/null || echo "")
[ -n "$COUNT" ] && [ -n "$TOTAL" ] || exit 0

STATUS="iter ${COUNT}/${TOTAL}"

# Append latest Task Completion score if available
SCORES_FILE="${ITER_DIR}/scores.json"
if [ -f "$SCORES_FILE" ]; then
    LAST_SCORE=$(python3.12 -c "
import json, sys
try:
    data = json.load(open('${SCORES_FILE}'))
    if data:
        s = data[-1].get('Task Completion', {}).get('score')
        if s is not None:
            print(f'{float(s):.2f}')
except Exception:
    pass
" 2>/dev/null || echo "")
    [ -n "$LAST_SCORE" ] && STATUS="${STATUS} tc=${LAST_SCORE}"
fi

# Append semantic similarity stall count
SEM_STALL=$(cat "${ITER_DIR}/sem-stall-count.txt" 2>/dev/null || echo "")
[ -n "$SEM_STALL" ] && [ "$SEM_STALL" -gt 0 ] 2>/dev/null && STATUS="${STATUS} rep=${SEM_STALL}"

echo "$STATUS"

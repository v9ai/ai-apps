#!/bin/bash
# Statusline script for iterate — outputs "iter N/M [score] [sim]" when a session is active.
# Reads JSON from stdin (Claude Code statusline protocol) but ignores it;
# state comes from the iterate temp files.

cat > /dev/null  # drain stdin

for d in /tmp/claude-iterate-*/; do
    [ -f "${d}task.txt" ] && [ -f "${d}counter" ] || continue
    COUNT=$(cat "${d}counter" 2>/dev/null || echo "")
    TOTAL=$(cat "${d}iterations.txt" 2>/dev/null || echo "")
    [ -n "$COUNT" ] && [ -n "$TOTAL" ] || continue

    STATUS="iter ${COUNT}/${TOTAL}"

    # Append latest Task Completion score if available
    SCORES_FILE="${d}scores.json"
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

    # Append semantic similarity from latest store result if available
    SEM_STALL=$(cat "${d}sem-stall-count.txt" 2>/dev/null || echo "")
    [ -n "$SEM_STALL" ] && [ "$SEM_STALL" -gt 0 ] 2>/dev/null && STATUS="${STATUS} rep=${SEM_STALL}"

    echo "$STATUS"
    exit 0
done

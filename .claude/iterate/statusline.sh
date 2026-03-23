#!/bin/bash
# Statusline script for iterate — outputs "iter N/M" when a session is active.
# Reads JSON from stdin (Claude Code statusline protocol) but ignores it;
# state comes from the iterate temp files.

cat > /dev/null  # drain stdin

for d in /tmp/claude-iterate-*/; do
    [ -f "${d}task.txt" ] && [ -f "${d}counter" ] || continue
    COUNT=$(cat "${d}counter" 2>/dev/null || echo "")
    TOTAL=$(cat "${d}iterations.txt" 2>/dev/null || echo "")
    [ -n "$COUNT" ] && [ -n "$TOTAL" ] || continue
    echo "iter ${COUNT}/${TOTAL}"
    exit 0
done

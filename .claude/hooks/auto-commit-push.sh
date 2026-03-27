#!/usr/bin/env bash
# Auto-commit and push on Claude Stop event
set -uo pipefail

cat > /dev/null  # drain stdin

# Skip during iterate — kick-session.sh handles the Stop hook
# Only skip if the iterate session is actually running (has a live PID)
for _d in /tmp/claude-iterate-*/; do
    [ -f "${_d}task.txt" ] || continue
    _pid=""
    [ -f "${_d}session.txt" ] && _pid=$(cat "${_d}session.txt" 2>/dev/null)
    if [ -n "$_pid" ] && kill -0 "$_pid" 2>/dev/null; then
        exit 0  # iterate session is alive — let kick-session.sh handle it
    fi
done

git rev-parse --is-inside-work-tree > /dev/null 2>&1 || exit 0

# Nothing to commit?
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    exit 0
fi

git add -A -- . ':!.env*' ':!*.local'

# Detect scope from changed files (e.g. apps/knowledge -> knowledge)
FILES=$(git diff --cached --name-only)
SCOPE=$(echo "$FILES" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u)
N_SCOPE=$(echo "$SCOPE" | grep -c . 2>/dev/null || echo 0)

if [ "$N_SCOPE" -eq 1 ] && [ -n "$SCOPE" ]; then
    TAG="($SCOPE)"
elif [ "$N_SCOPE" -gt 1 ]; then
    TAG="($(echo "$SCOPE" | paste -sd ',' -))"
elif echo "$FILES" | grep -q '^crates/'; then
    TAG="(crates)"
elif echo "$FILES" | grep -q '^packages/'; then
    TAG="(packages)"
elif echo "$FILES" | grep -q '\.claude/'; then
    TAG="(hooks)"
else
    TAG=""
fi

# Strip extensions, dedupe, truncate if too many
NAMES=$(echo "$FILES" | xargs -n1 basename | sed 's/\.[^.]*$//' | sort -u)
COUNT=$(echo "$NAMES" | wc -l | tr -d ' ')
if [ "$COUNT" -le 5 ]; then
    SUMMARY="chore${TAG}: $(echo "$NAMES" | paste -sd ', ' -)"
else
    TOP=$(echo "$NAMES" | head -3 | paste -sd ', ' -)
    SUMMARY="chore${TAG}: ${TOP} (+$((COUNT - 3)) more)"
fi

git commit -m "${SUMMARY}" --no-verify > /dev/null 2>&1 || exit 0
git push --no-verify > /dev/null 2>&1

exit 0

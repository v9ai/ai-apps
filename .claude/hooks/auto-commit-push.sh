#!/usr/bin/env bash
# Auto-commit and push on Claude Stop event
set -uo pipefail

INPUT=$(cat)

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

# Skip if a merge / rebase / cherry-pick / revert / bisect is in progress —
# auto-committing mid-operation can ship conflict markers or partial state.
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || exit 0
for _f in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG; do
    [ -e "$GIT_DIR/$_f" ] && exit 0
done
[ -d "$GIT_DIR/rebase-merge" ] || [ -d "$GIT_DIR/rebase-apply" ] && exit 0

# Nothing to commit?
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    exit 0
fi

# Refuse to commit if any tracked file has unresolved conflict markers.
git diff --check > /dev/null 2>&1 || exit 0

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

# Use Claude's final message as commit message
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)

if [ -n "$LAST_MSG" ]; then
    # First non-empty line → subject, rest → body
    SUBJECT=$(echo "$LAST_MSG" | grep -v '^\s*$' | head -1 | sed 's/[[:space:]]*$//')
    BODY=$(echo "$LAST_MSG" | tail -n +2)
    SUBJECT="${TAG:+${TAG}: }${SUBJECT}"
else
    SUBJECT="chore${TAG}: auto-commit"
    BODY=""
fi

if [ -n "$BODY" ]; then
    git commit -m "${SUBJECT}" -m "${BODY}" --no-verify > /dev/null 2>&1 || exit 0
else
    git commit -m "${SUBJECT}" --no-verify > /dev/null 2>&1 || exit 0
fi
git push --no-verify > /dev/null 2>&1

exit 0

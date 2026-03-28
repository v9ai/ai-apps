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

# Extract commit message from Claude's last assistant message
# The hook payload has last_assistant_message with what Claude just did
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)

SUMMARY=""
if [ -n "$LAST_MSG" ]; then
    # Take first meaningful sentence (skip blank lines, code blocks, bullets)
    FIRST_LINE=$(echo "$LAST_MSG" \
        | grep -v '^```' | grep -v '^\s*$' | grep -v '^\s*[-*]' | grep -v '^#' \
        | head -1 | sed 's/[[:space:]]*$//')

    if [ -n "$FIRST_LINE" ]; then
        # Lowercase first char, strip trailing period
        FIRST_LINE=$(echo "$FIRST_LINE" | sed 's/^./\L&/' | sed 's/\.$//')
        SUMMARY="${TAG:+${TAG} }${FIRST_LINE}"
    fi
fi

# Fallback: verb + directory-level description
if [ -z "$SUMMARY" ] || [ "${#SUMMARY}" -gt 72 ]; then
    NEW_FILES=$(git diff --cached --diff-filter=A --name-only | wc -l | tr -d ' ')
    DEL_FILES=$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')
    MOD_FILES=$(git diff --cached --diff-filter=M --name-only | wc -l | tr -d ' ')
    INS=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
    DEL=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ deletion'  | grep -oE '[0-9]+' || echo 0)

    if [ "$NEW_FILES" -gt 0 ] && [ "$MOD_FILES" -eq 0 ] && [ "$DEL_FILES" -eq 0 ]; then
        VERB="add"
    elif [ "$DEL_FILES" -gt 0 ] && [ "$NEW_FILES" -eq 0 ]; then
        VERB="remove"
    elif [ "${DEL:-0}" -gt "${INS:-0}" ]; then
        VERB="refactor"
    else
        VERB="update"
    fi

    DIRS=$(echo "$FILES" | sed 's|/[^/]*$||' | sort -u)
    N_DIRS=$(echo "$DIRS" | grep -c . 2>/dev/null || echo 0)
    if [ "$N_DIRS" -eq 1 ]; then
        WHAT=$(basename "$DIRS")
    elif [ "$N_DIRS" -le 3 ]; then
        WHAT=$(echo "$DIRS" | xargs -n1 basename | sort -u | paste -sd ', ' -)
    else
        TOP_DIRS=$(echo "$DIRS" | xargs -n1 basename | sort -u | head -2 | paste -sd ', ' -)
        WHAT="${TOP_DIRS} (+$((N_DIRS - 2)) dirs)"
    fi

    SUMMARY="${VERB}${TAG}: ${WHAT}"
fi

# Truncate if too long
[ "${#SUMMARY}" -gt 72 ] && SUMMARY="${SUMMARY:0:69}..."

git commit -m "${SUMMARY}" --no-verify > /dev/null 2>&1 || exit 0
git push --no-verify > /dev/null 2>&1

exit 0

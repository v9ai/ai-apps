#!/usr/bin/env bash
# Auto-commit and push on Claude Stop event
# Uses last_assistant_message from stdin JSON for commit message

set -uo pipefail

# Read stdin JSON (Stop hook payload)
INPUT=$(cat)

# Must be in a git repo
git rev-parse --is-inside-work-tree > /dev/null 2>&1 || exit 0

# Check for any changes (staged or unstaged, including untracked)
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    exit 0
fi

# Stage everything
git add -A

# Detect scope from changed files (e.g. apps/knowledge -> knowledge)
CHANGED_FILES=$(git diff --cached --name-only)
SCOPE=$(echo "$CHANGED_FILES" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u)
if [ "$(echo "$SCOPE" | wc -l | tr -d ' ')" -eq 1 ] && [ -n "$SCOPE" ]; then
    PREFIX="chore(${SCOPE}): "
elif echo "$CHANGED_FILES" | grep -q '^crates/'; then
    PREFIX="chore(crates): "
elif echo "$CHANGED_FILES" | grep -q '^packages/'; then
    PREFIX="chore(packages): "
elif echo "$CHANGED_FILES" | grep -q '\.claude/'; then
    PREFIX="chore(hooks): "
else
    PREFIX="chore: "
fi

# Build summary from diff stat (no API/token usage)
STAT=$(git diff --cached --stat | tail -1 | sed 's/^ *//')
SUMMARY="${PREFIX}${STAT}"

git commit -m "${SUMMARY}" --no-verify > /dev/null 2>&1 || exit 0

# Push (foreground so it completes reliably)
git push --no-verify > /dev/null 2>&1

exit 0

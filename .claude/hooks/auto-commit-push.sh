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

# Extract first meaningful line from Claude's last message as commit summary
SUMMARY=""
if command -v jq > /dev/null 2>&1; then
    SUMMARY=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null | head -1 | cut -c1-120)
fi

# Fallback to diff stat if no message available
if [ -z "$SUMMARY" ]; then
    SUMMARY=$(git diff --cached --stat | tail -1)
fi

git commit -m "auto: ${SUMMARY}" --no-verify > /dev/null 2>&1 || exit 0

# Push (best-effort, don't block Claude)
git push --no-verify > /dev/null 2>&1 &

exit 0

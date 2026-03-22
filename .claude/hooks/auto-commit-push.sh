#!/usr/bin/env bash
# Auto-commit and push on Claude Stop event
# Only acts if there are staged/unstaged changes in a git repo

set -uo pipefail

# Must be in a git repo
git rev-parse --is-inside-work-tree > /dev/null 2>&1 || exit 0

# Check for any changes (staged or unstaged, including untracked)
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    exit 0
fi

# Stage everything
git add -A

# Generate commit message from diff summary
SUMMARY=$(git diff --cached --stat | tail -1)
git commit -m "auto: ${SUMMARY}" --no-verify > /dev/null 2>&1 || exit 0

# Push (best-effort, don't block Claude)
git push --no-verify > /dev/null 2>&1 &

exit 0

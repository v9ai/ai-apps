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

git add -A -- . ':!.env*' ':!*.local' 2>/dev/null || true

# Nothing actually staged? (e.g. only dirty submodule content, no gitlink move) — bail.
git diff --cached --quiet && exit 0

# Detect scope from changed files (e.g. apps/knowledge -> knowledge)
FILES=$(git diff --cached --name-only)
SCOPE=$(printf '%s\n' "$FILES" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u)
N_SCOPE=$(printf '%s' "$SCOPE" | grep -c .)

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

# Fallback: pull the last assistant text turn from the transcript file
if [ -z "$LAST_MSG" ]; then
    TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
    if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
        LAST_MSG=$(python3 - "$TRANSCRIPT" <<'PY' 2>/dev/null || true
import json, sys
last = ""
with open(sys.argv[1]) as f:
    for line in f:
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("type") != "assistant":
            continue
        for c in (e.get("message", {}) or {}).get("content", []) or []:
            if isinstance(c, dict) and c.get("type") == "text":
                t = (c.get("text") or "").strip()
                if t:
                    last = t
print(last)
PY
)
    fi
fi

if [ -n "$LAST_MSG" ]; then
    # First non-empty line as candidate subject
    RAW_SUBJECT=$(printf '%s\n' "$LAST_MSG" | awk 'NF { print; exit }')
    # Strip basic markdown (heading prefix, backticks, **bold**, *italic*)
    RAW_SUBJECT=$(printf '%s' "$RAW_SUBJECT" | sed -E 's/^#+[[:space:]]*//; s/`([^`]+)`/\1/g; s/\*\*([^*]+)\*\*/\1/g; s/\*([^*]+)\*/\1/g')
    # Take first sentence — text up to the first .!? followed by space (or end)
    SUBJECT=$(printf '%s' "$RAW_SUBJECT" | sed -E 's/^([^.!?]*[.!?])[[:space:]].*$/\1/')
    # Strip trailing whitespace, colons, dashes, em/en-dashes
    SUBJECT=$(printf '%s' "$SUBJECT" | sed -E 's/[[:space:]:—–-]+$//')
    # Truncate to 72 chars with ellipsis
    if [ "${#SUBJECT}" -gt 72 ]; then
        SUBJECT="$(printf '%s' "$SUBJECT" | cut -c1-69)..."
    fi
    # If subject collapsed to empty or a section-header label, fall back
    case "$(printf '%s' "$SUBJECT" | tr '[:upper:]' '[:lower:]')" in
        ""|summary|notes|changes) SUBJECT="" ;;
    esac

    if [ -n "$SUBJECT" ]; then
        BODY="$LAST_MSG"
        SUBJECT="${TAG:+${TAG}: }${SUBJECT}"
    else
        SUBJECT="chore${TAG}: auto-commit"
        BODY="$LAST_MSG"
    fi
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

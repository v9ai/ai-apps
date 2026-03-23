#!/bin/bash
set -uo pipefail

# ==============================================================
# Claude Code Stop Hook — Iterate with Chroma + Eval
#
# Exit 0  = done, stop iterating
# Exit 2  = send feedback to Claude via stderr, keep going
# ==============================================================

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Read hook input (must drain stdin before any exit) ---
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Locate the iterate dir for this session.
# 1. Try the canonical per-session path (session_id prefix).
# 2. Fall back to scanning:
#    a. session.txt matches session_id
#    b. cwd.txt matches hook CWD (handles start.sh run without CLAUDE_CODE_SESSION_ID)
#    c. both sides have empty session ID
ITER_DIR=""
if [ -n "$SESSION_ID" ]; then
    CANDIDATE="/tmp/claude-iterate-${SESSION_ID:0:12}"
    if [ -f "$CANDIDATE/task.txt" ]; then
        ITER_DIR="$CANDIDATE"
    fi
fi

if [ -z "$ITER_DIR" ]; then
    for _d in /tmp/claude-iterate-*/; do
        [ -f "${_d}task.txt" ] || continue
        _owner=$(cat "${_d}session.txt" 2>/dev/null || echo "")
        if [ -n "$SESSION_ID" ] && [ "$_owner" = "$SESSION_ID" ]; then
            ITER_DIR="${_d%/}"
            break
        fi
        # start.sh ran without CLAUDE_CODE_SESSION_ID (Bash tool env) → session.txt is empty.
        # Match by stored CWD instead.
        if [ -z "$_owner" ] && [ -n "$HOOK_CWD" ]; then
            _stored_cwd=$(cat "${_d}cwd.txt" 2>/dev/null || echo "")
            if [ "$_stored_cwd" = "$HOOK_CWD" ]; then
                ITER_DIR="${_d%/}"
                break
            fi
        fi
        # Last resort: both sides have no session ID
        if [ -z "$SESSION_ID" ] && [ -z "$_owner" ]; then
            ITER_DIR="${_d%/}"
            break
        fi
    done
fi

# --- No matching iterate session ---
if [ -z "$ITER_DIR" ] || [ ! -f "$ITER_DIR/task.txt" ]; then
    exit 0
fi

# Backfill session.txt so subsequent stop events use the fast path
if [ -n "$SESSION_ID" ] && [ -z "$(cat "$ITER_DIR/session.txt" 2>/dev/null)" ]; then
    echo "$SESSION_ID" > "$ITER_DIR/session.txt"
fi

COUNTER_FILE="$ITER_DIR/counter"
TASK_FILE="$ITER_DIR/task.txt"
SCORES_FILE="$ITER_DIR/scores.json"

_record_end() {
    local reason="$1" score="${2:-0.0}"
    python3.12 "${SCRIPTS_DIR}/task_history.py" end \
        --task "$TASK" \
        --session "${SESSION_ID:-none}" \
        --iterations "$COUNT" \
        --score "$score" \
        --reason "$reason" 2>/dev/null || true
}

mkdir -p "$ITER_DIR"
TASK=$(cat "$TASK_FILE")
ITER_CWD=$(cat "$ITER_DIR/cwd.txt" 2>/dev/null || echo "")
MAX_ITERATIONS=$(cat "$ITER_DIR/max.txt" 2>/dev/null || echo "10")
# Guard against non-numeric max
[[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]] || MAX_ITERATIONS=10

export CLAUDE_ITERATE_CHROMA_PATH="$ITER_DIR/chroma"
export CLAUDE_ITERATE_CWD="$ITER_CWD"

# --- Counter ---
if [ ! -f "$COUNTER_FILE" ]; then
    echo "0" > "$COUNTER_FILE"
fi

COUNT=$(cat "$COUNTER_FILE")
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Debug log
echo "[kick-session] iter=$COUNT session=${SESSION_ID:0:8} dir=$ITER_DIR cwd=$CWD" >> "$ITER_DIR/debug.log" 2>/dev/null || true

# --- Hard limit ---
if [ "$COUNT" -ge "$MAX_ITERATIONS" ]; then
    _last_score=$(python3.12 -c "
import sys, json, os
f = '${SCORES_FILE}'
if os.path.exists(f):
    data = json.load(open(f))
    if data:
        print(data[-1].get('Task Completion', {}).get('score', 0.0))
        sys.exit(0)
print(0.0)
" 2>/dev/null || echo "0.0")
    _record_end "max iterations reached" "$_last_score"
    rm -f "$COUNTER_FILE" "$TASK_FILE" "$ITER_DIR/session.txt"
    echo "Iterate: complete — reached $MAX_ITERATIONS iterations." >&2
    exit 0
fi

# --- Capture this iteration's output from transcript ---
ITER_OUTPUT="$ITER_DIR/output-iter-${COUNT}.txt"

if [ -n "$SESSION_ID" ]; then
    # Transcripts are stored as {session_id}.jsonl directly in the project dir
    TRANSCRIPT_FILE=$(find "$HOME/.claude/projects" -name "${SESSION_ID}.jsonl" -maxdepth 2 2>/dev/null | head -1)
    echo "[kick-session] transcript_file=$TRANSCRIPT_FILE" >> "$ITER_DIR/debug.log" 2>/dev/null || true

    if [ -n "$TRANSCRIPT_FILE" ] && [ -f "$TRANSCRIPT_FILE" ]; then
        jq -rs '
            [.[] | select(.type == "assistant") | .message.content // empty]
            | last
            | if type == "array" then map(select(.type == "text") | .text) | join("\n")
              elif type == "string" then .
              else ""
              end
        ' "$TRANSCRIPT_FILE" > "$ITER_OUTPUT" 2>/dev/null || true
        echo "[kick-session] output_size=$(wc -c < "$ITER_OUTPUT" 2>/dev/null)" >> "$ITER_DIR/debug.log" 2>/dev/null || true
    fi
fi

# --- Step 1: Store in Chroma ---
if [ -f "$ITER_OUTPUT" ] && [ -s "$ITER_OUTPUT" ]; then
    python3.12 "$SCRIPTS_DIR/store_context.py" \
        --iteration "$COUNT" \
        --task "$TASK" \
        --file "$ITER_OUTPUT" \
        >> "$ITER_DIR/debug.log" 2>&1 || true
fi

# --- Stall detection: if no new code changes for 2+ iterations, stop ---
if [ "$COUNT" -ge 1 ]; then
    # Use committed file list (excludes iterate state files) as the change fingerprint
    CURRENT_DIFF=$(cd "$ITER_CWD" 2>/dev/null && git diff HEAD~1 --name-only --no-color 2>/dev/null | grep -v '^\.claude/' | sort || echo "")
    PREV_DIFF=$(cat "$ITER_DIR/prev-diff-names.txt" 2>/dev/null || echo "")
    echo "$CURRENT_DIFF" > "$ITER_DIR/prev-diff-names.txt"

    if [ -n "$CURRENT_DIFF" ] && [ "$CURRENT_DIFF" = "$PREV_DIFF" ]; then
        STALL_COUNT=$(cat "$ITER_DIR/stall-count.txt" 2>/dev/null || echo "0")
        STALL_COUNT=$((STALL_COUNT + 1))
        echo "$STALL_COUNT" > "$ITER_DIR/stall-count.txt"
        echo "[kick-session] stall=$STALL_COUNT" >> "$ITER_DIR/debug.log" 2>/dev/null || true
        if [ "$STALL_COUNT" -ge 2 ]; then
            _record_end "stall — no code changes" "0.0"
            echo "Iterate: stopped — no new code changes for $STALL_COUNT iterations" >&2
            rm -f "$COUNTER_FILE" "$TASK_FILE" "$ITER_DIR/session.txt"
            exit 0
        fi
    else
        echo "0" > "$ITER_DIR/stall-count.txt"
    fi
fi

# --- Step 2: Evaluate ---
SHOULD_CONTINUE=true
EVAL_FEEDBACK=""
TREND_FEEDBACK=""

if [ "$COUNT" -gt 0 ] && [ -f "$ITER_OUTPUT" ] && [ -s "$ITER_OUTPUT" ]; then
    CONTEXT_FILE="$ITER_DIR/context-eval-${COUNT}.txt"
    python3.12 "$SCRIPTS_DIR/retrieve_context.py" \
        --query "$TASK" \
        --iteration "$COUNT" \
        > "$CONTEXT_FILE" 2>> "$ITER_DIR/debug.log" || true

    EVAL_RESULT=$(python3.12 "$SCRIPTS_DIR/evaluate.py" \
        --iteration "$COUNT" \
        --output-file "$ITER_OUTPUT" \
        --task "$TASK" \
        --context-file "$CONTEXT_FILE" \
        --scores-file "$SCORES_FILE" \
        2>> "$ITER_DIR/debug.log") && EVAL_EXIT=0 || EVAL_EXIT=$?

    echo "$EVAL_RESULT" > "$ITER_DIR/eval-iter-${COUNT}.json" 2>> "$ITER_DIR/debug.log" || true

    # Store eval scores in Chroma for cross-iteration retrieval
    echo "$EVAL_RESULT" | python3.12 - "$SCRIPTS_DIR" "$COUNT" "$TASK" >> "$ITER_DIR/debug.log" 2>&1 <<'PYEOF' || true
import sys, json
sys.path.insert(0, sys.argv[1])
from store_context import store_eval
data = json.load(sys.stdin)
store_eval(int(sys.argv[2]), data.get("scores", {}), sys.argv[3], data.get("eval_method", "unknown"))
PYEOF

    if [ "$EVAL_EXIT" -eq 10 ]; then
        SHOULD_CONTINUE=false
    fi

    # Skip eval/trend feedback if fallback
    IS_FALLBACK=$(echo "$EVAL_RESULT" | jq -r '
        .eval_method == "fallback"
    ' 2>/dev/null) || IS_FALLBACK="false"

    if [ "$IS_FALLBACK" != "true" ]; then
        EVAL_FEEDBACK=$(echo "$EVAL_RESULT" | jq -r '
            "\n## Eval (iter \(.iteration), \(.eval_method // "unknown"))\n" +
            (.scores | to_entries | map(
                "- **\(.key)**: \(.value.score // "n/a") — \(.value.reason // "")"
            ) | join("\n"))
        ' 2>/dev/null) || EVAL_FEEDBACK=""

        TREND_FEEDBACK=$(echo "$EVAL_RESULT" | jq -r '
            if .trends then
                (.trends | to_entries
                    | map(select(.value.direction != "insufficient_data"))
                    | if length > 0 then
                        "\n## Trends\n" +
                        (map("- **\(.key)**: \(.value.direction) (Δ\(.value.avg_delta))") | join("\n"))
                      else "" end)
            else "" end
        ' 2>/dev/null) || TREND_FEEDBACK=""
    fi
fi

# --- Stop ---
if [ "$SHOULD_CONTINUE" = false ]; then
    STOP_REASON=$(echo "$EVAL_RESULT" | jq -r '.stop_reason // "evaluation threshold"' 2>/dev/null) || STOP_REASON="evaluation threshold"
    _final_score=$(echo "$EVAL_RESULT" | jq -r '.scores["Task Completion"].score // 0' 2>/dev/null || echo "0.0")
    _record_end "$STOP_REASON" "$_final_score"
    echo "Iterate: stopped — ${STOP_REASON}" >&2
    rm -f "$COUNTER_FILE" "$TASK_FILE" "$ITER_DIR/session.txt"
    exit 0
fi

# --- Step 3: Retrieve relevant context for next iteration ---
NEXT=$((COUNT + 1))
echo "$NEXT" > "$COUNTER_FILE"

RETRIEVED_CONTEXT=$(python3.12 "$SCRIPTS_DIR/retrieve_context.py" \
    --query "$TASK — what should iteration $NEXT focus on next?" \
    --iteration "$NEXT" \
    --n-results 8 \
    2>> "$ITER_DIR/debug.log") || RETRIEVED_CONTEXT="No previous context available."

# --- Step 4: Return inline via stderr → Claude sees it and keeps working ---
cat >&2 <<EOF
ITERATION ${NEXT}/${MAX_ITERATIONS} — ${TASK}
Working directory: ${ITER_CWD}

${RETRIEVED_CONTEXT}
${EVAL_FEEDBACK}
${TREND_FEEDBACK}

Do NOT repeat prior work. Focus on what's missing or broken. State clearly if complete.
EOF

exit 2

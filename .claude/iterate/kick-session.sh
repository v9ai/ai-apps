#!/bin/bash
set -uo pipefail

# ==============================================================
# Claude Code Stop Hook — Iterate with Chroma + Eval
#
# Exit 0  = done, stop iterating
# Exit 2  = send feedback to Claude via stderr, keep going
# ==============================================================

ITER_DIR="/tmp/claude-iterate"
COUNTER_FILE="$ITER_DIR/counter"
TASK_FILE="$ITER_DIR/task.txt"
SCORES_FILE="$ITER_DIR/scores.json"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- No task file = not iterating ---
if [ ! -f "$TASK_FILE" ]; then
    exit 0
fi

mkdir -p "$ITER_DIR"
TASK=$(cat "$TASK_FILE")
ITER_CWD=$(cat "$ITER_DIR/cwd.txt" 2>/dev/null || echo "")
MAX_ITERATIONS=$(cat "$ITER_DIR/max.txt" 2>/dev/null || echo "10")

export CLAUDE_ITERATE_CHROMA_PATH="$ITER_DIR/chroma"
export CLAUDE_ITERATE_CWD="$ITER_CWD"

# --- Counter ---
if [ ! -f "$COUNTER_FILE" ]; then
    echo "0" > "$COUNTER_FILE"
fi

COUNT=$(cat "$COUNTER_FILE")

# --- Hard limit ---
if [ "$COUNT" -ge "$MAX_ITERATIONS" ]; then
    rm -f "$COUNTER_FILE"
    echo "Iterate: complete — reached $MAX_ITERATIONS iterations." >&2
    exit 0
fi

# --- Read hook input ---
INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Debug log
echo "[kick-session] iter=$COUNT session=$SESSION_ID cwd=$CWD" >> "$ITER_DIR/debug.log" 2>/dev/null || true

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
        2>/dev/null || true
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
        > "$CONTEXT_FILE" 2>/dev/null || true

    EVAL_RESULT=$(python3.12 "$SCRIPTS_DIR/evaluate.py" \
        --iteration "$COUNT" \
        --output-file "$ITER_OUTPUT" \
        --task "$TASK" \
        --context-file "$CONTEXT_FILE" \
        --scores-file "$SCORES_FILE" \
        2>/dev/null) && EVAL_EXIT=0 || EVAL_EXIT=$?

    echo "$EVAL_RESULT" > "$ITER_DIR/eval-iter-${COUNT}.json" 2>/dev/null || true

    if [ "$EVAL_EXIT" -eq 10 ]; then
        SHOULD_CONTINUE=false
    fi

    EVAL_FEEDBACK=$(echo "$EVAL_RESULT" | jq -r '
        "\n## Evaluation of iteration \(.iteration)\n" +
        (.scores | to_entries | map(
            "- **\(.key)**: \(.value.score // "n/a") — \(.value.reason // "")"
        ) | join("\n"))
    ' 2>/dev/null) || EVAL_FEEDBACK=""

    TREND_FEEDBACK=$(echo "$EVAL_RESULT" | jq -r '
        if .trends then
            "\n## Trends\n" +
            (.trends | to_entries | map(
                "- **\(.key)**: \(.value.direction // "n/a") (delta: \(.value.avg_delta // "n/a"), recent: \(.value.values // []))"
            ) | join("\n"))
        else "" end
    ' 2>/dev/null) || TREND_FEEDBACK=""
fi

# --- Stop ---
if [ "$SHOULD_CONTINUE" = false ]; then
    STOP_REASON=$(echo "$EVAL_RESULT" | jq -r '.stop_reason // "evaluation threshold"' 2>/dev/null) || STOP_REASON="evaluation threshold"
    echo "Iterate: stopped — ${STOP_REASON}" >&2
    rm -f "$COUNTER_FILE"
    exit 0
fi

# --- Step 3: Retrieve relevant context for next iteration ---
NEXT=$((COUNT + 1))
echo "$NEXT" > "$COUNTER_FILE"

RETRIEVED_CONTEXT=$(python3.12 "$SCRIPTS_DIR/retrieve_context.py" \
    --query "$TASK — what should iteration $NEXT focus on next?" \
    --iteration "$NEXT" \
    --n-results 8 \
    2>/dev/null) || RETRIEVED_CONTEXT="No previous context available."

# --- Step 4: Return inline via stderr → Claude sees it and keeps working ---
cat >&2 <<EOF
ITERATION ${NEXT} of ${MAX_ITERATIONS}

## Task
${TASK}

## Working directory
${ITER_CWD}
All work must be scoped to this directory.

## Context from previous iterations (semantic retrieval)
${RETRIEVED_CONTEXT}
${EVAL_FEEDBACK}
${TREND_FEEDBACK}

## Instructions for this iteration
- Do NOT repeat work already done (see context above)
- Focus on what's missing, broken, or needs improvement
- Be specific about what you changed
- If the task is fully complete, state it clearly

Continue working.
EOF

exit 2

#!/bin/bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ITERATIONS=10
RESET=false
STATUS=false
HEADLESS=false
WORKTREE_NAME=""
TASK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --iterations)
            if [[ $# -lt 2 ]]; then
                echo "Error: --iterations requires a value" >&2
                exit 1
            fi
            if [[ "$2" =~ ^[1-9][0-9]*$ ]]; then
                ITERATIONS="$2"
            else
                echo "Error: --iterations requires a positive number, got '$2'" >&2
                exit 1
            fi
            shift 2 ;;
        --reset) RESET=true; shift ;;
        --status) STATUS=true; shift ;;
        --headless) HEADLESS=true; shift ;;
        --worktree)
            if [[ $# -lt 2 ]]; then
                echo "Error: --worktree requires a name" >&2
                exit 1
            fi
            WORKTREE_NAME="$2"; shift 2 ;;
        *) TASK="${TASK:+$TASK }$1"; shift ;;
    esac
done

# Compute a unique iterate directory for this session.
# Uses CLAUDE_CODE_SESSION_ID when available; falls back to a hash of the CWD.
# When --worktree is specified (headless parallel runs), the worktree name is
# mixed into the hash so each worker gets its own state.
_iter_dir() {
    local sid="${CLAUDE_CODE_SESSION_ID:-}"
    if [ -n "$sid" ]; then
        echo "/tmp/claude-iterate-${sid:0:12}"
    else
        local base="$(pwd)"
        [ -n "${WORKTREE_NAME:-}" ] && base="${base}:${WORKTREE_NAME}"
        local h
        h=$(printf '%s' "$base" | md5 -q 2>/dev/null \
            || printf '%s' "$base" | md5sum 2>/dev/null | cut -d' ' -f1)
        echo "/tmp/claude-iterate-${h:0:12}"
    fi
}

ITER_DIR=$(_iter_dir)

if [ "$RESET" = true ]; then
    if [ -n "$WORKTREE_NAME" ]; then
        rm -rf "$ITER_DIR" 2>/dev/null || true
        echo "Iterate: state cleared ($ITER_DIR)."
    else
        # Reset all iterate dirs when no specific worktree
        for d in /tmp/claude-iterate-*/; do
            rm -rf "$d" 2>/dev/null || true
        done
        echo "Iterate: all state cleared."
    fi
    exit 0
fi

if [ "$STATUS" = true ]; then
    found=0
    for d in /tmp/claude-iterate-*/; do
        [ -f "$d/task.txt" ] || continue
        found=1
        CURRENT=$(cat "${d}counter" 2>/dev/null || echo "?")
        TOTAL=$(cat "${d}iterations.txt" 2>/dev/null || echo "?")
        TASK_NAME=$(cat "${d}task.txt" 2>/dev/null || echo "?")
        SESSION_OWNER=$(cat "${d}session.txt" 2>/dev/null || echo "unknown")
        echo "[${d%/}]  ${CURRENT}/${TOTAL} — ${TASK_NAME}  (session ${SESSION_OWNER:0:8}…)"
        if [ -f "${d}scores.json" ]; then
            python3.12 - "${d}scores.json" 2>/dev/null <<'PYEOF' || true
import json, sys
scores = json.load(open(sys.argv[1]))
for i, s in enumerate(scores):
    tc = s.get('Task Completion', {}).get('score', '?')
    pr = s.get('Incremental Progress', {}).get('score', '?')
    print(f'  iter {i+1}: completion={tc} progress={pr}')
PYEOF
        fi
    done
    [ "$found" -eq 0 ] && echo "Iterate: no active sessions"
    exit 0
fi

if [ -z "$TASK" ]; then
    echo "Usage: /iterate 5 Your task description"
    echo "       /iterate status"
    echo "       /iterate reset"
    echo ""
    echo "Headless (outside Claude):"
    echo "  bash .claude/iterate/start.sh --headless --iterations 10 Your task"
    echo "  bash .claude/iterate/start.sh --headless --worktree w1 --iterations 10 Your task"
    exit 1
fi

python3.12 -c "import chromadb" 2>/dev/null || {
    echo "Installing chromadb…"
    python3.12 -m pip install chromadb -q || true
}
python3.12 -c "import fastembed" 2>/dev/null || {
    echo "Installing fastembed (optional, will fall back to chroma default)…"
    python3.12 -m pip install fastembed -q || true
}

# Pre-warm fastembed model so the first Stop hook doesn't timeout downloading it.
echo "Pre-warming embedding model…"
python3.12 -c "
import sys
sys.path.insert(0, '${SCRIPTS_DIR}')
from embeddings import get_embedding_function
ef = get_embedding_function()
if ef:
    ef.embed_documents(['warmup'])
    print('Embedding model ready')
else:
    print('Using ChromaDB default embeddings')
" 2>/dev/null || true

rm -rf "$ITER_DIR" 2>/dev/null || true
mkdir -p "$ITER_DIR"

echo "0" > "$ITER_DIR/counter"
echo "$ITERATIONS" > "$ITER_DIR/iterations.txt"
echo "$TASK" > "$ITER_DIR/task.txt"
echo "[]" > "$ITER_DIR/scores.json"
pwd > "$ITER_DIR/cwd.txt"
echo "${CLAUDE_CODE_SESSION_ID:-}" > "$ITER_DIR/session.txt"

# --- Show similar past tasks ---
python3.12 -c "
import sys
sys.path.insert(0, '${SCRIPTS_DIR}')
from task_history import find_similar, format_similar
fmt = format_similar(find_similar(sys.argv[1], n=3))
if fmt:
    print(fmt)
" "$TASK" 2>/dev/null || true

# --- Record task start in history ---
python3.12 "${SCRIPTS_DIR}/task_history.py" start \
    --task "$TASK" \
    --session "${CLAUDE_CODE_SESSION_ID:-headless-$$}" \
    --cwd "$(pwd)" 2>/dev/null || true

echo "Iterate: starting iteration 1/$ITERATIONS — $TASK"
echo "Monitor: cat ${ITER_DIR}/eval-iter-*.json | jq '.scores'"
echo "Abort:   /iterate reset"

# --- Headless mode: launch claude -p with crash-recovery loop ---
# The Stop hook (kick-session.sh) handles iteration counting, eval, and context.
# This outer loop only re-enters if claude crashes/disconnects.
if [ "$HEADLESS" = true ]; then
    WORKTREE_ARGS=()
    [ -n "$WORKTREE_NAME" ] && WORKTREE_ARGS=(--worktree "$WORKTREE_NAME")

    while [ -f "$ITER_DIR/task.txt" ]; do
        COUNT=$(cat "$ITER_DIR/counter" 2>/dev/null || echo "0")
        echo "--- $(date +%H:%M:%S) --- claude session (iter $COUNT/$ITERATIONS) ---"

        CLAUDE_ITERATE_DIR="$ITER_DIR" \
        CLAUDE_ITERATE_CWD="$(pwd)" \
        claude -p "Task: $TASK

Work on this task iteratively. The Stop hook evaluates each response and
provides context for the next iteration. Keep working until the eval confirms
completion. Scope work to the current directory. Commit after meaningful changes." \
            "${WORKTREE_ARGS[@]}" \
            --dangerously-skip-permissions \
            2>&1 || true

        sleep 2
    done

    echo "=== Headless iterate complete ==="
    "$0" --status 2>/dev/null || true
fi

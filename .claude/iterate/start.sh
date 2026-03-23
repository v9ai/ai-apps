#!/bin/bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ITERATIONS=10
RESET=false
STATUS=false
TASK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --iterations)
            if [[ "$2" =~ ^[0-9]+$ ]]; then
                ITERATIONS="$2"
            else
                echo "Error: --iterations requires a number, got '$2'" >&2
                exit 1
            fi
            shift 2 ;;
        --reset) RESET=true; shift ;;
        --status) STATUS=true; shift ;;
        *) TASK="$1"; shift ;;
    esac
done

# Compute a unique iterate directory for this session.
# Uses CLAUDE_CODE_SESSION_ID when available; falls back to a hash of the CWD
# so two terminals in different projects never share state.
_iter_dir() {
    local sid="${CLAUDE_CODE_SESSION_ID:-}"
    if [ -n "$sid" ]; then
        echo "/tmp/claude-iterate-${sid:0:12}"
    else
        local h
        h=$(printf '%s' "$(pwd)" | md5 -q 2>/dev/null \
            || printf '%s' "$(pwd)" | md5sum 2>/dev/null | cut -c1-12)
        echo "/tmp/claude-iterate-${h}"
    fi
}

ITER_DIR=$(_iter_dir)

if [ "$RESET" = true ]; then
    rm -rf "$ITER_DIR" 2>/dev/null || true
    echo "Iterate: state cleared ($ITER_DIR)."
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
    exit 1
fi

python3.12 -c "import chromadb" 2>/dev/null || {
    echo "Installing chromadb…"
    python3.12 -m pip install chromadb -q || true
}
python3.12 -c "import deepeval" 2>/dev/null || {
    echo "Installing deepeval…"
    python3.12 -m pip install deepeval -q || true
}
python3.12 -c "import fastembed" 2>/dev/null || {
    echo "Installing fastembed (optional, will fall back to chroma default)…"
    python3.12 -m pip install fastembed -q || true
}

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
    --session "${CLAUDE_CODE_SESSION_ID:-none}" \
    --cwd "$(pwd)" 2>/dev/null || true

echo "Iterate: starting iteration 1/$ITERATIONS — $TASK"
echo "Monitor: cat ${ITER_DIR}/eval-iter-*.json | jq '.scores'"
echo "Abort:   /iterate reset"

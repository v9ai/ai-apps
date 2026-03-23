#!/bin/bash
set -euo pipefail

ITER_DIR="/tmp/claude-iterate"
MAX_ITERATIONS=10
RESET=false
STATUS=false
TASK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --max) MAX_ITERATIONS="$2"; shift 2 ;;
        --reset) RESET=true; shift ;;
        --status) STATUS=true; shift ;;
        *) TASK="$1"; shift ;;
    esac
done

if [ "$RESET" = true ]; then
    rm -r "$ITER_DIR" 2>/dev/null || true
    echo "Iterate: state cleared."
    exit 0
fi

if [ "$STATUS" = true ]; then
    if [ ! -f "$ITER_DIR/task.txt" ]; then
        echo "Iterate: not active"
        exit 0
    fi
    CURRENT=$(cat "$ITER_DIR/counter" 2>/dev/null || echo "?")
    MAX=$(cat "$ITER_DIR/max.txt" 2>/dev/null || echo "?")
    TASK_NAME=$(cat "$ITER_DIR/task.txt" 2>/dev/null || echo "?")
    SESSION_OWNER=$(cat "$ITER_DIR/session.txt" 2>/dev/null || echo "unknown")
    echo "Iterate: ${CURRENT}/${MAX} — ${TASK_NAME}"
    echo "Session: ${SESSION_OWNER:0:8}…"
    if [ -f "$ITER_DIR/scores.json" ]; then
        python3.12 - "$ITER_DIR/scores.json" "$ITER_DIR/chroma" 2>/dev/null <<'PYEOF' || true
import json, sys
scores = json.load(open(sys.argv[1]))
for i, s in enumerate(scores):
    tc = s.get('Task Completion', {}).get('score', '?')
    pr = s.get('Incremental Progress', {}).get('score', '?')
    em = s.get('eval_method', '?') if isinstance(s, dict) and 'eval_method' in s else '?'
    print(f'  iter {i+1}: completion={tc} progress={pr}')
try:
    import chromadb
    c = chromadb.PersistentClient(path=sys.argv[2])
    col = c.get_or_create_collection("iterate_context")
    print(f"Chroma: {col.count()} docs")
except Exception:
    pass
PYEOF
    fi
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
    python3.12 -m pip install chromadb -q
}
python3.12 -c "import deepeval" 2>/dev/null || {
    echo "Installing deepeval…"
    python3.12 -m pip install deepeval -q
}

rm -r "$ITER_DIR" 2>/dev/null || true
mkdir -p "$ITER_DIR"

echo "0" > "$ITER_DIR/counter"
echo "$MAX_ITERATIONS" > "$ITER_DIR/max.txt"
echo "$TASK" > "$ITER_DIR/task.txt"
echo "[]" > "$ITER_DIR/scores.json"
pwd > "$ITER_DIR/cwd.txt"
echo "${CLAUDE_CODE_SESSION_ID:-}" > "$ITER_DIR/session.txt"

echo "Iterate: initialized — $TASK (max $MAX_ITERATIONS)"
echo "Monitor: cat /tmp/claude-iterate/eval-iter-*.json | jq '.scores'"
echo "Abort:   /iterate reset"

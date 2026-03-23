#!/bin/bash
set -euo pipefail

ITER_DIR="/tmp/claude-iterate"
MAX_ITERATIONS=10
RESET=false
TASK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --max) MAX_ITERATIONS="$2"; shift 2 ;;
        --reset) RESET=true; shift ;;
        *) TASK="$1"; shift ;;
    esac
done

if [ "$RESET" = true ]; then
    rm -r "$ITER_DIR" 2>/dev/null || true
    echo "Iterate: state cleared."
    exit 0
fi

if [ -z "$TASK" ]; then
    echo "Usage: ./start.sh \"Your task description\""
    echo "       ./start.sh --max 5 \"Your task\""
    echo "       ./start.sh --reset"
    exit 1
fi

python3.12 -c "import chromadb" 2>/dev/null || python3.12 -m pip install chromadb -q

rm -r "$ITER_DIR" 2>/dev/null || true
mkdir -p "$ITER_DIR"

echo "0" > "$ITER_DIR/counter"
echo "$MAX_ITERATIONS" > "$ITER_DIR/max.txt"
echo "$TASK" > "$ITER_DIR/task.txt"
echo "[]" > "$ITER_DIR/scores.json"
pwd > "$ITER_DIR/cwd.txt"

echo "Iterate: initialized — $TASK (max $MAX_ITERATIONS iterations)"
echo "Now run your first Claude Code prompt. The Stop hook handles the rest."
echo ""
echo "Monitor: cat /tmp/claude-iterate/eval-iter-*.json | jq '.scores'"
echo "Abort:   ./start.sh --reset"

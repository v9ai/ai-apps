#!/bin/bash
set -euo pipefail

LOOP_DIR="/tmp/claude-loop"
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
    rm -rf "$LOOP_DIR"
    echo "Loop state cleared."
    exit 0
fi

if [ -z "$TASK" ]; then
    echo "Usage: ./start-loop.sh \"Your task description\""
    echo "       ./start-loop.sh --max 5 \"Your task\""
    echo "       ./start-loop.sh --reset"
    exit 1
fi

python3.12 -c "import chromadb" 2>/dev/null || python3.12 -m pip install chromadb -q
python3.12 -c "import deepeval" 2>/dev/null || python3.12 -m pip install deepeval -q

rm -rf "$LOOP_DIR"
mkdir -p "$LOOP_DIR"

echo "0" > "$LOOP_DIR/counter"
echo "$TASK" > "$LOOP_DIR/task.txt"
echo "[]" > "$LOOP_DIR/scores.json"
pwd > "$LOOP_DIR/cwd.txt"
export CLAUDE_LOOP_MAX="$MAX_ITERATIONS"

echo "Loop initialized: $TASK (max $MAX_ITERATIONS iterations)"
echo "Now run your first Claude Code prompt. The Stop hook handles the rest."
echo ""
echo "Monitor: cat /tmp/claude-loop/eval-iter-*.json | jq '.scores'"
echo "Abort:   ./start-loop.sh --reset"

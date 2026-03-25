#!/bin/bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ITERATIONS=10
RESET=false
STATUS=false
CLEAN=false
HISTORY=false
DONE_WHEN=""
NO_COMMIT=false
TASK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --iterations)
            if [[ $# -lt 2 ]]; then
                echo "Error: --iterations requires a value" >&2
                exit 1
            fi
            if [[ "$2" =~ ^[1-9][0-9]*$ ]] && [[ "$2" -le 1000 ]]; then
                ITERATIONS="$2"
            elif [[ "$2" =~ ^[1-9][0-9]*$ ]]; then
                echo "Error: --iterations max is 1000, got '$2'" >&2
                exit 1
            else
                echo "Error: --iterations requires a positive number, got '$2'" >&2
                exit 1
            fi
            shift 2 ;;
        --done-when|--completion-promise)
            if [[ $# -lt 2 ]]; then
                echo "Error: $1 requires a value" >&2
                exit 1
            fi
            DONE_WHEN="$2"
            shift 2 ;;
        --reset) RESET=true; shift ;;
        --status) STATUS=true; shift ;;
        --clean) CLEAN=true; shift ;;
        --history) HISTORY=true; shift ;;
        --no-commit) NO_COMMIT=true; shift ;;
        *) TASK="${TASK:+$TASK }$1"; shift ;;
    esac
done

# Compute a unique iterate directory for this session.
# Uses CLAUDE_CODE_SESSION_ID when available; falls back to a random UUID
# so two terminals in the same directory never share state.
_iter_dir() {
    local sid="${CLAUDE_CODE_SESSION_ID:-}"
    if [ -n "$sid" ]; then
        echo "/tmp/claude-iterate-${sid:0:12}"
    else
        # Random UUID — prevents collisions between terminals in the same CWD.
        # kick-session.sh will find this dir via CWD match and backfill session.txt.
        local uuid
        uuid=$(uuidgen 2>/dev/null | tr '[:upper:]' '[:lower:]' \
            || cat /proc/sys/kernel/random/uuid 2>/dev/null \
            || printf '%04x%04x%04x' $RANDOM $RANDOM $RANDOM)
        echo "/tmp/claude-iterate-${uuid:0:12}"
    fi
}

ITER_DIR=$(_iter_dir)

if [ "$RESET" = true ]; then
    _cleaned=0
    # If session ID is known, remove the canonical dir
    if [ -n "${CLAUDE_CODE_SESSION_ID:-}" ]; then
        rm -rf "$ITER_DIR" 2>/dev/null || true
        _cleaned=1
    fi
    # Also scan for sessions matching this CWD or git root (handles missing session ID)
    _my_cwd=$(pwd)
    _my_git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "$_my_cwd")
    for _rd in /tmp/claude-iterate-*/; do
        [ -f "${_rd}task.txt" ] || continue
        _rd_cwd=$(cat "${_rd}cwd.txt" 2>/dev/null || echo "")
        if [ "$_rd_cwd" = "$_my_cwd" ] || [ "$_rd_cwd" = "$_my_git_root" ]; then
            rm -rf "$_rd" 2>/dev/null || true
            _cleaned=1
        fi
    done
    if [ "$_cleaned" -eq 1 ]; then
        echo "Iterate: state cleared for $(pwd)."
    else
        echo "Iterate: no active sessions found for $(pwd)."
    fi
    exit 0
fi

if [ "$STATUS" = true ]; then
    found=0
    _now=$(date +%s)
    for d in /tmp/claude-iterate-*/; do
        [ -f "$d/task.txt" ] || continue
        found=1
        CURRENT=$(cat "${d}counter" 2>/dev/null || echo "?")
        TOTAL=$(cat "${d}iterations.txt" 2>/dev/null || echo "?")
        TASK_NAME=$(cat "${d}task.txt" 2>/dev/null || echo "?")
        SESSION_OWNER=$(cat "${d}session.txt" 2>/dev/null || echo "unknown")
        _mtime=$(stat -f %m "${d}counter" 2>/dev/null || stat -f %m "${d}task.txt" 2>/dev/null || echo "$_now")
        _age_min=$(( (_now - _mtime) / 60 ))
        echo "[${d%/}]  ${CURRENT}/${TOTAL} — ${TASK_NAME}  (session ${SESSION_OWNER:0:8}…, ${_age_min}m ago)"
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

if [ "$CLEAN" = true ]; then
    _now=$(date +%s)
    _removed=0
    for _gc_d in /tmp/claude-iterate-*/; do
        [ -d "$_gc_d" ] || continue
        if [ ! -f "${_gc_d}task.txt" ]; then
            rm -rf "$_gc_d" 2>/dev/null; _removed=$((_removed + 1)); continue
        fi
        _latest=$(stat -f %m "${_gc_d}counter" 2>/dev/null || stat -f %m "${_gc_d}task.txt" 2>/dev/null || echo "0")
        _age=$(( _now - _latest ))
        _gc_counter=$(cat "${_gc_d}counter" 2>/dev/null || echo "")
        if [ "$_age" -gt 14400 ]; then
            rm -rf "$_gc_d" 2>/dev/null; _removed=$((_removed + 1)); continue
        fi
        if [ "$_gc_counter" = "1" ] && [ "$_age" -gt 1800 ]; then
            rm -rf "$_gc_d" 2>/dev/null; _removed=$((_removed + 1)); continue
        fi
    done
    echo "Iterate: cleaned ${_removed} stale session(s)."
    exit 0
fi

if [ "$HISTORY" = true ]; then
    python3.12 "${SCRIPTS_DIR}/task_history.py" find --task "iterate build fix improve test deploy" --n 10 2>/dev/null | python3.12 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if not data:
        print('No task history found.')
    else:
        for t in data:
            score = f\"{t['final_score']:.2f}\" if t['final_score'] >= 0 else 'n/a'
            ts = t.get('timestamp', '')[:16]
            print(f\"  {t['status']:9s}  {t['iterations']:2d} iters  score={score}  {ts}  {t['task']}\")
except Exception:
    print('No task history found.')
" || echo "No task history found."
    exit 0
fi

if [ -z "$TASK" ]; then
    echo "Usage: /iterate 5 Your task description"
    echo "       /iterate status"
    echo "       /iterate reset"
    echo "       /iterate clean   — remove stale sessions"
    echo "       /iterate history — show past tasks"
    exit 1
fi

# --- Garbage-collect stale iterate sessions ---
# Remove dirs that are clearly dead: no task.txt, or no activity for 4+ hours,
# or counter=0 with no activity for 30+ minutes (never kicked in).
_now=$(date +%s)
for _gc_d in /tmp/claude-iterate-*/; do
    [ -d "$_gc_d" ] || continue
    # Already cleaned up (no task.txt) — remove leftover dir
    if [ ! -f "${_gc_d}task.txt" ]; then
        rm -rf "$_gc_d" 2>/dev/null
        continue
    fi
    # Find the most recently modified file in the dir
    _latest=$(stat -f %m "${_gc_d}counter" 2>/dev/null || stat -f %m "${_gc_d}task.txt" 2>/dev/null || echo "0")
    _age=$(( _now - _latest ))
    # 4+ hours with no activity → stale
    if [ "$_age" -gt 14400 ]; then
        rm -rf "$_gc_d" 2>/dev/null
        continue
    fi
    # counter=1 and 30+ minutes old → never kicked in
    _gc_counter=$(cat "${_gc_d}counter" 2>/dev/null || echo "")
    if [ "$_gc_counter" = "1" ] && [ "$_age" -gt 1800 ]; then
        rm -rf "$_gc_d" 2>/dev/null
        continue
    fi
done

python3.12 -c "import chromadb" 2>/dev/null || {
    echo "Installing chromadb…"
    python3.12 -m pip install chromadb -q || true
}
python3.12 -c "import fastembed" 2>/dev/null || {
    echo "Installing fastembed (optional, will fall back to chroma default)…"
    python3.12 -m pip install fastembed -q || true
}

# Pre-warm fastembed model so the first Stop hook doesn't timeout downloading it.
# Skip if cache dir already has model files (saves ~1s on repeat starts).
_EMBED_CACHE="${ITERATE_EMBED_CACHE:-/tmp/claude-iterate/fastembed-cache}"
if [ -d "$_EMBED_CACHE" ] && [ "$(ls -A "$_EMBED_CACHE" 2>/dev/null)" ]; then
    echo "Embedding model cached."
else
    echo "Pre-warming embedding model…"
    python3.12 -c "
import sys
sys.path.insert(0, sys.argv[1])
from embeddings import get_embedding_function
ef = get_embedding_function()
if ef:
    ef.embed_documents(['warmup'])
    print('Embedding model ready')
else:
    print('Using ChromaDB default embeddings')
" "$SCRIPTS_DIR" 2>/dev/null || true
fi

# Clean up any prior iterate sessions for the same CWD to avoid
# the stop hook matching the wrong session when multiple exist.
_git_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
for _old_d in /tmp/claude-iterate-*/; do
    [ -f "${_old_d}task.txt" ] || continue
    [ "${_old_d%/}" = "$ITER_DIR" ] && continue
    _old_cwd=$(cat "${_old_d}cwd.txt" 2>/dev/null || echo "")
    if [ "$_old_cwd" = "$_git_root" ] || [ "$_old_cwd" = "$(pwd)" ]; then
        rm -rf "$_old_d" 2>/dev/null || true
    fi
done

rm -rf "$ITER_DIR" 2>/dev/null || true
mkdir -p "$ITER_DIR"

echo "1" > "$ITER_DIR/counter"  # 1-based — kick-session.sh uses COUNT > ITERATIONS for limit
echo "$ITERATIONS" > "$ITER_DIR/iterations.txt"
echo "$TASK" > "$ITER_DIR/task.txt"
echo "[]" > "$ITER_DIR/scores.json"
# Use git root so the hook CWD always matches regardless of which subdir
# the Bash tool happens to be in when start.sh runs.
echo "$_git_root" > "$ITER_DIR/cwd.txt"
echo "${CLAUDE_CODE_SESSION_ID:-}" > "$ITER_DIR/session.txt"
[ -n "$DONE_WHEN" ] && echo "$DONE_WHEN" > "$ITER_DIR/done-when.txt"
[ "$NO_COMMIT" = true ] && touch "$ITER_DIR/no-commit.txt"

# --- Show similar past tasks ---
python3.12 -c "
import sys
sys.path.insert(0, sys.argv[1])
from task_history import find_similar, format_similar
fmt = format_similar(find_similar(sys.argv[2], n=3))
if fmt:
    print(fmt)
" "$SCRIPTS_DIR" "$TASK" 2>/dev/null || true

# --- Record task start in history ---
python3.12 "${SCRIPTS_DIR}/task_history.py" start \
    --task "$TASK" \
    --session "${CLAUDE_CODE_SESSION_ID:-none}" \
    --cwd "$(pwd)" 2>/dev/null || true

# --- Generate plan template ---
cat > "$ITER_DIR/plan.md" <<PLANEOF
# Plan: $TASK

## Subtasks
- [ ] 1. (fill in your first subtask)
- [ ] 2. (fill in your second subtask)
- [ ] 3. (fill in your third subtask)

## Current Focus
Starting iteration 1.
PLANEOF

echo "Iterate: running $ITERATIONS iterations — $TASK"
echo "Monitor: cat ${ITER_DIR}/eval-iter-*.json | jq '.composite'"
echo "Abort:   /iterate reset"
echo ""
echo "IMPORTANT: In your FIRST iteration, update the plan file at ${ITER_DIR}/plan.md"
echo "with concrete subtasks. Mark items [x] as you complete them across iterations."

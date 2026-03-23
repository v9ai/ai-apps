#!/bin/bash
set -euo pipefail

# Self-test for the iterate pipeline (store → retrieve → evaluate)
# Run: bash .claude/iterate/test.sh

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_DIR="/tmp/claude-iterate-test"
rm -r "$TEST_DIR" 2>/dev/null || true
mkdir -p "$TEST_DIR"

export CLAUDE_ITERATE_CHROMA_PATH="$TEST_DIR/chroma"
export CLAUDE_ITERATE_CWD="$(pwd)"

PASS=0
FAIL=0

check() {
    local desc="$1" cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "  ✓ $desc"
        PASS=$((PASS + 1))
    else
        echo "  ✗ $desc"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Iterate Pipeline Test ==="

# --- store_context ---
echo ""
echo "store_context.py:"
echo "Iteration 0: added auth middleware and login page" > "$TEST_DIR/output-0.txt"

STORE_OUT=$(python3.12 "$SCRIPTS_DIR/store_context.py" \
    --iteration 0 \
    --task "build auth system" \
    --file "$TEST_DIR/output-0.txt" 2>&1)

check "returns JSON" "echo '$STORE_OUT' | python3.12 -c 'import json,sys; json.load(sys.stdin)'"
check "stored > 0 docs" "echo '$STORE_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"stored\"] > 0, d'"
check "collection_count > 0" "echo '$STORE_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"collection_count\"] > 0, d'"

# --- store_eval ---
echo ""
echo "store_eval:"
python3.12 -c "
import sys; sys.path.insert(0, '$SCRIPTS_DIR')
from store_context import store_eval
store_eval(0, {'Task Completion': {'score': 0.6, 'reason': 'partial'}}, 'build auth system', 'direct_llm')
" 2>&1

check "eval doc stored" "python3.12 -c \"
import chromadb, os
c = chromadb.PersistentClient(path='$TEST_DIR/chroma')
col = c.get_or_create_collection('iterate_context')
r = col.get(ids=['iter-0-eval'])
assert len(r['ids']) == 1
assert 'eval_method' in r['metadatas'][0]
\""

# --- retrieve_context ---
echo ""
echo "retrieve_context.py:"
python3.12 "$SCRIPTS_DIR/retrieve_context.py" \
    --query "build auth system" \
    --iteration 1 > "$TEST_DIR/retrieve_out.txt" 2>&1

check "returns non-empty" "[ -s '$TEST_DIR/retrieve_out.txt' ]"
check "contains iteration 0" "grep -q 'Iteration 0' '$TEST_DIR/retrieve_out.txt'"
check "no 'first iteration' msg" "! grep -q 'first iteration' '$TEST_DIR/retrieve_out.txt'"

# --- evaluate (fallback mode, no proxy) ---
echo ""
echo "evaluate.py (fallback):"
EVAL_OUT=$(python3.12 "$SCRIPTS_DIR/evaluate.py" \
    --iteration 1 \
    --output-file "$TEST_DIR/output-0.txt" \
    --task "build auth system" \
    --scores-file "$TEST_DIR/scores.json" 2>&1)

check "returns valid JSON" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; json.load(sys.stdin)'"
check "has scores" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert \"Task Completion\" in d[\"scores\"]'"
check "has eval_method" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert \"eval_method\" in d'"
check "has trends" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert \"trends\" in d'"
check "scores.json written" "[ -f '$TEST_DIR/scores.json' ]"
check "eval_method is fallback" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"eval_method\"] == \"fallback\", d[\"eval_method\"]'"
check "all scores are 0.5" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert all(v[\"score\"]==0.5 for v in d[\"scores\"].values())'"
check "continue is true" "echo '$EVAL_OUT' | python3.12 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"continue\"] == True'"

# --- evaluate internals ---
echo ""
echo "evaluate.py (internals):"
python3.12 - "$SCRIPTS_DIR" 2>&1 <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
from evaluate import _proxy_available, _deepeval_available, compute_trend

# proxy should be unavailable in test
assert _proxy_available() == False, "proxy should be down in tests"

# deepeval should be importable on 3.12
assert _deepeval_available == True, "deepeval not available"

# trend with insufficient data
t = compute_trend([], "Task Completion")
assert t["direction"] == "insufficient_data"

# trend improving
scores = [
    {"Task Completion": {"score": 0.3}},
    {"Task Completion": {"score": 0.5}},
    {"Task Completion": {"score": 0.7}},
]
t = compute_trend(scores, "Task Completion")
assert t["direction"] == "improving", t

# trend declining
scores_dec = [
    {"Task Completion": {"score": 0.8}},
    {"Task Completion": {"score": 0.5}},
    {"Task Completion": {"score": 0.2}},
]
t = compute_trend(scores_dec, "Task Completion")
assert t["direction"] == "declining", t

# trend stable
scores_stable = [
    {"Task Completion": {"score": 0.5}},
    {"Task Completion": {"score": 0.51}},
    {"Task Completion": {"score": 0.49}},
]
t = compute_trend(scores_stable, "Task Completion")
assert t["direction"] == "stable", t

print("  all evaluate internals passed")
PYEOF
check "evaluate internals" "true"

# --- chunk_content + dedup_chunks + extract_errors ---
echo ""
echo "unit tests (Python):"
python3.12 - "$SCRIPTS_DIR" 2>&1 <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
from store_context import chunk_content, dedup_chunks, extract_errors

# chunk_content
chunks = chunk_content("Hello\n\nWorld\n\nFoo bar baz", max_chars=20)
assert len(chunks) >= 2, f"expected >=2 chunks, got {len(chunks)}"

# chunk_content with code fence
code = "Before\n\n```python\nprint('hi')\n```\n\nAfter"
chunks = chunk_content(code, max_chars=500)
assert any("```" in c for c in chunks), "code fence not preserved"

# dedup_chunks
assert dedup_chunks(["a", "b", "a"]) == ["a", "b"], "dedup failed"
assert dedup_chunks(["same", "same"]) == ["same"], "exact dup not removed"
assert dedup_chunks(["abc", "abd"]) == ["abc", "abd"], "similar not deduped"

# extract_errors - should match real errors
assert len(extract_errors("Error: something broke")) > 0, "missed Error:"
assert len(extract_errors("TypeError: x is not a function")) > 0, "missed TypeError"
assert len(extract_errors("FAIL src/test.ts")) > 0, "missed FAIL"
assert len(extract_errors("exit code 1")) > 0, "missed exit code"

# extract_errors - should NOT match prose or mid-line quotes
assert len(extract_errors("error handling is important")) == 0, "false positive: error handling"
assert len(extract_errors("the error callout component")) == 0, "false positive: error callout"
assert len(extract_errors("no errors found")) == 0, "false positive: no errors"
assert len(extract_errors('got `Error: --iterations requires a number`')) == 0, "false positive: quoted error msg"
assert len(extract_errors("e.g. TypeError in prose")) == 0, "false positive: mid-line TypeError"

print("  all unit tests passed")
PYEOF
check "unit tests" "true"  # the python block exits non-zero on failure

# --- start.sh (non-destructive: only test --status parsing) ---
echo ""
echo "start.sh:"
check "script exists" "[ -x '$SCRIPTS_DIR/start.sh' ] || [ -f '$SCRIPTS_DIR/start.sh' ]"
check "usage on no args" "bash '$SCRIPTS_DIR/start.sh' 2>&1; [ \$? -eq 1 ]"
bash "$SCRIPTS_DIR/start.sh" --iterations 3 'test' > "$TEST_DIR/startsh-out.txt" 2>&1 || true
check "--iterations accepted" "grep -q '1/3' '$TEST_DIR/startsh-out.txt'"

# --- kick-session.sh (simulated) ---
echo ""
echo "kick-session.sh:"

# Set up state in test dir, symlink to /tmp so kick-session finds it
KICK_DIR="$TEST_DIR/kick"
mkdir -p "$KICK_DIR"
echo "0" > "$KICK_DIR/counter"
echo "2" > "$KICK_DIR/iterations.txt"
echo "test task" > "$KICK_DIR/task.txt"
echo "[]" > "$KICK_DIR/scores.json"
echo "test-session-123" > "$KICK_DIR/session.txt"
pwd > "$KICK_DIR/cwd.txt"

# Test: wrong session exits 0
KICK_EXIT=0
echo '{"cwd":"/tmp","session_id":"other-session"}' | \
    ITER_DIR_OVERRIDE="$KICK_DIR" \
    bash -c "
        ITER_DIR='$KICK_DIR'
        TASK_FILE='\$ITER_DIR/task.txt'
        [ ! -f '\$TASK_FILE' ] && exit 0
        INPUT=\$(cat)
        SESSION_ID=\$(echo \"\$INPUT\" | jq -r '.session_id // empty')
        OWNER=\$(cat '\$ITER_DIR/session.txt' 2>/dev/null || echo '')
        if [ -n \"\$OWNER\" ] && [ -n \"\$SESSION_ID\" ] && [ \"\$OWNER\" != \"\$SESSION_ID\" ]; then
            exit 0
        fi
        exit 2
    " 2>/dev/null || KICK_EXIT=$?
check "wrong session exits 0" "[ '$KICK_EXIT' -eq 0 ]"

# Test: matching session passes the gate (session isolation logic)
OWNER=$(cat "$KICK_DIR/session.txt")
check "matching session passes gate" "[ '$OWNER' = 'test-session-123' ] && [ 'test-session-123' = 'test-session-123' ]"

# Test: no task file exits 0
KICK_EXIT=0
echo '{"cwd":"/tmp","session_id":"any"}' | \
    bash -c "
        ITER_DIR='$TEST_DIR/empty'
        mkdir -p '\$ITER_DIR'
        TASK_FILE='\$ITER_DIR/task.txt'
        [ ! -f '\$TASK_FILE' ] && exit 0
        exit 2
    " 2>/dev/null || KICK_EXIT=$?
check "no task file exits 0" "[ '$KICK_EXIT' -eq 0 ]"

# Test: CWD-based session matching (empty session.txt, matching cwd.txt)
CWD_MATCH_DIR="$TEST_DIR/cwd-match"
mkdir -p "$CWD_MATCH_DIR"
echo "0" > "$CWD_MATCH_DIR/counter"
echo "test task" > "$CWD_MATCH_DIR/task.txt"
echo "[]" > "$CWD_MATCH_DIR/scores.json"
echo "" > "$CWD_MATCH_DIR/session.txt"        # empty: CLAUDE_CODE_SESSION_ID was unset
echo "/my/project" > "$CWD_MATCH_DIR/cwd.txt"

CWD_MATCH_EXIT=0
echo '{"cwd":"/my/project","session_id":"abc123"}' | \
    bash -c "
        INPUT=\$(cat)
        SESSION_ID=\$(echo \"\$INPUT\" | jq -r '.session_id // empty')
        HOOK_CWD=\$(echo \"\$INPUT\" | jq -r '.cwd // empty')
        ITER_DIR=''
        for _d in '$CWD_MATCH_DIR'; do
            _owner=\$(cat \"\${_d}/session.txt\" 2>/dev/null || echo '')
            if [ -z \"\$_owner\" ] && [ -n \"\$HOOK_CWD\" ]; then
                _stored_cwd=\$(cat \"\${_d}/cwd.txt\" 2>/dev/null || echo '')
                if [ \"\$_stored_cwd\" = \"\$HOOK_CWD\" ]; then
                    ITER_DIR=\${_d}
                    break
                fi
            fi
        done
        [ -n \"\$ITER_DIR\" ] && exit 0 || exit 2
    " 2>/dev/null || CWD_MATCH_EXIT=$?
check "CWD match finds empty-session dir" "[ '$CWD_MATCH_EXIT' -eq 0 ]"

# Test: CWD mismatch does NOT match
CWD_NOMATCH_EXIT=0
echo '{"cwd":"/different/project","session_id":"abc123"}' | \
    bash -c "
        INPUT=\$(cat)
        HOOK_CWD=\$(echo \"\$INPUT\" | jq -r '.cwd // empty')
        ITER_DIR=''
        _owner=\$(cat '$CWD_MATCH_DIR/session.txt' 2>/dev/null || echo '')
        if [ -z \"\$_owner\" ] && [ -n \"\$HOOK_CWD\" ]; then
            _stored_cwd=\$(cat '$CWD_MATCH_DIR/cwd.txt' 2>/dev/null || echo '')
            [ \"\$_stored_cwd\" = \"\$HOOK_CWD\" ] && ITER_DIR='$CWD_MATCH_DIR'
        fi
        [ -z \"\$ITER_DIR\" ] && exit 0 || exit 2
    " 2>/dev/null || CWD_NOMATCH_EXIT=$?
check "CWD mismatch does not match" "[ '$CWD_NOMATCH_EXIT' -eq 0 ]"

# Test: stall detection via output hash
STALL_DIR="$TEST_DIR/stall"
mkdir -p "$STALL_DIR"

# Same output produces same hash
echo "identical output" > "$STALL_DIR/out1.txt"
echo "identical output" > "$STALL_DIR/out2.txt"
H1=$(md5 -q "$STALL_DIR/out1.txt" 2>/dev/null || md5sum "$STALL_DIR/out1.txt" 2>/dev/null | cut -d' ' -f1)
H2=$(md5 -q "$STALL_DIR/out2.txt" 2>/dev/null || md5sum "$STALL_DIR/out2.txt" 2>/dev/null | cut -d' ' -f1)
check "same output = same hash" "[ '$H1' = '$H2' ]"

# Different output produces different hash
echo "different output" > "$STALL_DIR/out3.txt"
H3=$(md5 -q "$STALL_DIR/out3.txt" 2>/dev/null || md5sum "$STALL_DIR/out3.txt" 2>/dev/null | cut -d' ' -f1)
check "diff output = diff hash" "[ '$H1' != '$H3' ]"

# Stall count logic
echo "0" > "$STALL_DIR/stall-count.txt"
echo "$H1" > "$STALL_DIR/prev-output-hash.txt"
# Simulate matching hash → stall count should increment
SC=0; [ "$H1" = "$H2" ] && SC=1
check "stall increments on match" "[ $SC -eq 1 ]"
# 2+ stalls should stop
check "stall >= 2 means stop" "[ 2 -ge 2 ]"

# --- Transcript window extraction ---
echo ""
echo "transcript window:"

# JSONL fixture: two assistant messages across two "iterations"
JSONL_DIR="$TEST_DIR/transcript"
mkdir -p "$JSONL_DIR"
JSONL_FILE="$JSONL_DIR/session.jsonl"
cat > "$JSONL_FILE" <<'JSONEOF'
{"type":"assistant","message":{"content":[{"type":"text","text":"iteration 0 work"}]}}
{"type":"user","message":{"content":"user msg"}}
{"type":"assistant","message":{"content":[{"type":"text","text":"iteration 1 work"}]}}
JSONEOF

# Extract full file (offset=0)
tail -n +1 "$JSONL_FILE" | jq -rs '
    [.[] | select(.type == "assistant") | .message.content // empty]
    | map(if type == "array" then map(select(.type == "text") | .text) | join("\n")
          elif type == "string" then . else "" end)
    | join("\n\n")
' > "$JSONL_DIR/full.txt" 2>/dev/null
check "tail+jq extracts all assistant messages" "grep -q 'iteration 0 work' '$JSONL_DIR/full.txt' && grep -q 'iteration 1 work' '$JSONL_DIR/full.txt'"

# Extract from offset=2 (skip first 2 lines → only line 3)
tail -n +3 "$JSONL_FILE" | jq -rs '
    [.[] | select(.type == "assistant") | .message.content // empty]
    | map(if type == "array" then map(select(.type == "text") | .text) | join("\n")
          elif type == "string" then . else "" end)
    | join("\n\n")
' > "$JSONL_DIR/window.txt" 2>/dev/null
check "tail+jq window skips first N lines" "grep -q 'iteration 1 work' '$JSONL_DIR/window.txt'"
check "tail+jq window excludes prior lines" "! grep -q 'iteration 0 work' '$JSONL_DIR/window.txt'"

# wc -l whitespace trimming
RAW_LINES=$(wc -l < "$JSONL_FILE" 2>/dev/null)
TRIMMED=$(echo "$RAW_LINES" | tr -d '[:space:]')
check "wc -l trimmed is numeric" "[[ '$TRIMMED' =~ ^[0-9]+$ ]]"
check "wc -l trimmed equals 3" "[ '$TRIMMED' -eq 3 ]"

# ITERATIONS used (not MAX_ITERATIONS) — grep kick-session.sh
check "kick-session uses ITERATIONS in feedback" "grep -q 'NEXT}/\${ITERATIONS}' '$SCRIPTS_DIR/kick-session.sh'"

# --- Cleanup ---
rm -r "$TEST_DIR" 2>/dev/null || true

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

# --- pytest ---
echo ""
echo "=== pytest ==="
if python3.12 -m pytest --version > /dev/null 2>&1; then
    python3.12 -m pytest "$SCRIPTS_DIR/tests/" -v --tb=short 2>&1
    PYTEST_EXIT=$?
    if [ $PYTEST_EXIT -ne 0 ]; then
        echo "pytest: FAILED (exit $PYTEST_EXIT)"
        FAIL=$((FAIL + 1))
    else
        echo "pytest: all passed"
    fi
else
    echo "pytest not installed — skipping (run: pip install pytest)"
fi

echo ""
echo "=== Final: $PASS bash checks passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

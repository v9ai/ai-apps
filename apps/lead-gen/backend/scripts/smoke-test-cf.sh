#!/usr/bin/env bash
# Post-deploy smoke tests for the 3-container CF split.
#
# Usage: LANGGRAPH_AUTH_TOKEN=... ./scripts/smoke-test-cf.sh
# Override the public hostname with HOST=https://... if you're testing a
# staging environment or a preview deploy.

set -eu

HOST="${HOST:-https://lead-gen-langgraph.eeeew.workers.dev}"
T="${LANGGRAPH_AUTH_TOKEN:?LANGGRAPH_AUTH_TOKEN not set}"

auth=(-H "Authorization: Bearer $T")
json=(-H "content-type: application/json")

check() {
    local name="$1"
    shift
    echo "── $name ──"
    if "$@"; then
        echo "  ok"
    else
        echo "  FAIL"
        exit 1
    fi
}

# 1. Hot path stays hot (core only, no RemoteGraph hop).
check "hot-path classify_paper" \
    curl -sf "${auth[@]}" "${json[@]}" "$HOST/runs/wait" \
        -d '{"assistant_id":"classify_paper","input":{"title":"test","abstract":"LLM agents for sales"}}' \
        --max-time 15 --output /dev/null

# 2. Cross-container: core → ml via RemoteGraph for embeddings.
check "cross-container deep_icp (core → ml /embed)" \
    curl -sf "${auth[@]}" "${json[@]}" "$HOST/runs/wait" \
        -d '{"assistant_id":"deep_icp","input":{"product_id":1,"company_id":1}}' \
        --max-time 60 --output /dev/null

# 3. Cross-container: core → research.
check "cross-container research_agent" \
    curl -sf "${auth[@]}" "${json[@]}" "$HOST/runs/wait" \
        -d '{"assistant_id":"research_agent","input":{"mode":"research","query":"test"}}' \
        --max-time 120 --output /dev/null

# 4. LinkedIn router mounted in core.
check "linkedin /stats" \
    curl -sf "${auth[@]}" "$HOST/linkedin/stats" --max-time 10 --output /dev/null

# 5. Health endpoint on the dispatcher.
check "dispatcher /ok" \
    curl -sf "$HOST/ok" --max-time 5 --output /dev/null

echo ""
echo "All 5 smoke tests passed."

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

expect_status() {
    local name="$1" want="$2"; shift 2
    echo "── $name (expect $want) ──"
    local got
    got=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$@")
    if [[ "$got" == "$want" ]]; then
        echo "  ok ($got)"
    else
        echo "  FAIL (got $got, want $want)"
        exit 1
    fi
}

# 6. Auth: missing bearer → 401.
expect_status "auth missing → 401" 401 \
    "${json[@]}" "$HOST/runs/wait" \
    -d '{"assistant_id":"classify_paper","input":{"title":"x","abstract":"y"}}'

# 7. Auth: wrong bearer → 401.
expect_status "auth wrong → 401" 401 \
    -H "Authorization: Bearer not-the-real-token" "${json[@]}" "$HOST/runs/wait" \
    -d '{"assistant_id":"classify_paper","input":{"title":"x","abstract":"y"}}'

# 8. Internal-only path /_ml/* hit externally → 403 (even with valid bearer).
expect_status "internal /_ml/* external → 403" 403 \
    "${auth[@]}" "${json[@]}" "$HOST/_ml/runs/wait" \
    -d '{"assistant_id":"bge_m3_embed","input":{"texts":["x"]}}'

# 9. Internal-only path /_research/* hit externally → 403.
expect_status "internal /_research/* external → 403" 403 \
    "${auth[@]}" "${json[@]}" "$HOST/_research/runs/wait" \
    -d '{"assistant_id":"scholar","input":{"command":"migrate"}}'

echo ""
echo "All 9 smoke tests passed."

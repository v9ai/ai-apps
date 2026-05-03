#!/usr/bin/env bash
# Deploy the 3-container lead-gen LangGraph stack to Cloudflare.
#
# Usage:
#   scripts/deploy-cf.sh all                # ml → research → core → dispatcher
#   scripts/deploy-cf.sh ml                 # single sub-container
#   scripts/deploy-cf.sh research
#   scripts/deploy-cf.sh core
#   scripts/deploy-cf.sh dispatcher         # top-level Worker only
#   scripts/deploy-cf.sh secrets-check      # dry-run: only verify required secrets
#
# Build-context dance: each sub-Dockerfile does `COPY leadgen_agent
# ./leadgen_agent` so the shared package lands in the image. wrangler runs
# its build from the same directory as the wrangler.jsonc, so we stage the
# package into each sub-dir right before deploy and clean it up after.
#
# Required external tools: wrangler (>= 4.x), rsync, jq, shasum.

set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="${1:-all}"
BACKEND_DIR="$(pwd)"
SHARED_PKG="leadgen_agent"

# ── colours ────────────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    BOLD=$(tput bold) DIM=$(tput dim) RED=$(tput setaf 1)
    GRN=$(tput setaf 2) YEL=$(tput setaf 3) RESET=$(tput sgr0)
else
    BOLD="" DIM="" RED="" GRN="" YEL="" RESET=""
fi

say() { printf '%s[deploy-cf]%s %s\n' "$BOLD" "$RESET" "$*"; }
ok()  { printf '  %s✓%s %s\n' "$GRN" "$RESET" "$*"; }
warn(){ printf '  %s⚠%s %s\n' "$YEL" "$RESET" "$*"; }
die() { printf '%s✗ %s%s\n' "$RED" "$*" "$RESET" >&2; exit 1; }

# ── secrets expected per sub-container ─────────────────────────────────────
# Required: deploy fails if missing. Optional: logged as a warning.

CORE_REQUIRED=(
    NEON_DATABASE_URL
    DEEPSEEK_API_KEY
    LANGGRAPH_AUTH_TOKEN
    ML_INTERNAL_AUTH_TOKEN
    RESEARCH_INTERNAL_AUTH_TOKEN
)
CORE_OPTIONAL=(
    EMAIL_LLM_API_KEY
    SCORER_AUTH_TOKEN
    GITHUB_TOKEN
    CLOUDFLARE_ACCOUNT_ID
    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_D1_LEADGEN_JOBS_ID
)
ML_REQUIRED=(
    NEON_DATABASE_URL
    ML_INTERNAL_AUTH_TOKEN
)
RESEARCH_REQUIRED=(
    NEON_DATABASE_URL
    RESEARCH_INTERNAL_AUTH_TOKEN
    DEEPSEEK_API_KEY
)
RESEARCH_OPTIONAL=(
    SEMANTIC_SCHOLAR_API_KEY
    GITHUB_TOKEN
    OPENALEX_MAILTO
    BRAVE_API_KEY
    ICP_EMBED_URL
)
DISPATCHER_REQUIRED=(
    # Hash is in wrangler.jsonc vars (non-secret); no wrangler secrets here.
)

check_secrets() {
    local config="$1"; shift
    local label="$1"; shift
    local -n required=$1; shift
    local -n optional=$1

    say "checking secrets for $label ($config)..."
    local listed
    listed=$(wrangler secret list --config "$config" 2>/dev/null \
        | jq -r '.[].name' 2>/dev/null || true)

    local missing=()
    for key in "${required[@]}"; do
        if echo "$listed" | grep -qx "$key"; then
            ok "  required $key"
        else
            missing+=("$key")
        fi
    done
    for key in "${optional[@]}"; do
        if echo "$listed" | grep -qx "$key"; then
            ok "  optional $key"
        else
            warn "  optional $key not set — dependent graphs will degrade"
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        die "missing required secrets for $label: ${missing[*]}"
    fi
}

# ── stage shared leadgen_agent into a sub-container dir ────────────────────
stage_shared() {
    local subdir="$1"
    say "staging $SHARED_PKG → $subdir/"
    rsync -a --delete \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        "$BACKEND_DIR/$SHARED_PKG/" \
        "$BACKEND_DIR/$subdir/$SHARED_PKG/"
    # core's requirements.txt references ./vendor/research-client (local path
    # install). Stage vendor/ alongside leadgen_agent so the build context
    # contains it.
    if [ "$subdir" = "core" ] && [ -d "$BACKEND_DIR/vendor" ]; then
        say "staging vendor → core/"
        rsync -a --delete \
            --exclude '__pycache__' \
            --exclude '*.pyc' \
            "$BACKEND_DIR/vendor/" \
            "$BACKEND_DIR/core/vendor/"
    fi
}

unstage_shared() {
    local subdir="$1"
    if [ -d "$BACKEND_DIR/$subdir/$SHARED_PKG" ]; then
        say "cleaning $subdir/$SHARED_PKG"
        rm -rf "$BACKEND_DIR/$subdir/$SHARED_PKG"
    fi
    if [ "$subdir" = "core" ] && [ -d "$BACKEND_DIR/core/vendor" ]; then
        say "cleaning core/vendor"
        rm -rf "$BACKEND_DIR/core/vendor"
    fi
}

# ── deploy a sub-container ─────────────────────────────────────────────────
deploy_one() {
    local subdir="$1"
    local name="$2"
    local config="$subdir/wrangler.jsonc"
    say "${BOLD}deploying $name${RESET}"
    [ -f "$config" ] || die "missing $config"

    stage_shared "$subdir"
    # shellcheck disable=SC2064
    trap "unstage_shared $subdir" EXIT INT TERM

    wrangler deploy --config "$config"
    ok "$name deployed"

    unstage_shared "$subdir"
    trap - EXIT INT TERM
}

deploy_dispatcher() {
    say "${BOLD}deploying dispatcher (top-level)${RESET}"
    if ! jq -r '.vars.LANGGRAPH_AUTH_TOKEN_HASH' wrangler.jsonc \
            | grep -qE '^[a-f0-9]{64}$'; then
        die "wrangler.jsonc vars.LANGGRAPH_AUTH_TOKEN_HASH must be a 64-char sha256 hex. \
Run: echo -n \"\$LANGGRAPH_AUTH_TOKEN\" | shasum -a 256"
    fi
    wrangler deploy --config wrangler.jsonc
    ok "dispatcher deployed"
}

# ── post-deploy health probes ──────────────────────────────────────────────
probe() {
    local url="$1" name="$2"
    say "probing $name at $url"
    for _ in 1 2 3 4 5 6; do
        if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
            ok "$name responding"
            return 0
        fi
        sleep 2
    done
    warn "$name did not respond in 12s (may still be cold-starting)"
}

# ── post-deploy live e2e gate ──────────────────────────────────────────────
# Runs the test suite in backend/tests/test_remote_langgraph_e2e.py against
# the deployed dispatcher. Skipped (with a warn) when LANGGRAPH_AUTH_TOKEN is
# absent from the environment — load it via `.env.local` before running this
# script, e.g. `dotenv -f .env.local run -- bash backend/scripts/deploy-cf.sh all`.
# Failure here exits the script non-zero so a broken deploy is loud.
live_e2e() {
    if [ -z "${LANGGRAPH_AUTH_TOKEN:-}" ]; then
        warn "LANGGRAPH_AUTH_TOKEN not set — skipping live e2e gate "\
"(load .env.local or run: dotenv -f .env.local run -- $0 $TARGET)"
        return 0
    fi
    say "running live e2e suite against deployed dispatcher..."
    if RUN_LIVE_E2E=1 uv run --project "$BACKEND_DIR" pytest \
            "$BACKEND_DIR/tests/test_remote_langgraph_e2e.py" \
            --maxfail=1 -q; then
        ok "live e2e passed"
    else
        die "live e2e failed — deploy is broken"
    fi
}

# ── dispatch ───────────────────────────────────────────────────────────────
case "$TARGET" in
    secrets-check)
        check_secrets "ml/wrangler.jsonc"       "ml"       ML_REQUIRED       ML_REQUIRED
        check_secrets "research/wrangler.jsonc" "research" RESEARCH_REQUIRED RESEARCH_OPTIONAL
        check_secrets "core/wrangler.jsonc"     "core"     CORE_REQUIRED     CORE_OPTIONAL
        ;;
    ml)
        check_secrets "ml/wrangler.jsonc" "ml" ML_REQUIRED ML_REQUIRED
        deploy_one "ml" "lead-gen-ml"
        ;;
    research)
        check_secrets "research/wrangler.jsonc" "research" RESEARCH_REQUIRED RESEARCH_OPTIONAL
        deploy_one "research" "lead-gen-research"
        ;;
    core)
        check_secrets "core/wrangler.jsonc" "core" CORE_REQUIRED CORE_OPTIONAL
        deploy_one "core" "lead-gen-core"
        ;;
    dispatcher)
        deploy_dispatcher
        ;;
    all)
        check_secrets "ml/wrangler.jsonc"       "ml"       ML_REQUIRED       ML_REQUIRED
        check_secrets "research/wrangler.jsonc" "research" RESEARCH_REQUIRED RESEARCH_OPTIONAL
        check_secrets "core/wrangler.jsonc"     "core"     CORE_REQUIRED     CORE_OPTIONAL

        deploy_one "ml" "lead-gen-ml"
        deploy_one "research" "lead-gen-research"
        deploy_one "core" "lead-gen-core"
        deploy_dispatcher

        say "post-deploy smoke:"
        probe "https://lead-gen-langgraph.eeeew.workers.dev/ok" "dispatcher /ok"
        live_e2e
        ;;
    *)
        die "unknown target: $TARGET (expected: all | ml | research | core | dispatcher | secrets-check)"
        ;;
esac

say "${BOLD}${GRN}done${RESET}"

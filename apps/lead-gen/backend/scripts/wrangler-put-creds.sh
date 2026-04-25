#!/usr/bin/env bash
# Push wrangler-managed credentials to lead-gen-{ml,research,core} from .env.local.
#
# Source of truth: apps/lead-gen/.env.local
# Usage:  bash scripts/wrangler-put-creds.sh [ml|research|core|all]
# Default: all

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-../.env.local}"
TARGET="${1:-all}"

[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

# Read VALUE for KEY from .env.local without shell-sourcing (some values
# contain `&`, `?`, etc. that trip `set -a; .`).
read_env() {
    local key="$1"
    grep -E "^${key}=" "$ENV_FILE" | head -1 | sed -E "s/^${key}=//;s/^['\"]//;s/['\"]$//"
}

push() {
    local name="$1" config="$2" required="${3:-1}"
    local val
    val=$(read_env "$name")
    if [ -z "$val" ]; then
        if [ "$required" = "1" ]; then
            echo "✗ $name not in $ENV_FILE — skipping (required for $config)"
            return 1
        else
            echo "⊘ $name not in $ENV_FILE — skipping (optional for $config)"
            return 0
        fi
    fi
    echo "→ wrangler secret put $name --config $config"
    printf '%s' "$val" | npx --yes wrangler@latest secret put "$name" --config "$config" >/dev/null 2>&1 \
        && echo "  ✓ $name set on $config" \
        || { echo "  ✗ failed setting $name on $config"; return 1; }
}

push_ml() {
    echo "── ml ──"
    push NEON_DATABASE_URL      ml/wrangler.jsonc 1
    push ML_INTERNAL_AUTH_TOKEN ml/wrangler.jsonc 1
}

push_research() {
    echo "── research ──"
    push NEON_DATABASE_URL            research/wrangler.jsonc 1
    push RESEARCH_INTERNAL_AUTH_TOKEN research/wrangler.jsonc 1
    push DEEPSEEK_API_KEY             research/wrangler.jsonc 1
    push SEMANTIC_SCHOLAR_API_KEY     research/wrangler.jsonc 0
    push GITHUB_TOKEN                 research/wrangler.jsonc 0
    push OPENALEX_MAILTO              research/wrangler.jsonc 0
    push BRAVE_API_KEY                research/wrangler.jsonc 0
    push ICP_EMBED_URL                research/wrangler.jsonc 0
}

push_core() {
    echo "── core ──"
    push NEON_DATABASE_URL            core/wrangler.jsonc 1
    push DEEPSEEK_API_KEY             core/wrangler.jsonc 1
    push LANGGRAPH_AUTH_TOKEN         core/wrangler.jsonc 1
    push ML_INTERNAL_AUTH_TOKEN       core/wrangler.jsonc 1
    push RESEARCH_INTERNAL_AUTH_TOKEN core/wrangler.jsonc 1
    push EMAIL_LLM_API_KEY            core/wrangler.jsonc 0
    push SCORER_AUTH_TOKEN            core/wrangler.jsonc 0
    push GITHUB_TOKEN                 core/wrangler.jsonc 0
}

case "$TARGET" in
    ml)       push_ml ;;
    research) push_research ;;
    core)     push_core ;;
    all)      push_ml; push_research; push_core ;;
    *)        echo "unknown target: $TARGET (expected ml|research|core|all)"; exit 1 ;;
esac

echo ""
echo "done. Verify with: bash scripts/deploy-cf.sh secrets-check"

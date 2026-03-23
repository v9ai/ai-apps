#!/bin/bash
# Push environment variables from .env to Vercel

set -e
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env not found"
  exit 1
fi

echo "🚀 Pushing environment variables to Vercel..."
echo ""

# Required environment variables
declare -a env_vars=(
  "NEXT_PUBLIC_APP_URL"
  "BETTER_AUTH_SECRET"
  "BETTER_AUTH_URL"
  "AUTH_SECRET"
  "TURSO_DB_URL"
  "TURSO_DB_AUTH_TOKEN"
  "DEEPSEEK_API_KEY"
  "BRAVE_API_KEY"
  "CLOUDFLARE_API_TOKEN"
  "CLOUDFLARE_API_KEY"
  "CLOUDFLARE_ACCOUNT_ID"
)

# Push each variable to all environments
for var_name in "${env_vars[@]}"; do
  # Extract value from .env (handle both KEY=value and KEY = value formats)
  var_value=$(grep "^${var_name}" .env | sed -E 's/^[^=]+=\s*//' | tr -d '"' | xargs)
  
  if [ -z "$var_value" ]; then
    echo "⚠️  Skipping $var_name - not found in .env"
    continue
  fi
  
  # Log the variable being pushed (truncate long values for security)
  if [ ${#var_value} -gt 20 ]; then
    echo "📤 Pushing $var_name (${#var_value} chars): ${var_value:0:10}...${var_value: -5}"
  else
    echo "📤 Pushing $var_name: $var_value"
  fi
  
  # Push to all three environments
  for env in production preview development; do
    echo "$var_value" | vercel env add "$var_name" "$env" --force 2>&1 | grep -v "^Vercel CLI" || true
    if [ $? -eq 0 ]; then
      echo "  ✅ $env"
    else
      echo "  ❌ $env - failed"
    fi
  done
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All environment variables pushed to Vercel!"
echo ""
echo "Verify with: vercel env ls"

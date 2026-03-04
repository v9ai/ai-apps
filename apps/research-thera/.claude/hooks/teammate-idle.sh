#!/bin/bash
# TeammateIdle hook — prevents teammates from going idle prematurely
#
# Exit 0: allow idle (teammate can stop)
# Exit 2: send feedback via stderr (teammate keeps working)
#
# Input (stdin JSON):
#   { "teammate_name": "...", "team_name": "...", ... }

INPUT=$(cat)
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // empty')
TEAM=$(echo "$INPUT" | jq -r '.team_name // empty')

# backend-dev must run codegen after schema changes
if [ "$TEAMMATE" = "backend-dev" ]; then
  if git diff --name-only HEAD 2>/dev/null | grep -q '\.graphql$'; then
    # Check if codegen was run (generated files should also be modified)
    if ! git diff --name-only HEAD 2>/dev/null | grep -q 'app/__generated__/'; then
      echo "You modified .graphql files but didn't run pnpm codegen. Run it before stopping." >&2
      exit 2
    fi
  fi
fi

# qa-engineer must have run type checking
if [ "$TEAMMATE" = "qa" ] || [ "$TEAMMATE" = "qa-engineer" ]; then
  # Check that TypeScript compiles cleanly
  if ! npx tsc --noEmit 2>/dev/null; then
    echo "TypeScript errors detected. Fix type errors before going idle." >&2
    exit 2
  fi
fi

exit 0

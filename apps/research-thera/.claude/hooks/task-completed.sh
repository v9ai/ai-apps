#!/bin/bash
# TaskCompleted hook — validates task output before marking complete
#
# Exit 0: allow completion
# Exit 2: block completion, send feedback via stderr
#
# Input (stdin JSON):
#   { "task_id": "...", "task_subject": "...", "task_description": "...",
#     "teammate_name": "...", "team_name": "..." }

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty')
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // empty')

# Tasks involving schema changes must have codegen run
if echo "$TASK_SUBJECT" | grep -iqE 'schema|graphql|mutation|query|type'; then
  if [ "$TEAMMATE" = "backend-dev" ]; then
    if ! pnpm codegen > /dev/null 2>&1; then
      echo "Task involves schema changes but pnpm codegen failed. Fix codegen errors before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
fi

# Tasks involving frontend must pass lint
if echo "$TASK_SUBJECT" | grep -iqE 'component|page|ui|frontend|layout'; then
  if [ "$TEAMMATE" = "frontend-dev" ]; then
    if ! pnpm lint > /dev/null 2>&1; then
      echo "Lint errors found. Fix lint before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
fi

exit 0

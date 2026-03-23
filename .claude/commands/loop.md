Run the loop initialization script, then start working on the task.

First, run this command to initialize the loop:
```
bash $CLAUDE_PROJECT_DIR/.claude/loop/start-loop.sh $ARGUMENTS
```

If the initialization succeeds, begin working on the task described in the arguments. The Stop hook will handle iteration, evaluation, and context retrieval automatically — just focus on the task.

If `--reset` was passed, just run the reset and confirm it's done. Do not start any task.

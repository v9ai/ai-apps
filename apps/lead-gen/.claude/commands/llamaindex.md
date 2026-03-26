# LlamaIndex Workflows Pipeline

Run both LlamaIndex Workflows pipelines (interview prep + tech knowledge) for application `$ARGUMENTS`.

## Execution

Run these two commands sequentially from `llamaindex/`:

1. **Interview Prep** — generate Q&A report, save to DB:
```bash
cd llamaindex && uv run python -m cli interview-prep --app-id $ARGUMENTS
```

2. **Tech Knowledge** — extract technologies, generate study lessons, persist to knowledge DB:
```bash
cd llamaindex && uv run python -m cli tech-knowledge --app-id $ARGUMENTS
```

Show the full output of each command to the user.

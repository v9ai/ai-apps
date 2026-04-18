---
library_name: transformers
tags:
- qwen2.5
- prompt-engineering
- agent
- hoa
---

# regen-judge

Qwen2.5-Instruct system prompt for the **regen-judge** agent in the
[House of Agents](https://github.com/) monorepo (`apps/hoa` / `crates/course-review`).

This repo ships the agent's **persona** — a stable role description plus its
tool allow-list and generation defaults. Task prompts (the per-request
instruction) stay in application code, so this bundle composes with any
inference runtime: MLX locally, HF Inference API remotely, or vLLM.

## Files

| File | Purpose |
|------|---------|
| `system_prompt.txt` | Stable persona — loaded into the `system` role |
| `tools.json` | Ordered list of tool names this agent is allowed to invoke |
| `generation.json` | Default model, temperature, max_tokens, and HF fallback model |

## Tool allow-list

_none (pure synthesis)_

## Usage (Python)

```python
from hf_agent import load_agent, resolve_tools

bundle = load_agent("regen-judge", family="hoa")
# bundle.system_prompt, bundle.tools, bundle.generation are ready to use
```

## Usage (Rust)

```rust
let bundle = hf_agent::load_agent("regen-judge", Family::Hoa)?;
println!("{}", bundle.system_prompt);
```

## Source

Extracted from `backend/regen_questions.py`.

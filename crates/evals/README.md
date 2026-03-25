# evals

Proof-of-concept for an **iterative code evaluation and improvement loop** using the [Rig](https://github.com/0xPlaygrounds/rig) agent framework with DeepSeek as the LLM provider.

## How It Works

Two agents collaborate in a feedback loop:

1. **Generator agent** — produces code solutions and iterates based on feedback
2. **Evaluator agent** — scores code on correctness, time complexity, and style/best practices

```
┌──────────┐   code    ┌───────────┐
│ Generator │ ───────── │ Evaluator │
│   Agent   │ ◄──────── │   Agent   │
└──────────┘  feedback  └───────────┘
       ↕                      ↕
   Produces code        Returns Evaluation {
   with "Thoughts:"       evaluation_status: Pass | NeedsImprovement | Fail,
   + "Response:"          feedback: String,
   sections              }
```

The loop terminates when the evaluator returns `EvalStatus::Pass`.

## Types

```rust
pub enum EvalStatus { Pass, NeedsImprovement, Fail }

pub struct Evaluation {
    pub evaluation_status: EvalStatus,
    pub feedback: String,
}
```

## Hardcoded Task

Implements a `Stack` with `push(x)`, `pop()`, and `getMin()` — all O(1) time complexity.

## Running

```bash
# Requires DEEPSEEK_API_KEY env var
cargo run -p evals
```

## Dependencies

- `rig-core` 0.32 — agent framework (uses `rig::providers::deepseek`)
- `schemars` — JSON Schema for structured evaluator output
- `tokio` — async runtime

Standalone — no sibling crate dependencies.

# SDD — Spec-Driven Development Pipeline

Runtime-agnostic Rust library that orchestrates AI-driven software changes through a structured 8-phase workflow:

```
explore → propose → spec ⟂ design → tasks → apply → verify → archive
```

The `⟂` denotes that **Spec** and **Design** run in parallel — the key SDD optimization.

## Overview

SDD turns unstructured change requests into reproducible, verified implementations by passing each change through a dependency-aware phase DAG. Every phase is backed by an LLM call (reasoning model for analysis, chat model for generation), and the pipeline tracks token budgets, artifact history, and a structured Definition of Done.

The library is generic over its LLM backend — consumers implement a single `LlmClient` trait for their runtime (reqwest, WASM fetch, mock).

## Phase DAG

| Phase | Model | Dependencies | Description |
|---------|----------|--------------|-------------|
| **Explore** | Reasoner | — | Investigate the idea, analyze trade-offs |
| **Propose** | Chat | — | Intent, scope, approach, risks, rollback plan |
| **Spec** | Reasoner | Propose | Delta specs: ADDED/MODIFIED/REMOVED with Given/When/Then |
| **Design** | Reasoner | Propose | Architecture decisions, data flow, interfaces |
| **Tasks** | Chat | Spec, Design | Phased implementation checklist |
| **Apply** | Chat | Tasks | Write code, mark tasks complete |
| **Verify** | Reasoner | Apply | Check completeness, correctness, coherence, testing |
| **Archive** | Chat | Verify | Merge delta specs into main specs |

## Quick Start

```rust
use sdd::{SddPipeline, SddChange, LlmClient, ChatRequest, ChatResponse};

// 1. Implement LlmClient for your runtime
struct MyClient { /* ... */ }

#[async_trait::async_trait]
impl LlmClient for MyClient {
    async fn chat(&self, request: &ChatRequest) -> sdd::Result<ChatResponse> {
        // Call DeepSeek, Qwen, or any compatible API
        todo!()
    }
}

// 2. Create a change and run the pipeline
let client = MyClient { /* ... */ };
let pipeline = SddPipeline::new(client);

let mut change = SddChange::new(
    "add-user-search",
    "Add full-text search to the users endpoint",
);

// Run all planning phases (propose → spec ⟂ design → tasks)
pipeline.fast_forward(&mut change, "").await?;

// Or run the full pipeline end-to-end with Apply+Verify retry
pipeline.full_pipeline(&mut change, "").await?;
```

## Execution Modes

| Method | Phases | Use Case |
|--------|--------|----------|
| `execute_phase()` | Single phase | Step-by-step control |
| `execute_parallel_spec_design()` | Spec + Design | Parallel planning |
| `fast_forward()` | Propose → Spec ⟂ Design → Tasks | Planning only |
| `continue_change()` | Auto-detect ready phases | Resume from any state |
| `full_pipeline()` | All 8 phases | Autonomous end-to-end |

When Verify fails, `full_pipeline` automatically retries Apply+Verify (up to `max_verify_retries` times), injecting the failure summary as context.

## Modules

### Core

- **`pipeline`** — `SddPipeline<C>` orchestrator, phase DAG detection
- **`agent`** — `agent_loop()` with tool calling, `build_request()` for ChatRequest construction
- **`types`** — `SddChange`, `SddPhase`, `Model`, `Provider`, `DefinitionOfDone`, hook/session types
- **`traits`** — `LlmClient`, `ChangeStore`, `SessionRepository`, `Platform`
- **`error`** — `SddError` enum (DependencyNotMet, BudgetExceeded, VerifyFailed, etc.)
- **`providers`** — `DeepSeekLlmClient` and `QwenLlmClient` adapters

### Tooling

- **`tools`** — `ToolRegistry` with 12 built-in tools (Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, etc.) and presets (`TOOLS_READONLY`, `TOOLS_CODING`, `TOOLS_ALL`)
- **`subagents`** — `SubagentRegistry` with preset agents (code-reviewer, test-runner, researcher, reasoner) and 8 SDD phase agents
- **`hooks`** — `HookRegistry` with event-driven callbacks (PrePhase, PostPhase, PreToolUse, etc.) and built-in factories (`block_tools_hook`, `sdd_phase_guard_hook`)

### Validation & Quality

- **`validate`** — Spec validation rules: requirements present, scenarios present, RFC 2119 keywords, no contradictions
- **`contracts`** — Contract compatibility checking (Backward, Forward, Full) with requirement extraction
- **`eval`** — Precision/recall/F1 evaluation framework for LLM findings against ground truth

### Utilities

- **`dag`** — Generic DAG pipeline with cycle detection (Kahn's algorithm), wave-by-wave parallel execution
- **`extract`** — JSON extraction from LLM text (fenced blocks, balanced braces/brackets)
- **`concurrent`** — `ConcurrentRunner` for runtime-agnostic fan-out (works in WASM + native)
- **`integrations`** — `WorkflowDocs` for enriching phase prompts with reference documentation

## Provider Support

```rust
// DeepSeek (default)
let pipeline = SddPipeline::new(client);

// Qwen
let pipeline = SddPipeline::with_provider(client, Provider::Qwen);

// Mix models
let pipeline = SddPipeline::new(client)
    .with_reasoner_model(Model::Qwen(QwenModel::QwqPlus))
    .with_chat_model(Model::DeepSeek(DeepSeekModel::Chat));
```

| Provider | Reasoner | Chat |
|----------|----------|------|
| DeepSeek | `deepseek-reasoner` | `deepseek-chat` |
| Qwen | `qwq-plus` | `qwen-plus` |

## Definition of Done

Verify evaluates each change against a structured DoD. The default checks four criteria:

1. **Completeness** — All tasks marked done
2. **Correctness** — Requirements have codebase evidence
3. **Coherence** — Design decisions followed
4. **Testing** — Spec scenarios covered

Custom criteria can be added per-change:

```rust
change.add_criterion(DodCriterion {
    id: "perf".into(),
    description: "P99 latency under 200ms".into(),
    category: DodCategory::Custom("performance".into()),
    required: true,
});
```

The LLM outputs structured `DOD_RESULT:` / `DOD_VERDICT:` lines parsed into a `DodReport`. Legacy `PASS`/`FAIL` heuristic is supported as fallback.

## Hooks

Event-driven hooks mirror the Anthropic hooks model:

```rust
let hooks = HookBuilder::new()
    .on(HookEvent::PrePhase, |input| {
        // Block, modify, or add context before any phase runs
        HookOutput::default()
    })
    .build();

let pipeline = SddPipeline::new(client).with_hooks(hooks);
```

Built-in hook factories: `block_tools_hook()`, `context_injection_hook()`, `sdd_phase_guard_hook()`.

## Spec Validation Gate

Optionally validate specs before proceeding to Tasks:

```rust
use sdd::validate::builtin_rules;

let pipeline = SddPipeline::new(client)
    .with_spec_validation(builtin_rules());
```

Built-in rules check for ADDED/MODIFIED/REMOVED sections, Given/When/Then scenarios, RFC 2119 keywords (MUST/SHOULD/MAY), and contradictions.

## Token Budget

```rust
let mut change = SddChange::new("feat", "description");
change.token_budget = Some(500_000);
// Pipeline aborts with SddError::BudgetExceeded if cumulative usage exceeds budget
```

## Dependencies

```toml
[dependencies]
sdd = { path = "crates/sdd" }
```

The crate depends on `deepseek` (wire types, reqwest client) and `qwen` (Qwen client), plus `serde`, `serde_json`, `futures`, `async-trait`, `anyhow`, and `thiserror`.

## License

MIT

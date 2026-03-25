# genesis

Self-improving code generation system that wraps the SDD (Spec-Driven Development) pipeline in a learning/optimization layer with iterative fitness evaluation, prompt variant management, and statistical regression detection.

## Architecture

Genesis implements an automated improvement cycle:

```
Generate code (SDD) → Evaluate fitness → Record stats → Mutate prompts → Repeat
```

The system tracks multi-dimensional fitness scores, manages prompt variants per SDD phase, and uses circuit-breaker patterns to prevent cascade failures.

## Core Types

### Configuration

```rust
pub struct GenesisConfig {
    pub state_dir: String,            // default: ~/.genesis/
    pub cycle_token_budget: u32,      // default: 100,000
    pub daily_token_budget: u64,      // default: 500,000
    pub pattern_threshold: f64,       // default: 0.7
    pub mutation_interval: u32,       // default: 20 cycles
    pub min_trials_for_prune: u32,    // default: 10
    pub prune_threshold: f64,         // default: 0.4
    pub baseline_window: usize,       // default: 50
    pub breaker_failure_rate: f64,    // default: 0.30
    pub verify_retries: u32,          // default: 2
    pub weights: FitnessWeights,
}
```

### Fitness Scoring (6 dimensions)

```rust
pub struct FitnessWeights {
    pub compiles: f64,        // 0.25
    pub tests_pass: f64,      // 0.25
    pub lint_clean: f64,      // 0.10
    pub complexity: f64,      // 0.10
    pub spec_adherence: f64,  // 0.20
    pub pattern_match: f64,   // 0.10
}

pub struct FitnessReport {
    pub score: f64,           // composite [0.0, 1.0]
    pub compiles: bool,       // hard gate
    pub tests_passed: u32,
    pub tests_total: u32,
    pub lint_warnings: u32,
    pub mean_complexity: f64,
    pub spec_adherence: bool, // SDD DoD compliance
    pub pattern_score: f64,   // knowledge base matching
}
```

Weights adapt over time via Exponential Moving Average (`ema_update`).

### Prompt Variant Management

```rust
pub struct PromptVariant {
    pub id: String,           // UUID
    pub phase: String,        // SDD phase
    pub prompt: String,       // the actual prompt
    pub model: String,        // deepseek-reasoner / deepseek-chat
    pub successes: u32,
    pub trials: u32,
    pub mean_score: f64,      // running mean
    pub golden: bool,         // best-ever flag
}
```

### Regression Detection

```rust
pub struct BaselineStats {
    pub scores: Vec<f64>,     // rolling window
    pub mean: f64,
    pub stddev: f64,
}

// Error variant for regressions
GenesisError::Regression { current, baseline, p_value, cohens_d }
```

### Resilience Patterns

```rust
pub enum BreakerState { Closed, Open, HalfOpen }

// Errors
GenesisError::CircuitBreakerOpen { consecutive_failures }
GenesisError::CooldownActive { remaining_cycles }
GenesisError::BudgetExceeded { used, limit }
```

### Task Types

```rust
pub enum TaskType { Feature, Bugfix, Refactor, Test, Docs }
```

### Cycle Result

```rust
pub struct CycleResult {
    pub cycle_id: String,
    pub target: String,
    pub task_type: TaskType,
    pub fitness: FitnessReport,
    pub variants_used: HashMap<String, String>,  // phase → variant_id
    pub tokens_used: u32,
    pub duration_ms: u64,
    pub files_modified: Vec<String>,
    pub rolled_back: bool,
}
```

### Model Comparison

```rust
pub struct ModelStats {
    pub reasoner_trials: u32,  pub reasoner_mean: f64,
    pub chat_trials: u32,      pub chat_mean: f64,
}
// Picks best model with minimum observation threshold
```

## Status

The type system and error handling are complete. The binary entry point (`genesis`) is declared but not yet implemented.

## Dependencies

| Crate | Role |
|-------|------|
| `sdd` | SDD pipeline orchestration |
| `deepseek` | LLM client (agent + cache features) |
| `research` | Research utilities |
| `qwen` | Alternative LLM provider |
| `clap` | CLI argument parsing |
| `chrono` | Timestamps |
| `rand` | Randomization |
| `uuid` | ID generation |

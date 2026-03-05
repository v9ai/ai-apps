//! # SDD — Spec-Driven Development Pipeline
//!
//! Runtime-agnostic core library for the SDD workflow:
//!   explore → propose → spec ⟂ design → tasks → apply → verify → archive
//!
//! Consumers implement the `LlmClient` trait and optionally `ChangeStore`,
//! `SessionRepository`, and `Platform` for their runtime (WASM, CLI, server).

pub mod error;
pub mod types;
pub mod traits;
pub mod agent;
pub mod pipeline;
pub mod hooks;
pub mod tools;
pub mod subagents;
pub mod integrations;
pub mod concurrent;
pub mod dag;
pub mod eval;
pub mod extract;
pub mod validate;
pub mod contracts;

// Re-export key types for convenience
pub use error::{SddError, Result};
pub use types::*;
pub use traits::*;
pub use pipeline::{SddPipeline, detect_next_phase, detect_all_ready_phases};
pub use agent::{agent_loop, build_request};
pub use hooks::{HookRegistry, HookBuilder, HookMatcher, HookCallback,
                block_tools_hook, context_injection_hook, sdd_phase_guard_hook};
pub use tools::{ToolDefinition, ToolParam, ToolRegistry, define_builtin_tools, build_builtin_registry,
                TOOLS_READONLY, TOOLS_FILE_OPS, TOOLS_CODING, TOOLS_WEB, TOOLS_SDD, TOOLS_ALL};
pub use subagents::{SubagentRegistry, define_subagent, preset_subagents, sdd_subagents};
pub use integrations::WorkflowDocs;
pub use concurrent::ConcurrentRunner;
pub use dag::{DagNode, DagDefinition, DagBuilder, DagExecution, DagPipeline, detect_ready_nodes, NodeMeta};
pub use eval::{GroundTruth, Finding, EvalConfig, EvalMetrics, CategoryMetrics, evaluate, finding_matches};
pub use extract::{extract_json, extract_validated};
pub use validate::{ValidationRule, ValidationResult, RuleResult, validate_spec, builtin_rules};
pub use contracts::{Contract, CompatibilityMode, CompatibilityResult, check_compatibility, extract_requirements};

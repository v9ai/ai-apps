//! hoa-research — 20-agent person research pipeline in Rust.
//!
//! mistral.rs local inference (Qwen2.5-7B GGUF on Metal) — fully offline.
//! Phase 1 agents use HTTP tools (parallel via tokio).
//! Phase 2 agents run concurrently on the local model (continuous batching).
//! Phase 3 synthesizes evaluation, executive summary, and interview questions.

pub mod error;
pub mod llm;
pub mod output;
pub mod pipeline;
pub mod tools;
pub mod types;

//! hoa-research — 20-agent person research pipeline in Rust.
//!
//! Candle local inference (Qwen2.5-7B on Metal) + HF remote (72B) dual-lane.
//! Phase 1 agents use HTTP tools (parallel via tokio).
//! Phase 2 agents run concurrently on HF 72B.
//! Phase 3 synthesizes evaluation, executive summary, and interview questions.

pub mod error;
pub mod hf_client;
pub mod llm;
pub mod output;
pub mod pipeline;
pub mod tools;
pub mod types;

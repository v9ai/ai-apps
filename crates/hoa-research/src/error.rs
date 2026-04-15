//! Error types for the research pipeline.

use thiserror::Error;

pub type Result<T> = std::result::Result<T, PipelineError>;

#[derive(Debug, Error)]
pub enum PipelineError {
    #[error("inference: {0}")]
    Inference(#[from] candle_core::Error),

    #[error("tokenizer: {0}")]
    Tokenizer(String),

    #[error("http: {0}")]
    Http(#[from] reqwest::Error),

    #[error("json: {0}")]
    Json(#[from] serde_json::Error),

    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("agent {agent} failed: {reason}")]
    AgentFailed { agent: String, reason: String },

    #[error("agent {agent} timed out after {seconds}s")]
    AgentTimeout { agent: String, seconds: u64 },

    #[error("malformed LLM output from {agent}: {reason}")]
    MalformedOutput { agent: String, reason: String },

    #[error("{0}")]
    Other(String),
}

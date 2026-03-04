use thiserror::Error;

#[derive(Debug, Error)]
pub enum SddError {
    #[error("Phase `{phase}` requires `{dependency}` to complete first")]
    DependencyNotMet { phase: String, dependency: String },

    #[error("Phase `{phase}` blocked by hook: {reason}")]
    PhaseBlocked { phase: String, reason: String },

    #[error("LLM error: {0}")]
    Llm(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Store error: {0}")]
    Store(String),

    #[error("No choices in LLM response")]
    EmptyResponse,

    #[error("Max turns ({0}) exceeded")]
    MaxTurnsExceeded(u32),

    #[error("Token budget of {budget} exceeded (used {used})")]
    BudgetExceeded { budget: u32, used: u32 },

    #[error("Verify returned FAIL after {attempts} attempt(s): {reason}")]
    VerifyFailed { attempts: u32, reason: String },

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, SddError>;

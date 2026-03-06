use thiserror::Error;

#[derive(Debug, Error)]
pub enum GenesisError {
    #[error("SDD pipeline error: {0}")]
    Sdd(#[from] sdd::SddError),

    #[error("Regression detected: score {current:.3} vs baseline {baseline:.3} (p={p_value:.4}, d={cohens_d:.3})")]
    Regression {
        current: f64,
        baseline: f64,
        p_value: f64,
        cohens_d: f64,
    },

    #[error("Daily token budget exceeded: used {used}, limit {limit}")]
    BudgetExceeded { used: u64, limit: u64 },

    #[error("Circuit breaker open — system in cooldown after {consecutive_failures} consecutive failures")]
    CircuitBreakerOpen { consecutive_failures: u32 },

    #[error("Cooldown active — {remaining_cycles} cycles remaining before mutations resume")]
    CooldownActive { remaining_cycles: u32 },

    #[error("No variants available for phase `{phase}`")]
    NoVariants { phase: String },

    #[error("Rollback failed: {reason}")]
    RollbackFailed { reason: String },

    #[error("Store I/O error: {0}")]
    Store(String),

    #[error("Subprocess failed: {command} (exit code {code}): {stderr}")]
    Subprocess {
        command: String,
        code: i32,
        stderr: String,
    },

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, GenesisError>;

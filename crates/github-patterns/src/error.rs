use thiserror::Error;

#[derive(Debug, Error)]
pub enum GhError {
    #[error("GitHub API error {status}: {message}")]
    Api { status: u16, message: String },

    #[error("Rate limit exceeded — reset at {reset_at}")]
    RateLimit { reset_at: String },

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Deserialize error: {0}")]
    Deserialize(#[from] serde_json::Error),

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, GhError>;

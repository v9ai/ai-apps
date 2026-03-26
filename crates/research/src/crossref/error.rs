use thiserror::Error;

use crate::retry::RetryError;

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API error {status}: {message}")]
    Api { status: u16, message: String },

    #[error("Rate limited (429): retry after {retry_after}s")]
    RateLimited { retry_after: u64 },

    #[error("Deserialization error: {0}")]
    Json(#[from] serde_json::Error),
}

impl From<RetryError> for Error {
    fn from(e: RetryError) -> Self {
        match e {
            RetryError::Connection(inner) => Self::Http(inner),
            RetryError::Http { status, .. } if status == 429 => {
                Self::RateLimited { retry_after: 0 }
            }
            RetryError::Http { status, message } => Self::Api { status, message },
            RetryError::Exhausted => Self::Api {
                status: 503,
                message: "retries exhausted".into(),
            },
        }
    }
}

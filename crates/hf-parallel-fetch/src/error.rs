use thiserror::Error as ThisError;

#[derive(Debug, ThisError)]
pub enum Error {
    #[error("HTTP error for {repo}: {source}")]
    Http { repo: String, source: reqwest::Error },

    #[error("Rate limited (429). Retry after {retry_after_secs}s")]
    RateLimited { retry_after_secs: u64 },

    #[error("HF API returned {status} for {repo}: {body}")]
    Api { repo: String, status: u16, body: String },

    #[error("JSON decode error for {repo}: {source}")]
    Json { repo: String, source: serde_json::Error },

    #[error("Client build error: {0}")]
    ClientBuild(reqwest::Error),

    #[error("Invalid header value: {0}")]
    InvalidHeader(#[from] reqwest::header::InvalidHeaderValue),
}

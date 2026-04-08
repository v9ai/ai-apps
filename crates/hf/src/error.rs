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

    #[cfg(feature = "sqlite")]
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_rate_limited() {
        let err = Error::RateLimited { retry_after_secs: 30 };
        let msg = err.to_string();
        assert!(msg.contains("429"), "should mention 429: {msg}");
        assert!(msg.contains("30"), "should mention retry seconds: {msg}");
    }

    #[test]
    fn display_api() {
        let err = Error::Api {
            repo: "org/model".into(),
            status: 404,
            body: "not found".into(),
        };
        let msg = err.to_string();
        assert!(msg.contains("org/model"), "should contain repo: {msg}");
        assert!(msg.contains("404"), "should contain status: {msg}");
        assert!(msg.contains("not found"), "should contain body: {msg}");
    }
}

use thiserror::Error;

/// DashScope error response body.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ApiError {
    pub code: Option<String>,
    pub message: Option<String>,
    pub request_id: Option<String>,
}

#[derive(Debug, Error)]
pub enum Error {
    #[error("DashScope API error {status}: {}", error.message.as_deref().unwrap_or("(no message)"))]
    Api {
        status: reqwest::StatusCode,
        error: ApiError,
    },

    #[error("HTTP error {status}: {body}")]
    Http {
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_error_deserializes() {
        let json = r#"{"code":"InvalidApiKey","message":"Invalid API-key provided.","request_id":"abc-123"}"#;
        let e: ApiError = serde_json::from_str(json).unwrap();
        assert_eq!(e.code.as_deref(), Some("InvalidApiKey"));
        assert_eq!(e.message.as_deref(), Some("Invalid API-key provided."));
    }

    #[test]
    fn api_error_tolerates_missing_fields() {
        let e: ApiError = serde_json::from_str("{}").unwrap();
        assert!(e.code.is_none());
        assert!(e.message.is_none());
    }
}

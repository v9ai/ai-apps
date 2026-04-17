use thiserror::Error;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ApiError {
    pub code: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Error)]
pub enum Error {
    #[error("vLLM server unreachable at {url}")]
    ServerUnavailable { url: String },

    #[error("API error {status}: {}", error.message.as_deref().unwrap_or("(no message)"))]
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

    #[error("Extraction returned non-conforming JSON: {raw_output}")]
    ExtractionFailed { raw_output: String },

    #[cfg(feature = "screenshot")]
    #[error("Screenshot capture failed: {reason}")]
    Screenshot { reason: String },
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_error_deserializes() {
        let json = r#"{"code":"ModelNotFound","message":"Model not loaded."}"#;
        let e: ApiError = serde_json::from_str(json).unwrap();
        assert_eq!(e.code.as_deref(), Some("ModelNotFound"));
    }

    #[test]
    fn api_error_tolerates_missing_fields() {
        let e: ApiError = serde_json::from_str("{}").unwrap();
        assert!(e.code.is_none());
    }
}

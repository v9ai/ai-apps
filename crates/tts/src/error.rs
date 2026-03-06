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

    #[error("Free quota exhausted — enable paid usage in Model Studio to continue")]
    QuotaExhausted,

    #[error("HTTP error {status}: {body}")]
    Http {
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Base64 decode error: {0}")]
    Base64(#[from] base64::DecodeError),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

impl Error {
    /// Returns `true` if the DashScope free-tier quota is exhausted (403 / AllocationQuota.FreeTierOnly).
    pub fn is_quota_exhausted(&self) -> bool {
        matches!(self, Error::QuotaExhausted)
    }

    /// Returns `true` if the request was rate-limited (429).
    pub fn is_rate_limited(&self) -> bool {
        match self {
            Error::Api { status, .. } | Error::Http { status, .. } => *status == reqwest::StatusCode::TOO_MANY_REQUESTS,
            _ => false,
        }
    }

    /// Returns `true` if the error is likely transient and worth retrying
    /// (429 rate limit, 5xx server errors, or network errors).
    pub fn is_retryable(&self) -> bool {
        match self {
            Error::Api { status, .. } | Error::Http { status, .. } => {
                status.as_u16() == 429 || status.is_server_error()
            }
            Error::Network(_) => true,
            _ => false,
        }
    }
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
    fn quota_exhausted_detected() {
        let json = r#"{"code":"AllocationQuota.FreeTierOnly","message":"Free quota exhausted","request_id":"x"}"#;
        let e: ApiError = serde_json::from_str(json).unwrap();
        assert_eq!(e.code.as_deref(), Some("AllocationQuota.FreeTierOnly"));
    }

    #[test]
    fn is_quota_exhausted_helper() {
        assert!(Error::QuotaExhausted.is_quota_exhausted());
        let api_err = Error::Api {
            status: reqwest::StatusCode::BAD_REQUEST,
            error: ApiError { code: None, message: None, request_id: None },
        };
        assert!(!api_err.is_quota_exhausted());
    }

    #[test]
    fn api_error_tolerates_missing_fields() {
        let e: ApiError = serde_json::from_str("{}").unwrap();
        assert!(e.code.is_none());
        assert!(e.message.is_none());
    }
}

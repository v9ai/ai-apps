use thiserror::Error;

/// MuleRouter API error codes (1000-3999)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApiErrorCode {
    // 1000-1999: Creator account errors
    CreatorAccessDenied,
    InvalidOrExpiredToken,
    InsufficientCredits,
    // 2000-2999: Model-related errors
    ModelDoesNotExist,
    ModelUnsupportedOrUnavailable,
    ModelDoesNotSupportParameter,
    // 3000-3999: Async task errors
    TaskDoesNotExist,
    TaskExecutionFailed,
    TaskCancelledOrAborted,
    // Unknown
    Unknown(u32),
}

impl From<u32> for ApiErrorCode {
    fn from(code: u32) -> Self {
        match code {
            1000 => Self::CreatorAccessDenied,
            1001 => Self::InvalidOrExpiredToken,
            1002 => Self::InsufficientCredits,
            2000 => Self::ModelDoesNotExist,
            2001 => Self::ModelUnsupportedOrUnavailable,
            2002 => Self::ModelDoesNotSupportParameter,
            3000 => Self::TaskDoesNotExist,
            3001 => Self::TaskExecutionFailed,
            3002 => Self::TaskCancelledOrAborted,
            other => Self::Unknown(other),
        }
    }
}

/// RFC 9457 problem detail returned by the API on errors.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ApiProblem {
    pub status: Option<u16>,
    pub title: Option<String>,
    pub detail: Option<String>,
    #[serde(rename = "type")]
    pub problem_type: Option<String>,
    pub instance: Option<String>,
    pub code: Option<u32>,
}

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP error {status}: {}", problem.detail.as_deref().unwrap_or("(no detail)"))]
    Api {
        status: reqwest::StatusCode,
        problem: ApiProblem,
    },

    #[error("HTTP error {status}: {body}")]
    Http {
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("JSON deserialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Task failed: code={code:?}, title={title:?}, detail={detail:?}")]
    TaskFailed {
        code: Option<ApiErrorCode>,
        title: Option<String>,
        detail: Option<String>,
    },

    #[error("Poll timeout after {attempts} attempts")]
    PollTimeout { attempts: u32 },
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_error_code_maps_known_codes() {
        assert_eq!(ApiErrorCode::from(1000), ApiErrorCode::CreatorAccessDenied);
        assert_eq!(ApiErrorCode::from(1001), ApiErrorCode::InvalidOrExpiredToken);
        assert_eq!(ApiErrorCode::from(1002), ApiErrorCode::InsufficientCredits);
        assert_eq!(ApiErrorCode::from(2000), ApiErrorCode::ModelDoesNotExist);
        assert_eq!(ApiErrorCode::from(2001), ApiErrorCode::ModelUnsupportedOrUnavailable);
        assert_eq!(ApiErrorCode::from(2002), ApiErrorCode::ModelDoesNotSupportParameter);
        assert_eq!(ApiErrorCode::from(3000), ApiErrorCode::TaskDoesNotExist);
        assert_eq!(ApiErrorCode::from(3001), ApiErrorCode::TaskExecutionFailed);
        assert_eq!(ApiErrorCode::from(3002), ApiErrorCode::TaskCancelledOrAborted);
    }

    #[test]
    fn api_error_code_unknown_wraps_value() {
        assert_eq!(ApiErrorCode::from(9999), ApiErrorCode::Unknown(9999));
        assert_eq!(ApiErrorCode::from(0), ApiErrorCode::Unknown(0));
    }

    #[test]
    fn api_problem_deserializes_partial_json() {
        let json = r#"{"status":401,"title":"Unauthorized","detail":"The token is invalid or expired","code":1001}"#;
        let p: ApiProblem = serde_json::from_str(json).unwrap();
        assert_eq!(p.status, Some(401));
        assert_eq!(p.title.as_deref(), Some("Unauthorized"));
        assert_eq!(p.code, Some(1001));
    }

    #[test]
    fn api_problem_tolerates_missing_fields() {
        let p: ApiProblem = serde_json::from_str("{}").unwrap();
        assert!(p.status.is_none());
        assert!(p.title.is_none());
        assert!(p.code.is_none());
    }

    #[test]
    fn error_display_task_failed_shows_detail() {
        let err = Error::TaskFailed {
            code: Some(ApiErrorCode::TaskExecutionFailed),
            title: Some("Task failed".into()),
            detail: Some("out of memory".into()),
        };
        let msg = err.to_string();
        assert!(msg.contains("out of memory"), "got: {msg}");
    }

    #[test]
    fn error_display_poll_timeout() {
        let err = Error::PollTimeout { attempts: 10 };
        assert!(err.to_string().contains("10"));
    }
}

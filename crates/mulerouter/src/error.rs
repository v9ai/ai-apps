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

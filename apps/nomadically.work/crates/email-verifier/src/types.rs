use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationResult {
    Valid,
    Invalid,
    CatchAll,
    Unknown,
    Disposable,
    InvalidFormat,
}

impl VerificationResult {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Valid => "valid",
            Self::Invalid => "invalid",
            Self::CatchAll => "catchall",
            Self::Unknown => "unknown",
            Self::Disposable => "disposable",
            Self::InvalidFormat => "invalid_format",
        }
    }

    pub fn is_verified(&self) -> bool {
        matches!(self, Self::Valid | Self::CatchAll | Self::Unknown)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationFlag {
    HasDns,
    SmtpConnectable,
    CatchAll,
    RoleAddress,
    Disposable,
    Typo,
}

impl VerificationFlag {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::HasDns => "has_dns",
            Self::SmtpConnectable => "smtp_connectable",
            Self::CatchAll => "catch_all",
            Self::RoleAddress => "role_address",
            Self::Disposable => "disposable",
            Self::Typo => "typo",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationOutcome {
    pub status: String,
    pub result: String,
    pub flags: Vec<String>,
    pub suggested_correction: Option<String>,
    pub execution_time_ms: u64,
    pub verified: bool,
}

impl VerificationOutcome {
    pub fn new(
        result: VerificationResult,
        flags: Vec<VerificationFlag>,
        suggested_correction: Option<String>,
        execution_time_ms: u64,
    ) -> Self {
        let verified = result.is_verified();
        let result_str = result.as_str().to_string();
        let flag_strs = flags.iter().map(|f| f.as_str().to_string()).collect();
        Self {
            status: "success".to_string(),
            result: result_str,
            flags: flag_strs,
            suggested_correction,
            execution_time_ms,
            verified,
        }
    }

    pub fn error(message: &str, execution_time_ms: u64) -> Self {
        Self {
            status: format!("error_{message}"),
            result: "unknown".to_string(),
            flags: vec![],
            suggested_correction: None,
            execution_time_ms,
            verified: true,
        }
    }
}

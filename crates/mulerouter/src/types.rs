use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── Shared task types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Processing,
    Queued,
    Running,
    Completed,
    Succeeded,
    Failed,
}

impl TaskStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            Self::Completed | Self::Succeeded | Self::Failed
        )
    }

    pub fn is_success(&self) -> bool {
        matches!(self, Self::Completed | Self::Succeeded)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct TaskError {
    pub code: Option<u32>,
    pub title: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TaskInfo {
    pub id: Uuid,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub error: Option<TaskError>,
}

/// Wrapper returned by all async-create endpoints.
#[derive(Debug, Clone, Deserialize)]
pub struct TaskCreatedResponse {
    pub task_info: TaskInfo,
}

// ─── Image source (URL or base64) ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum ImageSource {
    Url(String),
    Base64(String),
}

impl ImageSource {
    pub fn url(u: impl Into<String>) -> Self {
        Self::Url(u.into())
    }

    /// Encode raw bytes to a base64 data-URI string.
    pub fn from_bytes(bytes: &[u8], mime: &str) -> Self {
        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        Self::Base64(format!("data:{mime};base64,{encoded}"))
    }
}

// ─── Qwen Image Max — generation ──────────────────────────────────────────────

/// Valid output sizes for Qwen Image Max.
#[derive(Debug, Clone, Serialize)]
pub enum QwenImageMaxSize {
    #[serde(rename = "1664*928")]
    W1664H928,
    #[serde(rename = "1440*1080")]
    W1440H1080,
    #[serde(rename = "1280*960")]
    W1280H960,
    #[serde(rename = "1152*864")]
    W1152H864,
    #[serde(rename = "1024*1024")]
    W1024H1024,
    #[serde(rename = "960*1280")]
    W960H1280,
    #[serde(rename = "864*1152")]
    W864H1152,
    #[serde(rename = "768*1024")]
    W768H1024,
    #[serde(rename = "720*1440")]
    W720H1440,
    #[serde(rename = "928*1664")]
    W928H1664,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct QwenImageMaxRequest {
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<QwenImageMaxSize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_extend: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<u32>,
}

impl QwenImageMaxRequest {
    pub fn new(prompt: impl Into<String>) -> Self {
        Self {
            prompt: prompt.into(),
            ..Default::default()
        }
    }
}

// ─── Qwen Image Edit Max — edit ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct QwenImageEditMaxRequest {
    pub images: Vec<ImageSource>,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    /// Custom resolution: e.g. "1024*1024". Each side must be 512-2048.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    /// Number of output images (1-6, default 1).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_extend: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<u32>,
}

impl QwenImageEditMaxRequest {
    pub fn new(images: Vec<ImageSource>, prompt: impl Into<String>) -> Self {
        Self {
            images,
            prompt: prompt.into(),
            negative_prompt: None,
            size: None,
            n: None,
            prompt_extend: None,
            seed: None,
        }
    }
}

// ─── Completed task result ─────────────────────────────────────────────────────

/// A completed task including its raw result payload.
#[derive(Debug, Clone, Deserialize)]
pub struct CompletedTask {
    pub task_info: TaskInfo,
    /// The full result JSON. Shape varies by endpoint — parse with
    /// `serde_json::from_value` into a model-specific type if needed.
    #[serde(flatten)]
    pub result: serde_json::Value,
}

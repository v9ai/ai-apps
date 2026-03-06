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
/// Exact values accepted by the API (16:9, 4:3, 1:1, 3:4, 9:16).
#[derive(Debug, Clone, Serialize)]
pub enum QwenImageMaxSize {
    /// 16:9 landscape
    #[serde(rename = "1664*928")]
    W1664H928,
    /// 4:3 landscape
    #[serde(rename = "1472*1104")]
    W1472H1104,
    /// 1:1 square
    #[serde(rename = "1328*1328")]
    W1328H1328,
    /// 3:4 portrait
    #[serde(rename = "1104*1472")]
    W1104H1472,
    /// 9:16 portrait
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

// ─── Chat completions (OpenAI-compatible) ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: "user".into(), content: content.into() }
    }
    pub fn system(content: impl Into<String>) -> Self {
        Self { role: "system".into(), content: content.into() }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
}

impl ChatRequest {
    pub fn new(model: impl Into<String>, messages: Vec<ChatMessage>) -> Self {
        Self { model: model.into(), messages, max_completion_tokens: None, temperature: None }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatChoice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<ChatChoice>,
}

impl ChatResponse {
    /// Text of the first choice, if present.
    pub fn text(&self) -> Option<&str> {
        self.choices.first().map(|c| c.message.content.as_str())
    }
}

// ─── Completed task result ────────────────────────────────────────────────────

/// A completed task including its raw result payload.
#[derive(Debug, Clone, Deserialize)]
pub struct CompletedTask {
    pub task_info: TaskInfo,
    /// The full result JSON. Shape varies by endpoint — parse with
    /// `serde_json::from_value` into a model-specific type if needed.
    #[serde(flatten)]
    pub result: serde_json::Value,
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── TaskStatus ──────────────────────────────────────────────────────────

    #[test]
    fn task_status_deserializes_all_variants() {
        let cases = [
            ("\"pending\"", TaskStatus::Pending),
            ("\"processing\"", TaskStatus::Processing),
            ("\"queued\"", TaskStatus::Queued),
            ("\"running\"", TaskStatus::Running),
            ("\"completed\"", TaskStatus::Completed),
            ("\"succeeded\"", TaskStatus::Succeeded),
            ("\"failed\"", TaskStatus::Failed),
        ];
        for (json, expected) in cases {
            let got: TaskStatus = serde_json::from_str(json)
                .unwrap_or_else(|_| panic!("failed to parse {json}"));
            assert_eq!(got, expected);
        }
    }

    #[test]
    fn task_status_is_terminal() {
        assert!(TaskStatus::Completed.is_terminal());
        assert!(TaskStatus::Succeeded.is_terminal());
        assert!(TaskStatus::Failed.is_terminal());
        assert!(!TaskStatus::Pending.is_terminal());
        assert!(!TaskStatus::Processing.is_terminal());
        assert!(!TaskStatus::Queued.is_terminal());
        assert!(!TaskStatus::Running.is_terminal());
    }

    #[test]
    fn task_status_is_success() {
        assert!(TaskStatus::Completed.is_success());
        assert!(TaskStatus::Succeeded.is_success());
        assert!(!TaskStatus::Failed.is_success());
        assert!(!TaskStatus::Pending.is_success());
    }

    // ── QwenImageMaxRequest serialization ───────────────────────────────────

    #[test]
    fn qwen_image_max_request_minimal_serializes_only_prompt() {
        let req = QwenImageMaxRequest::new("a red fox");
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["prompt"], "a red fox");
        assert!(v.get("negative_prompt").is_none());
        assert!(v.get("size").is_none());
        assert!(v.get("seed").is_none());
    }

    #[test]
    fn qwen_image_max_request_full_round_trips() {
        let req = QwenImageMaxRequest {
            prompt: "a blue whale".into(),
            negative_prompt: Some("blurry".into()),
            size: Some(QwenImageMaxSize::W1328H1328),
            prompt_extend: Some(false),
            seed: Some(42),
        };
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["prompt"], "a blue whale");
        assert_eq!(v["negative_prompt"], "blurry");
        assert_eq!(v["size"], "1328*1328");
        assert_eq!(v["prompt_extend"], false);
        assert_eq!(v["seed"], 42);
    }

    #[test]
    fn qwen_image_max_size_serializes_correctly() {
        let cases = [
            (QwenImageMaxSize::W1664H928, "1664*928"),
            (QwenImageMaxSize::W1328H1328, "1328*1328"),
            (QwenImageMaxSize::W928H1664, "928*1664"),
        ];
        for (size, expected) in cases {
            let s = serde_json::to_string(&size).unwrap();
            assert_eq!(s, format!("\"{expected}\""));
        }
    }

    // ── QwenImageEditMaxRequest serialization ────────────────────────────────

    #[test]
    fn qwen_image_edit_max_request_serializes_url_images() {
        let req = QwenImageEditMaxRequest::new(
            vec![ImageSource::url("https://example.com/img.png")],
            "add a hat",
        );
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["images"][0], "https://example.com/img.png");
        assert_eq!(v["prompt"], "add a hat");
    }

    #[test]
    fn qwen_image_edit_max_skips_none_fields() {
        let req = QwenImageEditMaxRequest::new(
            vec![ImageSource::url("https://example.com/img.png")],
            "make it darker",
        );
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert!(v.get("negative_prompt").is_none());
        assert!(v.get("size").is_none());
        assert!(v.get("n").is_none());
        assert!(v.get("seed").is_none());
    }

    // ── ImageSource ─────────────────────────────────────────────────────────

    #[test]
    fn image_source_url_serializes_as_plain_string() {
        let src = ImageSource::url("https://example.com/photo.jpg");
        let s = serde_json::to_string(&src).unwrap();
        assert_eq!(s, "\"https://example.com/photo.jpg\"");
    }

    #[test]
    fn image_source_from_bytes_produces_data_uri() {
        let bytes = b"fake-png-data";
        let src = ImageSource::from_bytes(bytes, "image/png");
        let ImageSource::Base64(s) = src else {
            panic!("expected Base64 variant");
        };
        assert!(s.starts_with("data:image/png;base64,"));
        // Verify the payload decodes back to the original bytes
        use base64::Engine;
        let payload = s.strip_prefix("data:image/png;base64,").unwrap();
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(payload)
            .unwrap();
        assert_eq!(decoded, bytes);
    }
}

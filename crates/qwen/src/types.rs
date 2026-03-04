use serde::{Deserialize, Serialize};

// ─── Embeddings (OpenAI-compatible) ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct EmbeddingRequest {
    pub model: String,
    pub input: EmbeddingInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encoding_format: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum EmbeddingInput {
    Single(String),
    Batch(Vec<String>),
}

impl EmbeddingRequest {
    pub fn new(input: impl Into<String>) -> Self {
        Self {
            model: "text-embedding-v4".into(),
            input: EmbeddingInput::Single(input.into()),
            dimensions: Some(1024),
            encoding_format: None,
        }
    }

    pub fn batch(inputs: Vec<String>) -> Self {
        Self {
            model: "text-embedding-v4".into(),
            input: EmbeddingInput::Batch(inputs),
            dimensions: Some(1024),
            encoding_format: None,
        }
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }

    pub fn with_dimensions(mut self, dims: u32) -> Self {
        self.dimensions = Some(dims);
        self
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmbeddingResponse {
    pub object: String,
    pub data: Vec<EmbeddingData>,
    pub model: String,
    pub usage: EmbeddingUsage,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmbeddingData {
    pub object: String,
    pub embedding: Vec<f32>,
    pub index: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmbeddingUsage {
    pub prompt_tokens: u32,
    pub total_tokens: u32,
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
    pub fn text(&self) -> Option<&str> {
        self.choices.first().map(|c| c.message.content.as_str())
    }
}

// ─── Unit tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedding_request_single_serializes() {
        let req = EmbeddingRequest::new("hello world");
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["model"], "text-embedding-v4");
        assert_eq!(v["input"], "hello world");
        assert_eq!(v["dimensions"], 1024);
    }

    #[test]
    fn embedding_request_batch_serializes() {
        let req = EmbeddingRequest::batch(vec!["a".into(), "b".into()]);
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["input"], serde_json::json!(["a", "b"]));
    }

    #[test]
    fn embedding_request_custom_dims() {
        let req = EmbeddingRequest::new("test").with_dimensions(512);
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["dimensions"], 512);
    }

    #[test]
    fn embedding_response_deserializes() {
        let json = r#"{
            "object": "list",
            "data": [{"object": "embedding", "embedding": [0.1, 0.2, 0.3], "index": 0}],
            "model": "text-embedding-v4",
            "usage": {"prompt_tokens": 5, "total_tokens": 5}
        }"#;
        let resp: EmbeddingResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.data.len(), 1);
        assert_eq!(resp.data[0].embedding.len(), 3);
        assert_eq!(resp.usage.prompt_tokens, 5);
    }

    #[test]
    fn chat_request_serializes() {
        let req = ChatRequest::new("qwen-plus", vec![ChatMessage::user("hi")]);
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["model"], "qwen-plus");
        assert!(v.get("max_completion_tokens").is_none());
    }
}

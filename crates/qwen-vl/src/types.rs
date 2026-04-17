use serde::{Deserialize, Serialize};

// ─── Multimodal message types (OpenAI vision format) ────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUrl {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VlMessage {
    pub role: String,
    pub content: VlContent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum VlContent {
    Text(String),
    Blocks(Vec<ContentBlock>),
}

impl VlMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".into(),
            content: VlContent::Text(content.into()),
        }
    }

    pub fn user_text(content: impl Into<String>) -> Self {
        Self {
            role: "user".into(),
            content: VlContent::Text(content.into()),
        }
    }

    pub fn user_blocks(blocks: Vec<ContentBlock>) -> Self {
        Self {
            role: "user".into(),
            content: VlContent::Blocks(blocks),
        }
    }
}

// ─── Request ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct VlChatRequest {
    pub model: String,
    pub messages: Vec<VlMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<ResponseFormat>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResponseFormat {
    pub r#type: String,
}

impl ResponseFormat {
    pub fn json_object() -> Self {
        Self {
            r#type: "json_object".into(),
        }
    }
}

// ─── Response ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct VlChatResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<VlChoice>,
    #[serde(default)]
    pub usage: Option<VlUsage>,
}

impl VlChatResponse {
    pub fn text(&self) -> Option<&str> {
        self.choices.first().map(|c| c.message.content.as_str())
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct VlChoice {
    pub index: u32,
    pub message: VlChoiceMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VlChoiceMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VlUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_block_text_serializes() {
        let block = ContentBlock::Text {
            text: "hello".into(),
        };
        let v: serde_json::Value = serde_json::to_value(&block).unwrap();
        assert_eq!(v["type"], "text");
        assert_eq!(v["text"], "hello");
    }

    #[test]
    fn content_block_image_serializes() {
        let block = ContentBlock::ImageUrl {
            image_url: ImageUrl {
                url: "data:image/png;base64,abc".into(),
                detail: Some("high".into()),
            },
        };
        let v: serde_json::Value = serde_json::to_value(&block).unwrap();
        assert_eq!(v["type"], "image_url");
        assert_eq!(v["image_url"]["url"], "data:image/png;base64,abc");
        assert_eq!(v["image_url"]["detail"], "high");
    }

    #[test]
    fn vl_content_text_serializes_as_string() {
        let msg = VlMessage::system("you are helpful");
        let v: serde_json::Value = serde_json::to_value(&msg).unwrap();
        assert_eq!(v["content"], "you are helpful");
    }

    #[test]
    fn vl_content_blocks_serializes_as_array() {
        let msg = VlMessage::user_blocks(vec![ContentBlock::Text {
            text: "extract".into(),
        }]);
        let v: serde_json::Value = serde_json::to_value(&msg).unwrap();
        assert!(v["content"].is_array());
    }

    #[test]
    fn response_format_json_object() {
        let rf = ResponseFormat::json_object();
        let v: serde_json::Value = serde_json::to_value(&rf).unwrap();
        assert_eq!(v["type"], "json_object");
    }

    #[test]
    fn chat_response_deserializes() {
        let json = r#"{
            "id": "chat-123",
            "model": "Qwen3-VL-2B-Instruct",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "{\"name\": \"Acme\"}"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}
        }"#;
        let resp: VlChatResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.text().unwrap(), r#"{"name": "Acme"}"#);
        assert_eq!(resp.usage.unwrap().total_tokens, 120);
    }
}

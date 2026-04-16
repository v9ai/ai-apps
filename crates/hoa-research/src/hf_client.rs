//! Remote LLM client — DeepSeek API (OpenAI-compatible).
//!
//! Uses api.deepseek.com with deepseek-chat (V3).
//! Cheap, fast, no monthly credit limits.

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::{PipelineError, Result};

const API_BASE: &str = "https://api.deepseek.com";
const DEFAULT_MODEL: &str = "deepseek-chat";

#[derive(Debug, Clone)]
pub struct HfClient {
    client: Client,
    model: String,
    token: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: usize,
    temperature: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct ChatChoiceMessage {
    content: Option<String>,
}

impl HfClient {
    /// Create a new DeepSeek client.
    pub async fn new(token: &str) -> Option<Self> {
        if token.is_empty() {
            return None;
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .ok()?;

        let model = DEFAULT_MODEL.to_string();
        tracing::info!("Remote LLM: DeepSeek {model}");

        Some(Self {
            client,
            model,
            token: token.to_string(),
        })
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }

    /// Chat completion via DeepSeek API.
    pub async fn chat(
        &self,
        system: &str,
        user: &str,
        max_tokens: usize,
    ) -> Result<String> {
        let request = ChatRequest {
            model: self.model.clone(),
            messages: vec![
                ChatMessage {
                    role: "system".into(),
                    content: system.into(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: user.into(),
                },
            ],
            max_tokens,
            temperature: 0.2,
        };

        let url = format!("{API_BASE}/chat/completions");

        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.token)
            .json(&request)
            .send()
            .await
            .map_err(PipelineError::Http)?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(PipelineError::Other(format!(
                "DeepSeek API {status}: {}",
                &body[..body.len().min(200)]
            )));
        }

        let chat_resp: ChatResponse = resp.json().await.map_err(PipelineError::Http)?;

        chat_resp
            .choices
            .first()
            .and_then(|c| c.message.content.clone())
            .ok_or_else(|| PipelineError::Other("Empty DeepSeek response".into()))
    }
}

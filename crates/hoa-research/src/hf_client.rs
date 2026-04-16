//! HuggingFace free serverless Inference API client.
//!
//! Uses api-inference.huggingface.co (free, rate-limited, no credits).
//! No provider discovery needed — hits the model endpoint directly.

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::{PipelineError, Result};

const DEFAULT_MODEL: &str = "Qwen/Qwen2.5-72B-Instruct";

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
    /// Create a new HF client using the free serverless API.
    pub async fn new(token: &str) -> Option<Self> {
        if token.is_empty() {
            return None;
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .ok()?;

        let model = DEFAULT_MODEL.to_string();
        tracing::info!("HF serverless (free): {model}");

        Some(Self {
            client,
            model,
            token: token.to_string(),
        })
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }

    /// Chat completion via the free serverless Inference API.
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

        let url = format!(
            "https://api-inference.huggingface.co/models/{}/v1/chat/completions",
            self.model
        );

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
                "HF API {status}: {}",
                &body[..body.len().min(200)]
            )));
        }

        let chat_resp: ChatResponse = resp.json().await.map_err(PipelineError::Http)?;

        chat_resp
            .choices
            .first()
            .and_then(|c| c.message.content.clone())
            .ok_or_else(|| PipelineError::Other("Empty HF response".into()))
    }
}

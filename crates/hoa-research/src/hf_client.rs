//! HuggingFace Inference API client for remote 72B model.
//!
//! Used for synthesis-heavy agents (Phase 2) that don't need tool calling.
//! Supports concurrent requests via tokio — multiple agents run in parallel.

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::{PipelineError, Result};

const DEFAULT_MODEL: &str = "Qwen/Qwen2.5-72B-Instruct";
const HF_API_URL: &str = "https://api-inference.huggingface.co/models";

#[derive(Debug, Clone)]
pub struct HfClient {
    client: Client,
    model: String,
    token: String,
}

#[derive(Debug, Serialize)]
struct HfRequest {
    model: String,
    messages: Vec<HfMessage>,
    max_tokens: usize,
    temperature: f32,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct HfMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct HfResponse {
    choices: Vec<HfChoice>,
}

#[derive(Debug, Deserialize)]
struct HfChoice {
    message: HfChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct HfChoiceMessage {
    content: Option<String>,
}

impl HfClient {
    pub fn new(token: &str) -> Option<Self> {
        if token.is_empty() {
            return None;
        }
        Some(Self {
            client: Client::new(),
            model: DEFAULT_MODEL.to_string(),
            token: token.to_string(),
        })
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }

    /// Chat completion via HF Inference API.
    pub async fn chat(
        &self,
        system: &str,
        user: &str,
        max_tokens: usize,
    ) -> Result<String> {
        let messages = vec![
            HfMessage {
                role: "system".into(),
                content: system.into(),
            },
            HfMessage {
                role: "user".into(),
                content: user.into(),
            },
        ];

        let request = HfRequest {
            model: self.model.clone(),
            messages,
            max_tokens,
            temperature: 0.2,
            stream: false,
        };

        let url = format!("{}/{}/v1/chat/completions", HF_API_URL, self.model);

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
                "HF API {status}: {body}"
            )));
        }

        let hf_resp: HfResponse = resp.json().await.map_err(PipelineError::Http)?;

        hf_resp
            .choices
            .first()
            .and_then(|c| c.message.content.clone())
            .ok_or_else(|| PipelineError::Other("Empty HF response".into()))
    }
}

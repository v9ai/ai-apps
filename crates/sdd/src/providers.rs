//! Provider adapters — wrap non-DeepSeek clients behind the `LlmClient` trait.
//!
//! The SDD pipeline uses DeepSeek's chat types as its canonical wire format.
//! This module provides adapters that convert between type systems so any
//! provider can power the pipeline.

use async_trait::async_trait;

use crate::error::{Result, SddError};
use crate::traits::LlmClient;
use crate::types::{ChatContent, ChatMessage, ChatRequest, ChatResponse, Choice, UsageInfo};

// ── DeepSeek adapter ─────────────────────────────────────────────────────

/// LlmClient adapter that wraps a `DeepSeekClient<ReqwestClient>`.
/// Since SDD's ChatRequest/ChatResponse ARE deepseek types, this is a direct passthrough.
pub struct DeepSeekLlmClient {
    client: deepseek::client::DeepSeekClient<deepseek::reqwest_client::ReqwestClient>,
}

impl DeepSeekLlmClient {
    pub fn new(client: deepseek::client::DeepSeekClient<deepseek::reqwest_client::ReqwestClient>) -> Self {
        Self { client }
    }

    pub fn from_env() -> anyhow::Result<Self> {
        let client = deepseek::reqwest_client::client_from_env()?;
        Ok(Self { client })
    }
}

#[async_trait]
impl LlmClient for DeepSeekLlmClient {
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse> {
        self.client.chat(request).await.map_err(|e| SddError::Llm(e.to_string()))
    }
}

/// LlmClient adapter that wraps a `qwen::Client` and converts between
/// DeepSeek and Qwen type systems.
pub struct QwenLlmClient {
    client: qwen::Client,
}

impl QwenLlmClient {
    pub fn new(client: qwen::Client) -> Self {
        Self { client }
    }

    pub fn from_api_key(api_key: impl Into<String>) -> Self {
        Self { client: qwen::Client::new(api_key) }
    }
}

#[async_trait]
impl LlmClient for QwenLlmClient {
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse> {
        // Convert deepseek::ChatRequest → qwen::ChatRequest
        let qwen_messages: Vec<qwen::ChatMessage> = request
            .messages
            .iter()
            .map(|m| qwen::ChatMessage {
                role: m.role.clone(),
                content: m.content.as_str().to_string(),
            })
            .collect();

        let mut qwen_req = qwen::ChatRequest::new(&request.model, qwen_messages);
        qwen_req.temperature = request.temperature.map(|t| t as f32);
        qwen_req.max_completion_tokens = request.max_tokens;

        // Call Qwen API
        let qwen_resp = self
            .client
            .chat(qwen_req)
            .await
            .map_err(|e| SddError::Llm(format!("Qwen: {e}")))?;

        // Convert qwen::ChatResponse → deepseek::ChatResponse
        let choices: Vec<Choice> = qwen_resp
            .choices
            .into_iter()
            .map(|c| Choice {
                index: c.index,
                message: ChatMessage {
                    role: c.message.role,
                    content: ChatContent::Text(c.message.content),
                    reasoning_content: None,
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                },
                finish_reason: c.finish_reason,
            })
            .collect();

        let usage = qwen_resp.usage.map(|u| UsageInfo {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        });

        Ok(ChatResponse {
            id: qwen_resp.id,
            choices,
            usage,
        })
    }
}

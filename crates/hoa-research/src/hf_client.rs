//! HuggingFace Inference API client for remote 72B model.
//!
//! Discovers the inference provider via HF's model API, then routes
//! requests through router.huggingface.co. Supports concurrent requests.

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::{PipelineError, Result};

const DEFAULT_MODEL: &str = "Qwen/Qwen2.5-72B-Instruct";

#[derive(Debug, Clone)]
pub struct HfClient {
    client: Client,
    /// Model ID as seen by the provider (e.g. "qwen/qwen-2.5-72b-instruct")
    provider_model_id: String,
    token: String,
    /// Full route prefix (e.g. "novita/v3/openai")
    provider_route: String,
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

/// Model API response for provider discovery.
#[derive(Debug, Deserialize)]
struct ModelInfo {
    #[serde(rename = "inferenceProviderMapping")]
    inference_provider_mapping: Option<serde_json::Value>,
}

impl HfClient {
    /// Create a new HF client. Discovers the inference provider at init time.
    pub async fn new(token: &str) -> Option<Self> {
        if token.is_empty() {
            return None;
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .ok()?;

        // Discover provider route + provider-side model ID
        let (provider_route, provider_model_id) =
            discover_provider(&client, token, DEFAULT_MODEL)
                .await
                .unwrap_or_else(|e| {
                    tracing::warn!("HF provider discovery failed: {e}, using fallback");
                    ("novita/v3/openai".to_string(), DEFAULT_MODEL.to_string())
                });

        tracing::info!("HF route: {provider_route} | model: {provider_model_id}");

        Some(Self {
            client,
            provider_model_id,
            token: token.to_string(),
            provider_route,
        })
    }

    pub fn model_name(&self) -> &str {
        &self.provider_model_id
    }

    /// Chat completion via HF router.
    pub async fn chat(
        &self,
        system: &str,
        user: &str,
        max_tokens: usize,
    ) -> Result<String> {
        let request = ChatRequest {
            model: self.provider_model_id.clone(),
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
            "https://router.huggingface.co/{}/chat/completions",
            self.provider_route
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

/// Discover the inference provider for a model via HF API.
/// Returns (route_prefix, provider_model_id).
async fn discover_provider(
    client: &Client,
    token: &str,
    model: &str,
) -> Result<(String, String)> {
    let url = format!(
        "https://huggingface.co/api/models/{model}?expand=inferenceProviderMapping"
    );

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(PipelineError::Http)?;

    if !resp.status().is_success() {
        return Err(PipelineError::Other(format!(
            "Model API {}: {}",
            resp.status(),
            model
        )));
    }

    let info: ModelInfo = resp.json().await.map_err(PipelineError::Http)?;

    // Extract provider. Prefer "novita" (matches Python client), fallback to first "live".
    if let Some(mapping) = info.inference_provider_mapping {
        if let Some(obj) = mapping.as_object() {
            // Prefer novita
            let preferred = ["novita", "featherless-ai"];
            for pref in &preferred {
                if let Some(details) = obj.get(*pref) {
                    let status = details
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if status == "live" {
                        let provider_id = details
                            .get("providerId")
                            .and_then(|v| v.as_str())
                            .unwrap_or(model);
                        // Route: {provider}/v3/openai
                        let route = format!("{pref}/v3/openai");
                        tracing::info!("Provider: {pref} → model: {provider_id}");
                        return Ok((route, provider_id.to_string()));
                    }
                }
            }

            // Fallback: first live provider
            for (provider, details) in obj {
                let provider_id = details
                    .get("providerId")
                    .and_then(|v| v.as_str())
                    .unwrap_or(model);
                let route = format!("{provider}/v3/openai");
                tracing::info!("Provider (fallback): {provider} → model: {provider_id}");
                return Ok((route, provider_id.to_string()));
            }
        }
    }

    Err(PipelineError::Other("No inference provider found".into()))
}

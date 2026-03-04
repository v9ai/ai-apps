use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tracing::debug;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com/v1";
const MODEL: &str = "deepseek-reasoner";

pub struct DeepSeekClient {
    client: reqwest::Client,
    api_key: String,
    /// Base URL, e.g. "https://api.deepseek.com/v1".
    /// Overridable for tests via [`DeepSeekClient::new`].
    base_url: String,
}

impl DeepSeekClient {
    /// Production constructor — reads `DEEPSEEK_API_KEY` (and optionally
    /// `DEEPSEEK_BASE_URL`) from the environment.
    pub fn from_env() -> Result<Self> {
        let api_key = std::env::var("DEEPSEEK_API_KEY")
            .context("DEEPSEEK_API_KEY environment variable not set")?;
        let base_url = std::env::var("DEEPSEEK_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
        Ok(Self::new(api_key, base_url))
    }

    /// Explicit constructor — use in tests to point at a mock server.
    pub fn new(api_key: impl Into<String>, base_url: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key: api_key.into(),
            base_url: base_url.into(),
        }
    }

    /// Returns (reasoning_content, final_content).
    pub async fn reason(&self, system: &str, user: &str) -> Result<ReasonerOutput> {
        let url = format!("{}/chat/completions", self.base_url);

        let body = ChatRequest {
            model: MODEL.to_string(),
            messages: vec![
                Message { role: "system".into(), content: system.into() },
                Message { role: "user".into(),   content: user.into() },
            ],
            max_tokens: 8192,
            temperature: 0.6,
        };

        debug!("deepseek-reasoner call: system={:.80}…", system);

        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .context("DeepSeek API request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("DeepSeek API error {}: {}", status, text);
        }

        let chat_resp: ChatResponse = resp
            .json()
            .await
            .context("Failed to parse DeepSeek response")?;

        let choice = chat_resp.choices.into_iter().next()
            .context("No choices in DeepSeek response")?;

        Ok(ReasonerOutput {
            reasoning: choice.message.reasoning_content.unwrap_or_default(),
            content:   choice.message.content,
        })
    }
}

pub struct ReasonerOutput {
    /// R1 chain-of-thought — logged at DEBUG, not passed to next agent.
    pub reasoning: String,
    /// Final answer — passed forward in the pipeline.
    pub content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: AssistantMessage,
}

#[derive(Deserialize)]
struct AssistantMessage {
    content: String,
    reasoning_content: Option<String>,
}

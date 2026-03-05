use anyhow::{Context, Result};
use tracing::debug;

use deepseek::{ChatRequest, DeepSeekClient, ReqwestClient, DEFAULT_BASE_URL};

const MODEL: &str = "deepseek-reasoner";

pub struct ReasonerOutput {
    /// R1 chain-of-thought — logged at DEBUG, not passed to next agent.
    pub reasoning: String,
    /// Final answer — passed forward in the pipeline.
    pub content: String,
}

/// Production constructor — reads `DEEPSEEK_API_KEY` (and optionally
/// `DEEPSEEK_BASE_URL`) from the environment.
pub fn client_from_env() -> Result<DeepSeekClient<ReqwestClient>> {
    let api_key = std::env::var("DEEPSEEK_API_KEY")
        .context("DEEPSEEK_API_KEY environment variable not set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    Ok(DeepSeekClient::new(ReqwestClient::new(), api_key).with_base_url(base_url))
}

/// Thin wrapper that builds a ChatRequest for deepseek-reasoner and calls `client.chat()`.
pub async fn reason(
    client: &DeepSeekClient<ReqwestClient>,
    system: &str,
    user: &str,
) -> Result<ReasonerOutput> {
    debug!("deepseek-reasoner call: system={:.80}…", system);

    let request = ChatRequest {
        model: MODEL.to_string(),
        messages: vec![
            deepseek::system_msg(system),
            deepseek::user_msg(user),
        ],
        tools: None,
        tool_choice: None,
        temperature: Some(0.6),
        max_tokens: Some(8192),
        stream: Some(false),
    };

    let resp = client
        .chat(&request)
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    let choice = resp
        .choices
        .into_iter()
        .next()
        .context("No choices in DeepSeek response")?;

    Ok(ReasonerOutput {
        reasoning: choice.message.reasoning_content.unwrap_or_default(),
        content: choice.message.content.as_str().to_string(),
    })
}

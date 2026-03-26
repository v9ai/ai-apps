//! LLM provider abstraction and agent builder helpers.
//!
//! Re-exports the DeepSeek agent framework ([`Tool`], [`AgentBuilder`], etc.)
//! and adds [`LlmProvider`] to switch between DeepSeek and Qwen backends.

pub use deepseek::agent::{AgentBuilder, DeepSeekAgent, Tool, ToolDefinition};
pub use deepseek::{HttpClient, ReqwestClient};

/// Which LLM backend to use for agent loops.
#[derive(Clone, Debug)]
pub enum LlmProvider {
    /// DeepSeek API with a custom base URL.
    DeepSeek { api_key: String, base_url: String },
    /// Qwen via DashScope's OpenAI-compatible endpoint.
    Qwen { api_key: String, model: String },
}

/// Create an [`AgentBuilder`] for the DeepSeek API.
pub fn agent_builder(api_key: &str, model: &str) -> AgentBuilder<ReqwestClient> {
    AgentBuilder::new(ReqwestClient::new(), api_key, model)
}

/// Create an [`AgentBuilder`] targeting DashScope's OpenAI-compatible endpoint.
pub fn qwen_agent_builder(api_key: &str, model: &str) -> AgentBuilder<ReqwestClient> {
    AgentBuilder::new(ReqwestClient::new(), api_key, model)
        .base_url("https://dashscope-intl.aliyuncs.com/compatible-mode")
}

/// Create an [`AgentBuilder`] from any [`LlmProvider`].
pub fn provider_agent_builder(provider: &LlmProvider) -> AgentBuilder<ReqwestClient> {
    match provider {
        LlmProvider::DeepSeek { api_key, base_url } => {
            agent_builder(api_key, "deepseek-chat").base_url(base_url)
        }
        LlmProvider::Qwen { api_key, model } => qwen_agent_builder(api_key, model),
    }
}

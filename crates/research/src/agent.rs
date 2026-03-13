pub use deepseek::agent::{Tool, ToolDefinition, AgentBuilder, DeepSeekAgent};
pub use deepseek::{ReqwestClient, HttpClient};

/// Which LLM backend to use for agent loops.
#[derive(Clone, Debug)]
pub enum LlmProvider {
    DeepSeek { api_key: String, base_url: String },
    Qwen { api_key: String, model: String },
}

/// Convenience constructor matching the old `Client::new(api_key).agent(model)` pattern.
pub fn agent_builder(api_key: &str, model: &str) -> AgentBuilder<ReqwestClient> {
    AgentBuilder::new(ReqwestClient::new(), api_key, model)
}

/// Build an agent targeting DashScope's OpenAI-compatible endpoint.
pub fn qwen_agent_builder(api_key: &str, model: &str) -> AgentBuilder<ReqwestClient> {
    AgentBuilder::new(ReqwestClient::new(), api_key, model)
        .base_url("https://dashscope-intl.aliyuncs.com/compatible-mode")
}

/// Build an agent from any provider.
pub fn provider_agent_builder(provider: &LlmProvider) -> AgentBuilder<ReqwestClient> {
    match provider {
        LlmProvider::DeepSeek { api_key, base_url } => {
            agent_builder(api_key, "deepseek-chat").base_url(base_url)
        }
        LlmProvider::Qwen { api_key, model } => {
            qwen_agent_builder(api_key, model)
        }
    }
}

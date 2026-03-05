pub use deepseek::agent::{Tool, ToolDefinition, AgentBuilder, DeepSeekAgent};
pub use deepseek::{ReqwestClient, HttpClient};

/// Convenience constructor matching the old `Client::new(api_key).agent(model)` pattern.
pub fn agent_builder(api_key: &str, model: &str) -> AgentBuilder<ReqwestClient> {
    AgentBuilder::new(ReqwestClient::new(), api_key, model)
}

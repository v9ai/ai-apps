use async_trait::async_trait;

use crate::error::Result;
use crate::types::*;

/// Runtime-agnostic LLM client. CF Workers implement with `worker::Fetch`,
/// CLI/server implement with `reqwest`, tests implement with mock responses.
#[async_trait]
pub trait LlmClient: Send + Sync {
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse>;
}

/// Persistence for SDD changes. CF Workers implement with D1,
/// CLI implements with filesystem, tests implement with in-memory HashMap.
#[async_trait]
pub trait ChangeStore: Send + Sync {
    async fn save(&self, change: &SddChange) -> Result<()>;
    async fn load(&self, name: &str) -> Result<Option<SddChange>>;
    async fn list(&self) -> Result<Vec<SddChange>>;
}

/// Session persistence. CF Workers implement with D1,
/// CLI implements with filesystem, tests implement with in-memory.
#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn create(&self, agent_name: &str, model: &DeepSeekModel) -> Result<Session>;
    async fn load(&self, id: &str) -> Result<Option<Session>>;
    async fn update(&self, session: &Session) -> Result<()>;
    async fn fork(&self, parent_id: &str) -> Result<Option<Session>>;
}

/// Platform services abstraction. Each runtime provides its own
/// implementation for time and ID generation.
pub trait Platform: Send + Sync {
    fn now_iso(&self) -> String;
    fn generate_id(&self, prefix: &str) -> String;
}

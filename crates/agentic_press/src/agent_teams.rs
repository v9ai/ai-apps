use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info};

use deepseek::{DeepSeekClient, ReqwestClient};

pub struct Agent {
    pub name: String,
    system_prompt: String,
    client: Arc<DeepSeekClient<ReqwestClient>>,
}

impl Agent {
    pub fn new(
        name: impl Into<String>,
        system_prompt: impl Into<String>,
        client: Arc<DeepSeekClient<ReqwestClient>>,
    ) -> Self {
        Self {
            name: name.into(),
            system_prompt: system_prompt.into(),
            client,
        }
    }

    pub async fn run(&self, input: &str) -> Result<String> {
        info!("[{}] starting…", self.name);

        let output = deepseek::reason_with_retry(&self.client, &self.system_prompt, input).await?;

        if !output.reasoning.is_empty() {
            debug!(
                "[{}] reasoning ({} chars): {}…",
                self.name,
                output.reasoning.len(),
                &output.reasoning[..output.reasoning.len().min(200)]
            );
        }

        info!("[{}] done ({} chars)", self.name, output.content.len());
        Ok(output.content)
    }
}

/// Run two agents concurrently with the same input (Writer + LinkedIn phase).
pub async fn run_parallel(
    a: &Agent,
    b: &Agent,
    input: &str,
) -> Result<(String, String)> {
    info!("Running [{}] and [{}] in parallel…", a.name, b.name);
    tokio::try_join!(a.run(input), b.run(input))
}

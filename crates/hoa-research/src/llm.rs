//! Local LLM inference via mistral.rs (Qwen2.5-7B-Instruct Q4_K_M GGUF on Metal).
//!
//! mistral.rs wraps the loaded model in an `Arc<MistralRs>` and accepts concurrent
//! `&self` chat requests, so a single `LocalLlm` is cheaply shareable via `Arc<_>`
//! across tokio tasks and the internal scheduler handles continuous batching.

use mistralrs::{
    GgufModelBuilder, Model, RequestBuilder, SamplingParams, TextMessageRole,
};

use crate::error::{PipelineError, Result};

const DEFAULT_REPO: &str = "bartowski/Qwen2.5-7B-Instruct-GGUF";
const DEFAULT_FILE: &str = "Qwen2.5-7B-Instruct-Q4_K_M.gguf";
const TOKENIZER_REPO: &str = "Qwen/Qwen2.5-7B-Instruct";

pub struct LocalLlm {
    model: Model,
    pub model_name: String,
}

impl LocalLlm {
    pub async fn load_default() -> Result<Self> {
        Self::load(DEFAULT_REPO, DEFAULT_FILE).await
    }

    pub async fn load(repo_id: &str, filename: &str) -> Result<Self> {
        tracing::info!("Loading {repo_id}/{filename} via mistral.rs...");

        let model = GgufModelBuilder::new(repo_id, vec![filename])
            .with_tok_model_id(TOKENIZER_REPO)
            .with_logging()
            .build()
            .await
            .map_err(|e| PipelineError::Other(format!("mistralrs build: {e}")))?;

        tracing::info!("LLM loaded: {repo_id}/{filename}");
        Ok(Self {
            model,
            model_name: filename.to_string(),
        })
    }

    /// Generate a response given system + user prompts.
    pub async fn chat(&self, system: &str, user: &str, max_tokens: usize) -> Result<String> {
        let request = RequestBuilder::new()
            .add_message(TextMessageRole::System, system)
            .add_message(TextMessageRole::User, user)
            .set_sampling(SamplingParams {
                max_len: Some(max_tokens),
                temperature: Some(0.2),
                ..SamplingParams::deterministic()
            });

        let response = self
            .model
            .send_chat_request(request)
            .await
            .map_err(|e| PipelineError::Other(format!("mistralrs chat: {e}")))?;

        response
            .choices
            .into_iter()
            .next()
            .and_then(|c| c.message.content)
            .ok_or_else(|| PipelineError::Other("empty mistralrs response".into()))
    }
}

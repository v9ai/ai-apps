use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::crawler::Fetcher;
use crate::db::Db;
use crate::email::mx::MxChecker;
use crate::llm::LlmClient;
use crate::scoring::IcpProfile;

/// Boxed, pinned, `Send` future returned by [`PipelineStage::execute`].
///
/// Using an explicit `Pin<Box<dyn Future>>` instead of `impl Future` in the
/// trait method keeps `PipelineStage` dyn-compatible, which is required for
/// `Box<dyn PipelineStage>` inside [`PipelineRunner`].
pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// Shared resources available to every pipeline stage.
pub struct PipelineContext {
    pub db: Db,
    pub llm: LlmClient,
    pub fetcher: Fetcher,
    pub mx_checker: MxChecker,
    pub icp: IcpProfile,
    pub search_index: tantivy::Index,
    pub config: PipelineConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub batch_size: usize,
    pub max_concurrent: usize,
    pub retry_count: u32,
    pub stage_timeout_secs: u64,
}

impl Default for PipelineConfig {
    fn default() -> Self {
        Self {
            batch_size: 50,
            max_concurrent: 4,
            retry_count: 2,
            stage_timeout_secs: 300,
        }
    }
}

/// Input/output envelope for a single pipeline stage.
#[derive(Debug, Clone)]
pub enum StageInput {
    Domains(Vec<String>),
    CompanyIds(Vec<String>),
    ContactIds(Vec<String>),
    Empty,
}

/// Output of a single pipeline stage.
#[derive(Debug, Clone)]
pub struct StageOutput {
    pub input_count: usize,
    pub output_count: usize,
    pub error_count: usize,
    pub signals: Vec<EvalSignal>,
    pub next_input: StageInput,
    pub duration: Duration,
}

/// A signal emitted during stage execution for the eval framework.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalSignal {
    pub stage_name: String,
    pub metric_name: String,
    pub value: f64,
    pub timestamp: String,
}

/// The core pipeline stage trait.
///
/// The `execute` method returns a `BoxFuture` rather than `impl Future` so
/// that `PipelineStage` remains dyn-compatible and can be stored as
/// `Box<dyn PipelineStage>` inside [`PipelineRunner`].
///
/// Implementors should box their async block:
/// ```rust,ignore
/// fn execute<'a>(&'a self, ctx: &'a PipelineContext, input: StageInput)
///     -> BoxFuture<'a, Result<StageOutput>>
/// {
///     Box::pin(async move { /* ... */ })
/// }
/// ```
pub trait PipelineStage: Send + Sync {
    /// Human-readable name for logging and eval signals.
    fn name(&self) -> &str;

    /// Execute the stage. Must be idempotent for retry safety.
    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>>;
}

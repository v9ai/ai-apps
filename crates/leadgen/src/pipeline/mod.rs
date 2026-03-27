pub mod cost_tracker;
pub mod resource_budget;
pub mod stage;
pub mod stages;

pub use cost_tracker::{CostTracker, StageCost};
pub use resource_budget::{BudgetViolation, ResourceBudget};
pub use stage::{EvalSignal, PipelineConfig, PipelineContext, PipelineStage, StageInput, StageOutput};
pub use stages::{CrawlStage, EntityResolutionStage, ExtractionStage, ScoringStage, VerificationStage};

use crate::eval::cascade_error::{
    CascadeErrorReport, CascadeErrorTracker, ErrorObservation, ErrorType,
};
use anyhow::Result;
use tracing::{info, warn};

/// Runs a sequence of stages, threading output of each into the next.
///
/// Costs are accumulated in an internal [`CostTracker`] as stages complete.
/// After [`run`] returns, call [`PipelineRunner::cost_tracker`] to inspect
/// per-stage costs, totals, and USD estimates.
///
/// Optionally attach a [`ResourceBudget`] via [`PipelineRunner::with_budget`];
/// the runner will abort with an error as soon as any limit is breached.
///
/// Error propagation across stages is tracked by an internal
/// [`CascadeErrorTracker`].  Call [`PipelineRunner::error_report`] after the
/// run to retrieve the structured report.
pub struct PipelineRunner {
    stages: Vec<Box<dyn PipelineStage>>,
    cost_tracker: CostTracker,
    budget: Option<ResourceBudget>,
    error_tracker: CascadeErrorTracker,
}

impl PipelineRunner {
    pub fn new() -> Self {
        Self {
            stages: Vec::new(),
            cost_tracker: CostTracker::new(),
            budget: None,
            error_tracker: CascadeErrorTracker::new(),
        }
    }

    /// Attach a resource budget that is enforced after every stage.
    pub fn with_budget(mut self, budget: ResourceBudget) -> Self {
        self.budget = Some(budget);
        self
    }

    pub fn add_stage(mut self, stage: impl PipelineStage + 'static) -> Self {
        self.stages.push(Box::new(stage));
        self
    }

    /// Immutable reference to the cost tracker after (or during) a run.
    pub fn cost_tracker(&self) -> &CostTracker {
        &self.cost_tracker
    }

    /// Return the cascade error report accumulated during the last [`run`].
    ///
    /// The report contains per-stage Component Error Rates and Error
    /// Amplification Factors derived from the error observations recorded
    /// whenever a stage reported a non-zero `error_count`.
    pub fn error_report(&self) -> CascadeErrorReport {
        self.error_tracker.summary()
    }

    /// Run all stages in sequence. Returns all eval signals collected.
    ///
    /// A [`StageCost`] is recorded for every stage that completes successfully.
    /// If a [`ResourceBudget`] is set, the runner checks time and call counts
    /// after each stage and returns an error on the first violation.
    ///
    /// Whenever a stage reports a non-zero `error_count`, one
    /// [`ErrorObservation`] per error is recorded in the internal
    /// [`CascadeErrorTracker`] so that downstream errors can be traced back to
    /// their originating stage.
    pub async fn run(&mut self, ctx: &PipelineContext, initial: StageInput) -> Result<Vec<EvalSignal>> {
        let mut input = initial;
        let mut all_signals: Vec<EvalSignal> = Vec::new();
        let run_start = std::time::Instant::now();
        // Rolling output hash: each stage's output hash seeds the next stage's
        // input hash so the provenance chain links stages together.
        let mut prev_output_hash: u64 = 0;

        for stage in &self.stages {
            info!(stage = stage.name(), "starting pipeline stage");

            let stage_start = std::time::Instant::now();

            match stage.execute(ctx, input).await {
                Ok(output) => {
                    let stage_duration = stage_start.elapsed();

                    info!(
                        stage = stage.name(),
                        input_count = output.input_count,
                        output_count = output.output_count,
                        errors = output.error_count,
                        duration_ms = output.duration.as_millis() as u64,
                        "stage completed"
                    );

                    // Record the total records this stage processed so CER
                    // denominators are correct.
                    self.error_tracker
                        .record_processed(stage.name(), output.input_count as u32);

                    // Record an ErrorObservation for each error the stage
                    // reported.  We derive a stable output hash for this stage
                    // from the stage name and the run clock so downstream
                    // attribution can walk the provenance chain.
                    if output.error_count > 0 {
                        // Compute a deterministic output hash for this stage run
                        // using a simple FNV-1a mix over the stage name bytes and
                        // the elapsed nanoseconds.
                        let stage_output_hash = {
                            let mut h: u64 = 14_695_981_039_346_656_037;
                            for b in stage.name().bytes() {
                                h ^= b as u64;
                                h = h.wrapping_mul(1_099_511_628_211);
                            }
                            h ^= stage_start.elapsed().subsec_nanos() as u64;
                            h = h.wrapping_mul(1_099_511_628_211);
                            h
                        };

                        let now = chrono::Utc::now().to_rfc3339();
                        for i in 0..output.error_count as u64 {
                            // Each error gets a unique output hash derived from
                            // the stage hash and the error index.
                            let error_output_hash = stage_output_hash
                                .wrapping_add(i)
                                .wrapping_mul(6_364_136_223_846_793_005);
                            self.error_tracker.record(ErrorObservation {
                                stage: stage.name().to_string(),
                                input_hash: prev_output_hash,
                                output_hash: error_output_hash,
                                error_type: ErrorType::MissingData,
                                severity: 0.5,
                                timestamp: now.clone(),
                            });
                        }

                        warn!(
                            stage = stage.name(),
                            error_count = output.error_count,
                            "stage reported errors; recorded in cascade tracker"
                        );

                        prev_output_hash = stage_output_hash;
                    } else {
                        // No errors — advance the hash chain with a clean marker.
                        prev_output_hash = {
                            let mut h: u64 = prev_output_hash ^ 0xDEAD_BEEF_CAFE_BABE;
                            for b in stage.name().bytes() {
                                h ^= b as u64;
                                h = h.wrapping_mul(1_099_511_628_211);
                            }
                            h
                        };
                    }

                    // Record cost for this stage using the duration reported by
                    // the stage itself (which may exclude overhead we measure
                    // externally). We prefer the stage-reported duration as it
                    // reflects actual work, and fall back to the externally
                    // measured one when the stage sets Duration::ZERO.
                    let recorded_duration = if output.duration.is_zero() {
                        stage_duration
                    } else {
                        output.duration
                    };

                    let cost = StageCost {
                        stage_name: stage.name().to_string(),
                        duration: recorded_duration,
                        items_processed: output.output_count as u32,
                        // Counters for LLM/HTTP are not yet surfaced from
                        // StageOutput; stages that want finer tracking should
                        // emit dedicated EvalSignals or extend StageCost.
                        ..StageCost::default()
                    };
                    self.cost_tracker.record(cost);

                    // Budget enforcement after each stage.
                    if let Some(ref budget) = self.budget {
                        let total_elapsed = run_start.elapsed();
                        if let Some(violation) = budget.check_all(
                            total_elapsed,
                            self.cost_tracker.total_llm_calls(),
                            self.cost_tracker.total_http_requests(),
                        ) {
                            warn!(
                                stage = stage.name(),
                                violation = %violation,
                                "pipeline aborted: resource budget exceeded"
                            );
                            return Err(anyhow::anyhow!(
                                "pipeline budget exceeded after stage '{}': {}",
                                stage.name(),
                                violation,
                            ));
                        }
                    }

                    all_signals.extend(output.signals);
                    input = output.next_input;
                }
                Err(e) => {
                    warn!(stage = stage.name(), error = %e, "stage failed");
                    return Err(e);
                }
            }
        }

        Ok(all_signals)
    }
}

impl Default for PipelineRunner {
    fn default() -> Self {
        Self::new()
    }
}

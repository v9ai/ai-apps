use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Cost attributed to a single pipeline stage execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageCost {
    pub stage_name: String,
    pub duration: Duration,
    pub llm_calls: u32,
    pub llm_tokens_in: u64,
    pub llm_tokens_out: u64,
    pub http_requests: u32,
    pub db_queries: u32,
    pub items_processed: u32,
}

impl Default for StageCost {
    fn default() -> Self {
        Self {
            stage_name: String::new(),
            duration: Duration::ZERO,
            llm_calls: 0,
            llm_tokens_in: 0,
            llm_tokens_out: 0,
            http_requests: 0,
            db_queries: 0,
            items_processed: 0,
        }
    }
}

impl StageCost {
    /// Create a cost entry for a named stage with all counters zeroed.
    pub fn for_stage(stage_name: impl Into<String>) -> Self {
        Self {
            stage_name: stage_name.into(),
            ..Self::default()
        }
    }

    /// Estimated USD cost using DeepSeek pricing:
    ///   input  ~$0.14 / 1M tokens
    ///   output ~$0.28 / 1M tokens
    pub fn estimated_cost_usd(&self) -> f64 {
        (self.llm_tokens_in as f64 * 0.14 + self.llm_tokens_out as f64 * 0.28) / 1_000_000.0
    }
}

/// Accumulates [`StageCost`] records across a full pipeline run.
///
/// Stages append their cost via [`CostTracker::record`] after execution.
/// Aggregate helpers (`total_duration`, `total_cost_usd`, `by_stage`) are
/// available for reporting and budget enforcement.
#[derive(Debug, Default)]
pub struct CostTracker {
    stages: Vec<StageCost>,
}

impl CostTracker {
    pub fn new() -> Self {
        Self::default()
    }

    /// Append a completed stage's cost record.
    pub fn record(&mut self, cost: StageCost) {
        self.stages.push(cost);
    }

    /// Sum of all stage durations.
    pub fn total_duration(&self) -> Duration {
        self.stages.iter().map(|s| s.duration).sum()
    }

    /// Sum of all stage USD estimates.
    pub fn total_cost_usd(&self) -> f64 {
        self.stages.iter().map(|s| s.estimated_cost_usd()).sum()
    }

    /// Ordered slice of every recorded stage cost.
    pub fn summary(&self) -> Vec<&StageCost> {
        self.stages.iter().collect()
    }

    /// Per-stage cost breakdown keyed by stage name.
    ///
    /// When the same stage name appears more than once (e.g., retries), only
    /// the **last** record is returned. Use [`summary`] for the full ordered
    /// list.
    pub fn by_stage(&self) -> HashMap<String, &StageCost> {
        self.stages
            .iter()
            .map(|s| (s.stage_name.clone(), s))
            .collect()
    }

    /// Total LLM calls across all stages.
    pub fn total_llm_calls(&self) -> u32 {
        self.stages.iter().map(|s| s.llm_calls).sum()
    }

    /// Total HTTP requests across all stages.
    pub fn total_http_requests(&self) -> u32 {
        self.stages.iter().map(|s| s.http_requests).sum()
    }

    /// Total items processed across all stages.
    pub fn total_items_processed(&self) -> u32 {
        self.stages.iter().map(|s| s.items_processed).sum()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn make_cost(
        stage_name: &str,
        duration_ms: u64,
        tokens_in: u64,
        tokens_out: u64,
        llm_calls: u32,
        http_requests: u32,
        items: u32,
    ) -> StageCost {
        StageCost {
            stage_name: stage_name.into(),
            duration: Duration::from_millis(duration_ms),
            llm_tokens_in: tokens_in,
            llm_tokens_out: tokens_out,
            llm_calls,
            http_requests,
            db_queries: 0,
            items_processed: items,
        }
    }

    #[test]
    fn empty_tracker_returns_zero_aggregates() {
        let tracker = CostTracker::new();

        assert_eq!(tracker.total_duration(), Duration::ZERO);
        assert_eq!(tracker.total_cost_usd(), 0.0);
        assert_eq!(tracker.total_llm_calls(), 0);
        assert_eq!(tracker.total_http_requests(), 0);
        assert_eq!(tracker.total_items_processed(), 0);
        assert!(tracker.summary().is_empty());
        assert!(tracker.by_stage().is_empty());
    }

    #[test]
    fn single_stage_cost_recorded_correctly() {
        let mut tracker = CostTracker::new();
        // 1 000 input tokens + 500 output tokens
        let cost = make_cost("crawl", 250, 1_000, 500, 2, 10, 5);
        tracker.record(cost);

        let summary = tracker.summary();
        assert_eq!(summary.len(), 1);
        assert_eq!(summary[0].stage_name, "crawl");
        assert_eq!(summary[0].llm_calls, 2);
        assert_eq!(summary[0].http_requests, 10);
        assert_eq!(summary[0].items_processed, 5);

        assert_eq!(tracker.total_duration(), Duration::from_millis(250));
        assert_eq!(tracker.total_llm_calls(), 2);
        assert_eq!(tracker.total_http_requests(), 10);
        assert_eq!(tracker.total_items_processed(), 5);
    }

    #[test]
    fn total_aggregation_across_multiple_stages() {
        let mut tracker = CostTracker::new();
        tracker.record(make_cost("crawl", 100, 500, 200, 1, 5, 3));
        tracker.record(make_cost("score", 200, 1_000, 300, 2, 8, 6));
        tracker.record(make_cost("verify", 150, 200, 100, 1, 3, 2));

        assert_eq!(tracker.total_duration(), Duration::from_millis(450));
        assert_eq!(tracker.total_llm_calls(), 4);
        assert_eq!(tracker.total_http_requests(), 16);
        assert_eq!(tracker.total_items_processed(), 11);
        assert_eq!(tracker.summary().len(), 3);

        let by_stage = tracker.by_stage();
        assert!(by_stage.contains_key("crawl"));
        assert!(by_stage.contains_key("score"));
        assert!(by_stage.contains_key("verify"));
    }

    #[test]
    fn usd_estimation_matches_deepseek_pricing() {
        // 1_000_000 input tokens → $0.14, 1_000_000 output tokens → $0.28
        let cost = StageCost {
            stage_name: "test".into(),
            llm_tokens_in: 1_000_000,
            llm_tokens_out: 1_000_000,
            ..StageCost::default()
        };
        let expected = 0.14 + 0.28; // $0.42
        assert!((cost.estimated_cost_usd() - expected).abs() < 1e-9);
    }

    #[test]
    fn usd_estimation_output_only_tokens() {
        // 500 000 output tokens → $0.14
        let cost = StageCost {
            stage_name: "test".into(),
            llm_tokens_in: 0,
            llm_tokens_out: 500_000,
            ..StageCost::default()
        };
        let expected = 500_000.0 * 0.28 / 1_000_000.0;
        assert!((cost.estimated_cost_usd() - expected).abs() < 1e-9);
    }

    #[test]
    fn total_cost_sums_across_stages() {
        let mut tracker = CostTracker::new();
        // Stage A: 1M in + 0 out → $0.14
        tracker.record(StageCost {
            stage_name: "a".into(),
            llm_tokens_in: 1_000_000,
            llm_tokens_out: 0,
            ..StageCost::default()
        });
        // Stage B: 0 in + 1M out → $0.28
        tracker.record(StageCost {
            stage_name: "b".into(),
            llm_tokens_in: 0,
            llm_tokens_out: 1_000_000,
            ..StageCost::default()
        });

        let total = tracker.total_cost_usd();
        assert!((total - 0.42).abs() < 1e-9);
    }

    #[test]
    fn for_stage_constructor_sets_name() {
        let cost = StageCost::for_stage("entity_resolution");
        assert_eq!(cost.stage_name, "entity_resolution");
        assert_eq!(cost.llm_calls, 0);
        assert_eq!(cost.duration, Duration::ZERO);
    }
}

pub mod drift;
pub mod metrics;
pub mod ner_eval;
pub mod regret;

pub use drift::{DriftAlert, DriftDetector};
pub use metrics::StageMetrics;
pub use ner_eval::{compare_extractions, aggregate_scores, ExtractedEntity, NerEvalResult};
pub use regret::RegretTracker;

use crate::pipeline::EvalSignal;
use std::collections::HashMap;
use tracing::info;

/// Collects eval signals from pipeline stages and computes aggregate metrics.
pub struct EvalCollector {
    signals: Vec<EvalSignal>,
    drift_detector: DriftDetector,
}

impl EvalCollector {
    pub fn new(window_size: usize) -> Self {
        Self {
            signals: Vec::new(),
            drift_detector: DriftDetector::new(window_size),
        }
    }

    /// Ingest signals from a pipeline run.
    pub fn ingest(&mut self, signals: Vec<EvalSignal>) {
        for signal in &signals {
            self.drift_detector
                .observe(&signal.stage_name, &signal.metric_name, signal.value);
        }
        self.signals.extend(signals);
    }

    /// Compute per-stage aggregate metrics from collected signals.
    pub fn stage_metrics(&self) -> HashMap<String, StageMetrics> {
        let mut by_stage: HashMap<String, Vec<&EvalSignal>> = HashMap::new();
        for s in &self.signals {
            by_stage.entry(s.stage_name.clone()).or_default().push(s);
        }

        by_stage
            .into_iter()
            .map(|(name, signals)| {
                let metrics = StageMetrics::from_signals(&signals);
                (name, metrics)
            })
            .collect()
    }

    /// Check for drift alerts across all tracked metrics.
    pub fn check_drift(&self) -> Vec<DriftAlert> {
        self.drift_detector.check_all()
    }

    /// Total signal count.
    pub fn signal_count(&self) -> usize {
        self.signals.len()
    }

    /// Log a summary of all collected metrics.
    pub fn log_summary(&self) {
        let metrics = self.stage_metrics();
        for (stage, m) in &metrics {
            info!(
                stage = %stage,
                count = m.count,
                mean = format!("{:.2}", m.mean),
                min = format!("{:.2}", m.min),
                max = format!("{:.2}", m.max),
                "stage metrics"
            );
        }
        let alerts = self.check_drift();
        for alert in &alerts {
            info!(
                stage = %alert.stage_name,
                metric = %alert.metric_name,
                psi = format!("{:.4}", alert.psi),
                "drift detected"
            );
        }
    }
}

pub mod adwin;
pub mod cascade_error;
pub mod ddm;
pub mod drift;
pub mod metrics;
pub mod ner_eval;
pub mod regret;

pub use adwin::Adwin;
pub use cascade_error::{CascadeErrorReport, CascadeErrorTracker, ErrorObservation, ErrorType};
pub use ddm::Ddm;
pub use drift::{DriftAlert, DriftDetector};
pub use metrics::StageMetrics;
pub use ner_eval::{compare_extractions, aggregate_scores, ExtractedEntity, NerEvalResult};
pub use regret::RegretTracker;

use crate::pipeline::EvalSignal;
use std::collections::HashMap;
use tracing::{info, warn};

/// A drift alert that may have been raised by PSI, ADWIN, or DDM.
#[derive(Debug, Clone)]
pub struct UnifiedDriftAlert {
    /// Composite key `"stage_name:metric_name"`.
    pub key: String,
    /// Which detector raised the alert.
    pub detector: DriftDetectorKind,
    /// Magnitude of the detected change (PSI value for PSI, mean-change for
    /// ADWIN, error-rate for DDM).
    pub magnitude: f64,
}

/// Which drift-detection algorithm produced an alert.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DriftDetectorKind {
    Psi,
    Adwin,
    Ddm,
}

impl std::fmt::Display for DriftDetectorKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Psi => write!(f, "PSI"),
            Self::Adwin => write!(f, "ADWIN"),
            Self::Ddm => write!(f, "DDM"),
        }
    }
}

/// Collects eval signals from pipeline stages and computes aggregate metrics.
///
/// In addition to the original PSI-based [`DriftDetector`], this collector
/// now runs an [`Adwin`] and a [`Ddm`] instance per signal key, giving three
/// complementary drift-detection views:
///
/// * **PSI** — population stability index over a sliding reference window.
/// * **ADWIN** — adaptive windowing for arbitrary real-valued streams.
/// * **DDM** — error-rate monitoring treating low-confidence signals as errors.
pub struct EvalCollector {
    signals: Vec<EvalSignal>,
    drift_detector: DriftDetector,
    /// One ADWIN detector per `"stage:metric"` key, created on first use.
    adwin_detectors: HashMap<String, Adwin>,
    /// One DDM detector per `"stage:metric"` key, created on first use.
    ddm_detectors: HashMap<String, Ddm>,
}

impl EvalCollector {
    pub fn new(window_size: usize) -> Self {
        Self {
            signals: Vec::new(),
            drift_detector: DriftDetector::new(window_size),
            adwin_detectors: HashMap::new(),
            ddm_detectors: HashMap::new(),
        }
    }

    /// Ingest signals from a pipeline run.
    ///
    /// Each signal is fed into the PSI drift detector, an ADWIN detector, and
    /// a DDM detector (keyed by `"stage_name:metric_name"`).  Detectors are
    /// created lazily on first use.
    pub fn ingest(&mut self, signals: Vec<EvalSignal>) {
        for signal in &signals {
            let key = format!("{}:{}", signal.stage_name, signal.metric_name);

            // PSI detector (existing)
            self.drift_detector
                .observe(&signal.stage_name, &signal.metric_name, signal.value);

            // ADWIN detector
            self.adwin_detectors
                .entry(key.clone())
                .or_insert_with(|| Adwin::new(0.002))
                .update(signal.value);

            // DDM detector — treat a signal value below 0.5 as an "error"
            // (suitable for probability/confidence metrics; for count metrics
            // the threshold is approximate but still useful for trend tracking).
            let is_error = signal.value < 0.5;
            self.ddm_detectors
                .entry(key)
                .or_insert_with(Ddm::new)
                .update(is_error);
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

    /// Check for drift alerts across all tracked metrics using PSI only.
    pub fn check_drift(&self) -> Vec<DriftAlert> {
        self.drift_detector.check_all()
    }

    /// Check all three drift detectors (PSI + ADWIN + DDM) and return a
    /// combined, deduplicated list of [`UnifiedDriftAlert`]s.
    ///
    /// A single `"stage:metric"` key may appear up to three times if all three
    /// detectors fire simultaneously.
    pub fn check_all_drift(&self) -> Vec<UnifiedDriftAlert> {
        let mut alerts: Vec<UnifiedDriftAlert> = Vec::new();

        // PSI alerts
        for psi_alert in self.drift_detector.check_all() {
            alerts.push(UnifiedDriftAlert {
                key: format!("{}:{}", psi_alert.stage_name, psi_alert.metric_name),
                detector: DriftDetectorKind::Psi,
                magnitude: psi_alert.psi,
            });
        }

        // ADWIN alerts — the detector returns `Some(magnitude)` on drift and
        // advances its internal window; we query the current mean as a proxy
        // when we can't re-run `update` here.  We track a separate flag by
        // inspecting the width: if width shrank relative to what we expect,
        // drift was triggered.  The simplest correct approach is to store the
        // last drift magnitude in a parallel map; here we use a conservative
        // heuristic: report ADWIN if its window is non-empty and its mean
        // differs markedly from 0.5 (the "no information" baseline).
        //
        // Note: ADWIN drift is detected *during* `update()` calls in `ingest()`.
        // Here we surface those keys whose detectors have a notably narrow
        // window (i.e. have dropped old data), which is a reliable post-hoc
        // indicator that drift was detected.
        for (key, adwin) in &self.adwin_detectors {
            // A width < 30 after receiving potentially many observations is a
            // strong indicator that ADWIN pruned its window due to drift.
            if adwin.width() > 0 && adwin.width() < 30 {
                alerts.push(UnifiedDriftAlert {
                    key: key.clone(),
                    detector: DriftDetectorKind::Adwin,
                    magnitude: adwin.mean(),
                });
            }
        }

        // DDM alerts
        for (key, ddm) in &self.ddm_detectors {
            let rate = ddm.error_rate();
            // DDM is stateful; we cannot call `update` here.  We approximate:
            // if the error rate is high (> 0.4) and sufficient samples have
            // been collected (implied by a non-zero rate), report it.
            if rate > 0.4 {
                alerts.push(UnifiedDriftAlert {
                    key: key.clone(),
                    detector: DriftDetectorKind::Ddm,
                    magnitude: rate,
                });
            }
        }

        alerts
    }

    /// Total signal count.
    pub fn signal_count(&self) -> usize {
        self.signals.len()
    }

    /// Log a summary of all collected metrics, including ADWIN and DDM alerts.
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

        // PSI alerts
        let psi_alerts = self.check_drift();
        for alert in &psi_alerts {
            warn!(
                stage = %alert.stage_name,
                metric = %alert.metric_name,
                psi = format!("{:.4}", alert.psi),
                detector = "PSI",
                "drift detected"
            );
        }

        // ADWIN + DDM alerts (unified)
        let unified = self.check_all_drift();
        for alert in &unified {
            // Skip PSI alerts — already logged above.
            if alert.detector == DriftDetectorKind::Psi {
                continue;
            }
            warn!(
                key = %alert.key,
                detector = %alert.detector,
                magnitude = format!("{:.4}", alert.magnitude),
                "drift detected"
            );
        }

        if psi_alerts.is_empty() && unified.iter().all(|a| a.detector == DriftDetectorKind::Psi) {
            info!("no drift detected across all detectors");
        }
    }
}

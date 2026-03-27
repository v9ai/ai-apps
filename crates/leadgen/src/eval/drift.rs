use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Alert emitted when population stability index exceeds threshold.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftAlert {
    pub stage_name: String,
    pub metric_name: String,
    pub psi: f64,
    pub threshold: f64,
}

/// Tracks feature distributions over sliding windows and detects drift via PSI.
pub struct DriftDetector {
    window_size: usize,
    threshold: f64,
    /// Key: "stage:metric", Value: sliding window of observations.
    windows: HashMap<String, Vec<f64>>,
}

impl DriftDetector {
    pub fn new(window_size: usize) -> Self {
        Self {
            window_size,
            threshold: 0.25,
            windows: HashMap::new(),
        }
    }

    pub fn with_threshold(mut self, threshold: f64) -> Self {
        self.threshold = threshold;
        self
    }

    /// Record a new observation for a stage/metric pair.
    pub fn observe(&mut self, stage: &str, metric: &str, value: f64) {
        let key = format!("{stage}:{metric}");
        let window = self.windows.entry(key).or_default();
        window.push(value);
        // Keep at most 2x window_size (reference + current)
        if window.len() > self.window_size * 2 {
            window.drain(..window.len() - self.window_size * 2);
        }
    }

    /// Check all tracked metrics for drift.
    pub fn check_all(&self) -> Vec<DriftAlert> {
        let mut alerts = Vec::new();

        for (key, window) in &self.windows {
            if window.len() < self.window_size * 2 {
                continue; // Not enough data for reference + current comparison
            }

            let mid = window.len() - self.window_size;
            let reference = &window[..mid];
            let current = &window[mid..];

            let psi = compute_psi(reference, current, 10);
            if psi > self.threshold {
                let parts: Vec<&str> = key.splitn(2, ':').collect();
                alerts.push(DriftAlert {
                    stage_name: parts.first().unwrap_or(&"").to_string(),
                    metric_name: parts.get(1).unwrap_or(&"").to_string(),
                    psi,
                    threshold: self.threshold,
                });
            }
        }

        alerts
    }
}

/// Compute Population Stability Index between two distributions.
///
/// Bins the values into `n_bins` equal-width buckets and computes:
/// PSI = sum (p_i - q_i) * ln(p_i / q_i)
///
/// PSI < 0.10: no significant change
/// PSI 0.10-0.25: moderate change
/// PSI > 0.25: significant drift
fn compute_psi(reference: &[f64], current: &[f64], n_bins: usize) -> f64 {
    if reference.is_empty() || current.is_empty() || n_bins == 0 {
        return 0.0;
    }

    let all: Vec<f64> = reference.iter().chain(current.iter()).copied().collect();
    let min_val = all.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_val = all.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    if (max_val - min_val).abs() < f64::EPSILON {
        return 0.0; // All values identical
    }

    let bin_width = (max_val - min_val) / n_bins as f64;
    let eps = 1e-4; // Avoid log(0)

    let ref_bins = bin_values(reference, min_val, bin_width, n_bins);
    let cur_bins = bin_values(current, min_val, bin_width, n_bins);

    let ref_total = reference.len() as f64;
    let cur_total = current.len() as f64;

    let mut psi = 0.0;
    for i in 0..n_bins {
        let p = (ref_bins[i] as f64 / ref_total).max(eps);
        let q = (cur_bins[i] as f64 / cur_total).max(eps);
        psi += (q - p) * (q / p).ln();
    }

    psi.max(0.0)
}

fn bin_values(values: &[f64], min_val: f64, bin_width: f64, n_bins: usize) -> Vec<usize> {
    let mut bins = vec![0usize; n_bins];
    for &v in values {
        let idx = ((v - min_val) / bin_width).floor() as usize;
        let idx = idx.min(n_bins - 1);
        bins[idx] += 1;
    }
    bins
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_distributions_zero_psi() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let psi = compute_psi(&data, &data, 5);
        assert!(psi < 0.01, "identical distributions should have ~0 PSI: {psi}");
    }

    #[test]
    fn shifted_distribution_high_psi() {
        let ref_data: Vec<f64> = (0..100).map(|i| i as f64).collect();
        let cur_data: Vec<f64> = (50..150).map(|i| i as f64).collect();
        let psi = compute_psi(&ref_data, &cur_data, 10);
        assert!(psi > 0.1, "shifted distribution should have high PSI: {psi}");
    }

    #[test]
    fn empty_data_zero_psi() {
        assert_eq!(compute_psi(&[], &[1.0], 5), 0.0);
        assert_eq!(compute_psi(&[1.0], &[], 5), 0.0);
    }

    #[test]
    fn detector_alerts_on_drift() {
        let mut d = DriftDetector::new(5).with_threshold(0.1);
        // Reference window: low values
        for i in 0..5 {
            d.observe("crawl", "pages", i as f64);
        }
        // Current window: high values (drift!)
        for i in 50..55 {
            d.observe("crawl", "pages", i as f64);
        }
        let alerts = d.check_all();
        assert!(!alerts.is_empty(), "should detect drift");
    }

    #[test]
    fn detector_no_alert_when_stable() {
        let mut d = DriftDetector::new(5).with_threshold(0.25);
        for i in 0..10 {
            d.observe("crawl", "pages", (i % 5) as f64);
        }
        let alerts = d.check_all();
        assert!(alerts.is_empty(), "stable data should not alert");
    }
}

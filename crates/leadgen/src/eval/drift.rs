use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

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

// ---------------------------------------------------------------------------
// ICP score drift detection (KS-statistic based)
// ---------------------------------------------------------------------------

/// Basic distribution statistics used for drift reporting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistStats {
    pub mean: f64,
    pub std: f64,
    pub p50: f64,
    pub p90: f64,
}

impl DistStats {
    fn from_slice(values: &[f64]) -> Self {
        let n = values.len();
        if n == 0 {
            return Self { mean: 0.0, std: 0.0, p50: 0.0, p90: 0.0 };
        }
        let mean = values.iter().sum::<f64>() / n as f64;
        let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n as f64;
        let std = variance.sqrt();

        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        Self {
            mean,
            std,
            p50: percentile_sorted_ks(&sorted, 50.0),
            p90: percentile_sorted_ks(&sorted, 90.0),
        }
    }
}

/// Linear-interpolation percentile on a sorted slice (local copy for drift module).
fn percentile_sorted_ks(sorted: &[f64], p: f64) -> f64 {
    let n = sorted.len();
    if n == 1 {
        return sorted[0];
    }
    let rank = p / 100.0 * (n - 1) as f64;
    let lo = rank.floor() as usize;
    let hi = rank.ceil() as usize;
    let frac = rank - lo as f64;
    sorted[lo] + frac * (sorted[hi] - sorted[lo])
}

/// Alert emitted when the KS statistic between the reference and current
/// ICP score windows exceeds the configured threshold.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpDriftAlert {
    pub ks_statistic: f64,
    pub reference_mean: f64,
    pub current_mean: f64,
    pub detected_at: String,
}

/// Monitors ICP score distribution shift using a rolling window and a
/// simplified KS statistic (max |CDF_current(x) - CDF_ref(x)| evaluated at
/// a fixed set of percentile points).
pub struct IcpScoreDriftDetector {
    reference_stats: Option<DistStats>,
    /// Reference window snapshot used for CDF comparison.
    reference_window: Vec<f64>,
    current_window: VecDeque<f64>,
    window_size: usize,
    drift_threshold: f64,
}

impl IcpScoreDriftDetector {
    pub fn new(window_size: usize) -> Self {
        Self {
            reference_stats: None,
            reference_window: Vec::new(),
            current_window: VecDeque::new(),
            window_size,
            drift_threshold: 0.15,
        }
    }

    pub fn with_drift_threshold(mut self, threshold: f64) -> Self {
        self.drift_threshold = threshold;
        self
    }

    /// Add a new ICP score observation.
    ///
    /// - If the window is now full for the first time (reference not yet set),
    ///   the current window is captured as the reference baseline.
    /// - On subsequent full-window observations, the KS statistic is computed
    ///   against the reference. If it exceeds `drift_threshold`, a
    ///   [`IcpDriftAlert`] is returned.
    pub fn observe(&mut self, score: f64) -> Option<IcpDriftAlert> {
        if self.current_window.len() == self.window_size {
            self.current_window.pop_front();
        }
        self.current_window.push_back(score);

        if self.current_window.len() < self.window_size {
            return None;
        }

        // Initialise reference on first full window.
        if self.reference_stats.is_none() {
            self.set_reference_from_current();
            return None;
        }

        // Compare current window against reference.
        let current_vec: Vec<f64> = self.current_window.iter().copied().collect();
        let ks = ks_statistic(&self.reference_window, &current_vec);

        if ks > self.drift_threshold {
            let ref_mean = self.reference_stats.as_ref().map(|s| s.mean).unwrap_or(0.0);
            let cur_mean = current_vec.iter().sum::<f64>() / current_vec.len() as f64;
            Some(IcpDriftAlert {
                ks_statistic: ks,
                reference_mean: ref_mean,
                current_mean: cur_mean,
                detected_at: chrono_now(),
            })
        } else {
            None
        }
    }

    /// Replace the reference baseline with the current window contents.
    /// Call this after a model update to avoid spurious alerts.
    pub fn reset_reference(&mut self) {
        if !self.current_window.is_empty() {
            self.set_reference_from_current();
        }
    }

    fn set_reference_from_current(&mut self) {
        let v: Vec<f64> = self.current_window.iter().copied().collect();
        self.reference_stats = Some(DistStats::from_slice(&v));
        self.reference_window = v;
    }
}

/// Simplified two-sample KS statistic.
///
/// Evaluates |CDF_a(x) - CDF_b(x)| at each unique value in the union of
/// both samples and returns the maximum.
fn ks_statistic(a: &[f64], b: &[f64]) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }

    // Collect all unique evaluation points.
    let mut points: Vec<f64> = a.iter().chain(b.iter()).copied().collect();
    points.sort_by(|x, y| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal));
    points.dedup_by(|x, y| (x - *y).abs() < f64::EPSILON);

    let mut sorted_a = a.to_vec();
    let mut sorted_b = b.to_vec();
    sorted_a.sort_by(|x, y| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal));
    sorted_b.sort_by(|x, y| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal));

    let n_a = sorted_a.len() as f64;
    let n_b = sorted_b.len() as f64;

    let cdf = |sorted: &[f64], x: f64| -> f64 {
        let pos = sorted.partition_point(|&v| v <= x);
        pos as f64 / sorted.len() as f64
    };

    points
        .iter()
        .map(|&x| (cdf(&sorted_a, x) - cdf(&sorted_b, x)).abs())
        .fold(0.0_f64, f64::max)
}

/// Returns the current UTC time as an ISO-8601 string (seconds precision).
/// Falls back to a placeholder when the system clock is unavailable.
fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Format as a minimal ISO-8601 datetime without pulling in chrono.
    let (y, mo, d, h, mi, s) = epoch_to_datetime(secs);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{mi:02}:{s:02}Z")
}

fn epoch_to_datetime(secs: u64) -> (u64, u64, u64, u64, u64, u64) {
    let s = secs % 60;
    let total_min = secs / 60;
    let mi = total_min % 60;
    let total_h = total_min / 60;
    let h = total_h % 24;
    let mut days = total_h / 24;

    // Days since 1970-01-01 → calendar date (Gregorian, ignoring leap seconds).
    let mut year = 1970u64;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    let month_days: [u64; 12] = [31, if is_leap(year) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u64;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    (year, month, days + 1, h, mi, s)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
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

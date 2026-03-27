//! Conformal Online Prediction (COP) for lead score calibration.
//!
//! Implements the COP algorithm (ICLR 2026) adapted for streaming lead score
//! calibration. Provides finite-sample marginal coverage guarantees even under
//! distribution shift, using a sliding window of nonconformity scores.
//!
//! ## Algorithm
//!
//! **Nonconformity score:** `s_i = |y_i - ŷ_i|` — the absolute residual between
//! the actual label and the model's point prediction.
//!
//! **Conformal quantile:** `q = ⌈(n+1)(1-α)/n⌉`-th sorted score in the
//! calibration window, where `α = 1 - coverage`.
//!
//! **Prediction interval:** `C(x) = [ŷ - q, ŷ + q]`
//!
//! **Coverage guarantee:** `P(y ∈ C(x)) ≥ 1 - α` (marginal, over the
//! exchangeable calibration sequence).
//!
//! **Online update:** after each (prediction, outcome) pair the new score is
//! appended and the oldest score is evicted when the window is full.
//!
//! ## Design choices
//!
//! - No external crates — only `std`. Sorting is done on a local clone of the
//!   score window, which is at most `window_size` elements.
//! - The window is stored as a `Vec<f64>` with `O(n)` eviction (sufficient for
//!   window sizes ≤ 2 000 used in lead-gen; matches the calibration.rs pattern).
//! - `f64::INFINITY` is returned as the quantile when the window is empty,
//!   which produces an infinitely wide interval — the conservative safe choice.

/// Conformal prediction for lead score intervals.
///
/// Maintains a sliding window of nonconformity scores and computes conformal
/// prediction intervals with a guaranteed marginal coverage level.
///
/// # Example
/// ```rust
/// use leadgen::matching::conformal::ConformalPredictor;
///
/// let mut cp = ConformalPredictor::new(100, 0.9); // 90% coverage
/// // Calibrate on observed (predicted, actual) pairs.
/// for i in 0..50 {
///     cp.observe(0.6, if i % 2 == 0 { 0.7 } else { 0.5 });
/// }
/// let (lo, hi, width) = cp.predict_interval(0.65);
/// assert!(width > 0.0);
/// assert!(lo <= 0.65 && hi >= 0.65);
/// ```
pub struct ConformalPredictor {
    /// Nonconformity scores `|actual - predicted|` in arrival order.
    scores: Vec<f64>,
    /// Maximum number of scores retained.
    window_size: usize,
    /// `α = 1 - coverage`. E.g. 0.1 for 90% coverage.
    alpha: f64,
}

impl ConformalPredictor {
    /// Create a new predictor.
    ///
    /// * `window_size` — sliding-window capacity for calibration scores.
    /// * `coverage` — desired marginal coverage level, e.g. `0.9` for 90%.
    ///   Clamped to `(0, 1)`.
    pub fn new(window_size: usize, coverage: f64) -> Self {
        let coverage = coverage.clamp(1e-9, 1.0 - 1e-9);
        Self {
            scores: Vec::with_capacity(window_size),
            window_size,
            alpha: 1.0 - coverage,
        }
    }

    // ── Calibration ───────────────────────────────────────────────────────────

    /// Record a calibration observation: `predicted` was the model's output,
    /// `actual` was the ground-truth value.
    ///
    /// The nonconformity score `|actual - predicted|` is appended. When the
    /// window is full the oldest score is evicted (FIFO).
    pub fn observe(&mut self, predicted: f64, actual: f64) {
        let score = (actual - predicted).abs();
        self.scores.push(score);
        if self.scores.len() > self.window_size {
            self.scores.remove(0);
        }
    }

    // ── Quantile ──────────────────────────────────────────────────────────────

    /// Compute the current conformal quantile threshold `q`.
    ///
    /// Uses the standard formula:
    /// `idx = ⌈(n+1)(1-α)⌉ - 1`  (0-based, clamped to `[0, n-1]`)
    ///
    /// Returns `f64::INFINITY` when no calibration data is available (the
    /// resulting prediction interval covers the entire real line — the only
    /// safe default).
    pub fn quantile(&self) -> f64 {
        let n = self.scores.len();
        if n == 0 {
            return f64::INFINITY;
        }

        let mut sorted = self.scores.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        // Conformal quantile index: ⌈(n+1)(1-α)⌉, 1-based → convert to 0-based.
        let raw_idx =
            ((n as f64 + 1.0) * (1.0 - self.alpha)).ceil() as usize;
        // Clamp to valid range [1, n] then convert to 0-based.
        let idx = raw_idx.clamp(1, n) - 1;
        sorted[idx]
    }

    // ── Prediction ────────────────────────────────────────────────────────────

    /// Compute a symmetric conformal prediction interval around `predicted`.
    ///
    /// Returns `(lower, upper, width)` where:
    /// - `lower = predicted - q`
    /// - `upper = predicted + q`
    /// - `width = 2 * q`
    ///
    /// When the predictor has no calibration data `q = ∞` and both bounds are
    /// infinite.
    pub fn predict_interval(&self, predicted: f64) -> (f64, f64, f64) {
        let q = self.quantile();
        (predicted - q, predicted + q, 2.0 * q)
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    /// Compute the empirical coverage fraction over a set of (predicted, actual)
    /// pairs using the current conformal threshold.
    ///
    /// A pair is considered *covered* when `|actual - predicted| ≤ q`.
    ///
    /// Returns `0.0` when `predictions` is empty.
    pub fn empirical_coverage(&self, predictions: &[(f64, f64)]) -> f64 {
        if predictions.is_empty() {
            return 0.0;
        }
        let q = self.quantile();
        let covered = predictions
            .iter()
            .filter(|(pred, actual)| (actual - pred).abs() <= q)
            .count();
        covered as f64 / predictions.len() as f64
    }

    /// Number of nonconformity scores currently in the sliding window.
    pub fn window_len(&self) -> usize {
        self.scores.len()
    }

    /// Current miscoverage level α (`1 - coverage`).
    pub fn alpha(&self) -> f64 {
        self.alpha
    }

    /// Target coverage level (`1 - α`).
    pub fn coverage(&self) -> f64 {
        1.0 - self.alpha
    }

    /// `true` when the window contains no calibration data.
    pub fn is_empty(&self) -> bool {
        self.scores.is_empty()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Empty predictor ───────────────────────────────────────────────────────

    #[test]
    fn empty_quantile_is_infinity() {
        let cp = ConformalPredictor::new(100, 0.9);
        assert_eq!(cp.quantile(), f64::INFINITY);
    }

    #[test]
    fn empty_interval_is_infinite() {
        let cp = ConformalPredictor::new(100, 0.9);
        let (lo, hi, width) = cp.predict_interval(0.5);
        assert_eq!(lo, f64::NEG_INFINITY);
        assert_eq!(hi, f64::INFINITY);
        assert_eq!(width, f64::INFINITY);
    }

    #[test]
    fn empty_predictor_covers_everything() {
        // With no observations, quantile is infinity → everything is covered
        let cp = ConformalPredictor::new(100, 0.9);
        assert_eq!(cp.empirical_coverage(&[(0.5, 0.6)]), 1.0);
    }

    #[test]
    fn empty_predictions_zero_coverage() {
        let cp = ConformalPredictor::new(100, 0.9);
        assert_eq!(cp.empirical_coverage(&[]), 0.0);
    }

    // ── Quantile tracking ─────────────────────────────────────────────────────

    #[test]
    fn quantile_single_observation() {
        let mut cp = ConformalPredictor::new(100, 0.9);
        cp.observe(0.5, 0.8); // score = 0.3
        // n=1: idx = ⌈2 * 0.9⌉ - 1 = ⌈1.8⌉ - 1 = 2 - 1 = 1 → clamped to 0
        let q = cp.quantile();
        assert!((q - 0.3).abs() < 1e-9, "expected 0.3, got {q}");
    }

    #[test]
    fn quantile_increases_with_large_errors() {
        let mut cp = ConformalPredictor::new(50, 0.9);
        // Small errors first.
        for _ in 0..20 {
            cp.observe(0.5, 0.55);
        }
        let q_small = cp.quantile();

        // Add a large error.
        cp.observe(0.5, 1.0);
        let q_large = cp.quantile();
        assert!(
            q_large >= q_small,
            "quantile should be at least as large after adding a bigger error"
        );
    }

    #[test]
    fn quantile_non_negative() {
        let mut cp = ConformalPredictor::new(50, 0.9);
        for i in 0..10 {
            cp.observe(0.5 + i as f64 * 0.01, 0.4 + i as f64 * 0.02);
        }
        assert!(cp.quantile() >= 0.0);
    }

    #[test]
    fn quantile_with_known_values() {
        // Scores = [0.1, 0.2, 0.3, 0.4, 0.5], coverage=0.8 → α=0.2
        // idx = ⌈6 * 0.8⌉ - 1 = ⌈4.8⌉ - 1 = 5 - 1 = 4 → sorted[4] = 0.5
        let mut cp = ConformalPredictor::new(10, 0.8);
        cp.observe(0.0, 0.1);
        cp.observe(0.0, 0.2);
        cp.observe(0.0, 0.3);
        cp.observe(0.0, 0.4);
        cp.observe(0.0, 0.5);
        let q = cp.quantile();
        assert!((q - 0.5).abs() < 1e-9, "expected 0.5, got {q}");
    }

    // ── Interval containment ──────────────────────────────────────────────────

    #[test]
    fn interval_contains_predicted_value() {
        let mut cp = ConformalPredictor::new(50, 0.9);
        for i in 0..20 {
            cp.observe(0.5, 0.4 + i as f64 * 0.01);
        }
        let predicted = 0.65;
        let (lo, hi, _) = cp.predict_interval(predicted);
        assert!(lo <= predicted, "lower bound should be <= predicted");
        assert!(hi >= predicted, "upper bound should be >= predicted");
    }

    #[test]
    fn interval_width_is_twice_quantile() {
        let mut cp = ConformalPredictor::new(50, 0.9);
        for _ in 0..10 {
            cp.observe(0.5, 0.6);
        }
        let q = cp.quantile();
        let (_, _, width) = cp.predict_interval(0.5);
        assert!((width - 2.0 * q).abs() < 1e-9);
    }

    // ── Coverage guarantee ────────────────────────────────────────────────────

    /// Verifies the marginal coverage guarantee on synthetic calibrated data.
    ///
    /// We generate 200 (predicted, actual) pairs where actual ~ predicted + ε,
    /// ε ∈ [-0.15, 0.15] uniformly. With 90% coverage the conformal interval
    /// should cover ≥ 90% of held-out pairs.
    #[test]
    fn coverage_meets_guarantee_on_calibrated_data() {
        let mut cp = ConformalPredictor::new(200, 0.9);

        // Calibration phase: deterministic linear spread to avoid PRNG dependency.
        for i in 0..200 {
            let predicted = 0.5_f64;
            // Residual linearly spaced in [-0.15, 0.15].
            let residual = -0.15 + 0.3 * (i as f64 / 199.0);
            cp.observe(predicted, predicted + residual);
        }

        // Evaluation phase: same distribution.
        let test_pairs: Vec<(f64, f64)> = (0..100)
            .map(|i| {
                let predicted = 0.5_f64;
                let residual = -0.15 + 0.3 * (i as f64 / 99.0);
                (predicted, predicted + residual)
            })
            .collect();

        let cov = cp.empirical_coverage(&test_pairs);
        assert!(
            cov >= 0.85, // allow 5% tolerance around the 90% target
            "empirical coverage {cov:.3} should be ≥ 0.85 (target 0.9)"
        );
    }

    #[test]
    fn coverage_of_empty_predictions_is_zero() {
        let mut cp = ConformalPredictor::new(50, 0.9);
        cp.observe(0.5, 0.6);
        assert_eq!(cp.empirical_coverage(&[]), 0.0);
    }

    // ── Window eviction ───────────────────────────────────────────────────────

    #[test]
    fn window_does_not_exceed_capacity() {
        let capacity = 10;
        let mut cp = ConformalPredictor::new(capacity, 0.9);
        for i in 0..30 {
            cp.observe(0.5, 0.5 + (i as f64) * 0.01);
        }
        assert_eq!(
            cp.window_len(),
            capacity,
            "window should not exceed capacity"
        );
    }

    #[test]
    fn window_eviction_updates_quantile() {
        // Fill window with large errors; after eviction the quantile should drop.
        let capacity = 5;
        let mut cp = ConformalPredictor::new(capacity, 0.9);
        for _ in 0..capacity {
            cp.observe(0.0, 1.0); // score = 1.0
        }
        let q_large = cp.quantile();

        // Overwrite with small errors — evicts all large ones.
        for _ in 0..capacity {
            cp.observe(0.0, 0.01); // score = 0.01
        }
        let q_small = cp.quantile();
        assert!(
            q_small < q_large,
            "quantile should drop after evicting large errors: {q_large} → {q_small}"
        );
    }

    #[test]
    fn window_len_grows_then_stabilises() {
        let capacity = 5;
        let mut cp = ConformalPredictor::new(capacity, 0.9);
        for i in 0..10u32 {
            cp.observe(0.5, 0.6);
            let expected_len = ((i + 1) as usize).min(capacity);
            assert_eq!(cp.window_len(), expected_len);
        }
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    #[test]
    fn alpha_and_coverage_are_complementary() {
        let cp = ConformalPredictor::new(50, 0.9);
        assert!((cp.alpha() - 0.1).abs() < 1e-9);
        assert!((cp.coverage() - 0.9).abs() < 1e-9);
        assert!((cp.alpha() + cp.coverage() - 1.0).abs() < 1e-9);
    }

    #[test]
    fn is_empty_reflects_window_state() {
        let mut cp = ConformalPredictor::new(10, 0.9);
        assert!(cp.is_empty());
        cp.observe(0.5, 0.6);
        assert!(!cp.is_empty());
    }
}

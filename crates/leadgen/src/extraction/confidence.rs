use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// ExtractionConfidence
// ---------------------------------------------------------------------------

/// Carries both the raw model confidence and the calibrated confidence for a
/// single extraction result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionConfidence {
    /// The entity type label (e.g. `"person"`, `"company"`, `"location"`).
    pub entity_type: String,
    /// Confidence as reported directly by the model or pattern matcher: [0, 1].
    pub raw_confidence: f64,
    /// Confidence after Bayesian blending with observed per-type accuracy.
    /// Equals `raw_confidence` when there is no feedback history.
    pub calibrated_confidence: f64,
}

// ---------------------------------------------------------------------------
// PlattCalibrator
// ---------------------------------------------------------------------------

/// Online Platt scaling calibrator.
///
/// Fits a sigmoid `P(y=1|s) = 1 / (1 + exp(A·s + B))` to map raw scores to
/// calibrated probabilities via stochastic gradient descent.
///
/// Parameters are updated one sample at a time (lr = 0.01). The calibrator
/// is considered "fitted" once it has seen at least 20 samples.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlattCalibrator {
    /// Sigmoid slope (initialised to -1.0; negative for a well-ordered classifier).
    pub a: f64,
    /// Sigmoid bias (initialised to 0.0).
    pub b: f64,
    /// Number of positive labels seen.
    pub n_pos: u32,
    /// Number of negative labels seen.
    pub n_neg: u32,
}

impl PlattCalibrator {
    /// Create a new Platt calibrator with identity-ish initial parameters.
    pub fn new() -> Self {
        Self {
            a: -1.0,
            b: 0.0,
            n_pos: 0,
            n_neg: 0,
        }
    }

    /// Online SGD update given a raw `score` and a binary `label` in {0.0, 1.0}.
    ///
    /// Uses a fixed learning rate of 0.01.
    pub fn update(&mut self, score: f64, label: f64) {
        let predicted = sigmoid(self.a * score + self.b);
        let error = label - predicted;
        let lr = 0.01;
        self.a += lr * error * score;
        self.b += lr * error;
        if label >= 0.5 {
            self.n_pos += 1;
        } else {
            self.n_neg += 1;
        }
    }

    /// Return the Platt-calibrated probability for `score`, clamped to [0, 1].
    pub fn calibrate(&self, score: f64) -> f64 {
        sigmoid(self.a * score + self.b).clamp(0.0, 1.0)
    }

    /// True when the calibrator has been trained on at least 20 samples.
    pub fn is_fitted(&self) -> bool {
        self.n_pos + self.n_neg >= 20
    }
}

impl Default for PlattCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// IsotonicBins
// ---------------------------------------------------------------------------

/// Non-parametric calibrator using 10 equal-width bins over [0, 1).
///
/// Each bin tracks `(correct, total)` counts. Calibration returns the
/// empirical accuracy in the corresponding bin, falling back to the raw score
/// when fewer than 3 samples have been observed in that bin.
///
/// Call [`enforce_monotonicity`] periodically to merge adjacent bins that
/// violate the isotonic constraint (pool adjacent violators algorithm).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IsotonicBins {
    /// `(correct, total)` per bin. Bin `i` covers `[i*0.1, (i+1)*0.1)`.
    pub bins: [(u32, u32); 10],
}

impl IsotonicBins {
    /// Create a new bin tracker with all counts at zero.
    pub fn new() -> Self {
        Self {
            bins: [(0, 0); 10],
        }
    }

    /// Record an observation with raw score `raw` and whether it was `correct`.
    pub fn record(&mut self, raw: f64, correct: bool) {
        let idx = bin_index(raw);
        self.bins[idx].1 += 1;
        if correct {
            self.bins[idx].0 += 1;
        }
    }

    /// Return the calibrated probability for `raw`.
    ///
    /// Uses the empirical accuracy in the bin if `total >= 3`, otherwise
    /// returns `raw` unchanged.
    pub fn calibrate(&self, raw: f64) -> f64 {
        let idx = bin_index(raw);
        let (correct, total) = self.bins[idx];
        if total >= 3 {
            (correct as f64 / total as f64).clamp(0.0, 1.0)
        } else {
            raw.clamp(0.0, 1.0)
        }
    }

    /// Pool adjacent violators: merge consecutive bins where bin[i].accuracy
    /// exceeds bin[i+1].accuracy by combining their counts.
    ///
    /// Empty bins (total == 0) are skipped — they carry no ordering information
    /// and should never trigger a merge. One forward pass with backward
    /// back-tracking is sufficient for the common case.
    pub fn enforce_monotonicity(&mut self) {
        let mut i = 0usize;
        while i < 9 {
            // Skip empty bins on either side — nothing to enforce against.
            if self.bins[i].1 == 0 || self.bins[i + 1].1 == 0 {
                i += 1;
                continue;
            }
            let acc_i = bin_accuracy(self.bins[i]);
            let acc_next = bin_accuracy(self.bins[i + 1]);
            if acc_i > acc_next {
                // Merge bin i+1 into bin i.
                let merged_correct = self.bins[i].0 + self.bins[i + 1].0;
                let merged_total = self.bins[i].1 + self.bins[i + 1].1;
                self.bins[i] = (merged_correct, merged_total);
                self.bins[i + 1] = (merged_correct, merged_total);
                // Re-examine bin i in case it now violates the one before it.
                if i > 0 {
                    i -= 1;
                } else {
                    i += 1;
                }
            } else {
                i += 1;
            }
        }
    }
}

impl Default for IsotonicBins {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// ConfidenceCalibrator
// ---------------------------------------------------------------------------

/// Tracks extraction accuracy per entity type and blends raw model confidence
/// with empirical accuracy using an adaptive Bayesian weighting scheme.
///
/// ## Blending formula
///
/// ```text
/// alpha            = total / (total + prior_strength)
/// calibrated       = raw * (1.0 - alpha) + accuracy * alpha
/// ```
///
/// At 0 observations `alpha = 0` (pure raw). At `prior_strength` observations
/// `alpha = 0.5` (equal blend). This replaces the old hard threshold at 10
/// samples — calibration now works from the very first observation.
///
/// ## Extended calibrators
///
/// An optional per-entity-type [`PlattCalibrator`] can be maintained alongside
/// the accuracy tracker. Use [`record_with_score`] to update both, and
/// [`calibrate_platt`] to obtain a Platt-scaled probability.
pub struct ConfidenceCalibrator {
    /// Entity type → (correct_count, total_count)
    type_accuracy: HashMap<String, (u32, u32)>,
    /// Per-entity-type Platt calibrators (lazily created on first use).
    platt: HashMap<String, PlattCalibrator>,
    /// Controls how quickly the Bayesian blend shifts toward empirical accuracy.
    /// Default: 20.0 (alpha = 0.5 at 20 observations, ~0.83 at 100).
    pub prior_strength: f64,
}

impl Default for ConfidenceCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

impl ConfidenceCalibrator {
    /// Create a new calibrator with `prior_strength = 20.0`.
    pub fn new() -> Self {
        Self {
            type_accuracy: HashMap::new(),
            platt: HashMap::new(),
            prior_strength: 20.0,
        }
    }

    /// Create a new calibrator with a custom `prior_strength`.
    pub fn with_prior_strength(prior_strength: f64) -> Self {
        Self {
            type_accuracy: HashMap::new(),
            platt: HashMap::new(),
            prior_strength,
        }
    }

    // -----------------------------------------------------------------------
    // Recording
    // -----------------------------------------------------------------------

    /// Record whether an extraction of `entity_type` was correct.
    ///
    /// Updates only the accuracy tracker. Use [`record_with_score`] when you
    /// also want to maintain the per-type Platt calibrator.
    pub fn record(&mut self, entity_type: &str, was_correct: bool) {
        let entry = self
            .type_accuracy
            .entry(entity_type.to_string())
            .or_insert((0, 0));
        if was_correct {
            entry.0 += 1;
        }
        entry.1 += 1;
    }

    /// Record an observation together with its raw model score.
    ///
    /// Updates both the accuracy tracker (used by [`calibrate`]) **and** the
    /// per-type Platt calibrator (used by [`calibrate_platt`]).
    pub fn record_with_score(&mut self, entity_type: &str, raw_score: f64, was_correct: bool) {
        self.record(entity_type, was_correct);
        let label = if was_correct { 1.0 } else { 0.0 };
        self.platt
            .entry(entity_type.to_string())
            .or_insert_with(PlattCalibrator::new)
            .update(raw_score, label);
    }

    // -----------------------------------------------------------------------
    // Calibration
    // -----------------------------------------------------------------------

    /// Return the adaptive Bayesian-blended confidence for `(entity_type, raw)`.
    ///
    /// `alpha = total / (total + prior_strength)` scales continuously from
    /// 0 (no data, returns raw) to 1 (many observations, returns accuracy).
    /// The result is always clamped to `[0.0, 1.0]`.
    pub fn calibrate(&self, entity_type: &str, raw_confidence: f64) -> f64 {
        let raw = raw_confidence.clamp(0.0, 1.0);
        match self.type_accuracy.get(entity_type) {
            Some(&(correct, total)) if total > 0 => {
                let accuracy = correct as f64 / total as f64;
                let alpha = total as f64 / (total as f64 + self.prior_strength);
                (raw * (1.0 - alpha) + accuracy * alpha).clamp(0.0, 1.0)
            }
            _ => raw,
        }
    }

    /// Return the Platt-calibrated score for `(entity_type, raw)`.
    ///
    /// Returns `None` when no Platt calibrator exists for the type or when the
    /// calibrator has not yet seen enough data ([`PlattCalibrator::is_fitted`]).
    pub fn calibrate_platt(&self, entity_type: &str, raw: f64) -> Option<f64> {
        let pc = self.platt.get(entity_type)?;
        if pc.is_fitted() {
            Some(pc.calibrate(raw))
        } else {
            None
        }
    }

    // -----------------------------------------------------------------------
    // Build helper
    // -----------------------------------------------------------------------

    /// Build a fully populated [`ExtractionConfidence`] for the given entity
    /// type and raw confidence value using the adaptive Bayesian blend.
    pub fn build(
        &self,
        entity_type: impl Into<String>,
        raw_confidence: f64,
    ) -> ExtractionConfidence {
        let entity_type = entity_type.into();
        let calibrated_confidence = self.calibrate(&entity_type, raw_confidence);
        ExtractionConfidence {
            entity_type,
            raw_confidence: raw_confidence.clamp(0.0, 1.0),
            calibrated_confidence,
        }
    }

    // -----------------------------------------------------------------------
    // Statistics
    // -----------------------------------------------------------------------

    /// Return accuracy statistics for every entity type that has been recorded.
    ///
    /// Returns a vector of `(entity_type, accuracy, total_count)` tuples,
    /// sorted by entity type for deterministic output.
    pub fn stats(&self) -> Vec<(String, f64, u32)> {
        let mut entries: Vec<(String, f64, u32)> = self
            .type_accuracy
            .iter()
            .map(|(t, &(correct, total))| {
                let accuracy = if total > 0 {
                    correct as f64 / total as f64
                } else {
                    0.0
                };
                (t.clone(), accuracy, total)
            })
            .collect();
        entries.sort_by(|a, b| a.0.cmp(&b.0));
        entries
    }

    /// Total number of feedback samples recorded across all entity types.
    pub fn total_samples(&self) -> u32 {
        self.type_accuracy.values().map(|&(_, n)| n).sum()
    }

    /// Number of distinct entity types that have been recorded.
    pub fn entity_type_count(&self) -> usize {
        self.type_accuracy.len()
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Logistic sigmoid: 1 / (1 + e^(-x)).
#[inline]
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

/// Map a score in [0, 1] to a bin index in [0, 9].
/// Scores of exactly 1.0 fall into bin 9.
#[inline]
fn bin_index(raw: f64) -> usize {
    let clamped = raw.clamp(0.0, 1.0);
    ((clamped * 10.0) as usize).min(9)
}

/// Empirical accuracy for a `(correct, total)` bin pair.
/// Returns 0.0 for empty bins.
#[inline]
fn bin_accuracy(bin: (u32, u32)) -> f64 {
    if bin.1 == 0 {
        0.0
    } else {
        bin.0 as f64 / bin.1 as f64
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Default / construction
    // -----------------------------------------------------------------------

    #[test]
    fn new_calibrator_has_no_samples() {
        let cal = ConfidenceCalibrator::new();
        assert_eq!(cal.total_samples(), 0);
        assert_eq!(cal.entity_type_count(), 0);
        assert!(cal.stats().is_empty());
    }

    #[test]
    fn prior_strength_default_is_twenty() {
        let cal = ConfidenceCalibrator::new();
        assert!((cal.prior_strength - 20.0).abs() < 1e-9);
    }

    // -----------------------------------------------------------------------
    // record()
    // -----------------------------------------------------------------------

    #[test]
    fn record_increments_total_count() {
        let mut cal = ConfidenceCalibrator::new();
        cal.record("person", true);
        cal.record("person", false);
        let stats = cal.stats();
        assert_eq!(stats.len(), 1);
        let (_, _accuracy, total) = &stats[0];
        assert_eq!(*total, 2);
    }

    #[test]
    fn record_increments_correct_count_only_when_true() {
        let mut cal = ConfidenceCalibrator::new();
        cal.record("company", true);
        cal.record("company", true);
        cal.record("company", false);
        let stats = cal.stats();
        let (_, accuracy, total) = &stats[0];
        assert_eq!(*total, 3);
        // 2/3 ≈ 0.666…
        assert!((accuracy - 2.0 / 3.0).abs() < 1e-9);
    }

    #[test]
    fn record_tracks_multiple_entity_types_independently() {
        let mut cal = ConfidenceCalibrator::new();
        cal.record("person", true);
        cal.record("company", false);
        assert_eq!(cal.entity_type_count(), 2);
        assert_eq!(cal.total_samples(), 2);
    }

    // -----------------------------------------------------------------------
    // calibrate(): zero samples
    // -----------------------------------------------------------------------

    #[test]
    fn calibrate_returns_raw_for_unknown_entity_type() {
        let cal = ConfidenceCalibrator::new();
        let raw = 0.55;
        assert!((cal.calibrate("person", raw) - raw).abs() < 1e-9);
    }

    #[test]
    fn calibrate_returns_raw_when_zero_samples() {
        // With the adaptive formula, alpha=0 at total=0, so calibrated==raw.
        let cal = ConfidenceCalibrator::new();
        let raw = 0.72;
        assert!((cal.calibrate("location", raw) - raw).abs() < 1e-9);
    }

    // -----------------------------------------------------------------------
    // Adaptive mixing weight
    // -----------------------------------------------------------------------

    #[test]
    fn adaptive_alpha_at_zero_samples_is_zero() {
        // alpha = 0 / (0 + 20) = 0  →  calibrated == raw
        let cal = ConfidenceCalibrator::new();
        let raw = 0.6;
        assert!((cal.calibrate("person", raw) - raw).abs() < 1e-9);
    }

    #[test]
    fn adaptive_alpha_at_ten_samples() {
        // alpha = 10 / (10 + 20) = 10/30 ≈ 0.3333
        // All 10 correct → accuracy = 1.0
        // calibrated = 0.5 * (1 - 0.3333) + 1.0 * 0.3333 = 0.3333 + 0.3333 = 0.6667
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..10 {
            cal.record("person", true);
        }
        let raw = 0.5;
        let alpha = 10.0_f64 / 30.0;
        let expected = raw * (1.0 - alpha) + 1.0 * alpha;
        let got = cal.calibrate("person", raw);
        assert!(
            (got - expected).abs() < 1e-9,
            "expected {}, got {}",
            expected,
            got
        );
    }

    #[test]
    fn adaptive_alpha_at_one_hundred_samples() {
        // alpha = 100 / (100 + 20) = 100/120 ≈ 0.8333
        // All 100 correct → accuracy = 1.0
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..100 {
            cal.record("person", true);
        }
        let raw = 0.5;
        let alpha = 100.0_f64 / 120.0;
        let expected = raw * (1.0 - alpha) + 1.0 * alpha;
        let got = cal.calibrate("person", raw);
        assert!(
            (got - expected).abs() < 1e-9,
            "expected {}, got {}",
            expected,
            got
        );
    }

    #[test]
    fn adaptive_blend_with_partial_accuracy_at_ten_samples() {
        // 7 correct out of 10 → accuracy = 0.7
        // alpha = 10/30 ≈ 0.3333
        // expected = 0.8 * (1 - 0.3333) + 0.7 * 0.3333 = 0.5333 + 0.2333 = 0.7667
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..7 {
            cal.record("company", true);
        }
        for _ in 0..3 {
            cal.record("company", false);
        }
        let raw = 0.8;
        let alpha = 10.0_f64 / 30.0;
        let accuracy = 0.7_f64;
        let expected = raw * (1.0 - alpha) + accuracy * alpha;
        let got = cal.calibrate("company", raw);
        assert!(
            (got - expected).abs() < 1e-9,
            "expected {}, got {}",
            expected,
            got
        );
    }

    #[test]
    fn calibrate_result_is_clamped_to_unit_interval() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..10 {
            cal.record("x", true);
        }
        let got = cal.calibrate("x", 2.0);
        assert!(got <= 1.0, "calibrated confidence should not exceed 1.0, got {}", got);
        let got_neg = cal.calibrate("x", -0.5);
        assert!(
            got_neg >= 0.0,
            "calibrated confidence should be >= 0.0, got {}",
            got_neg
        );
    }

    // -----------------------------------------------------------------------
    // build()
    // -----------------------------------------------------------------------

    #[test]
    fn build_populates_all_fields() {
        let cal = ConfidenceCalibrator::new();
        let ec = cal.build("person", 0.65);
        assert_eq!(ec.entity_type, "person");
        assert!((ec.raw_confidence - 0.65).abs() < 1e-9);
        // No history → alpha=0 → calibrated == raw.
        assert!((ec.calibrated_confidence - 0.65).abs() < 1e-9);
    }

    #[test]
    fn build_uses_calibrated_value_when_history_available() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..10 {
            cal.record("location", true);
        }
        let raw = 0.4;
        let alpha = 10.0_f64 / 30.0;
        let expected = raw * (1.0 - alpha) + 1.0 * alpha;
        let ec = cal.build("location", raw);
        assert!(
            (ec.calibrated_confidence - expected).abs() < 1e-9,
            "expected {}, got {}",
            expected,
            ec.calibrated_confidence
        );
    }

    // -----------------------------------------------------------------------
    // stats()
    // -----------------------------------------------------------------------

    #[test]
    fn stats_returns_sorted_by_entity_type() {
        let mut cal = ConfidenceCalibrator::new();
        cal.record("person", true);
        cal.record("company", true);
        cal.record("location", false);
        let stats = cal.stats();
        let types: Vec<&str> = stats.iter().map(|(t, _, _)| t.as_str()).collect();
        let mut sorted = types.clone();
        sorted.sort();
        assert_eq!(types, sorted, "stats() output should be sorted by entity type");
    }

    #[test]
    fn stats_accuracy_is_zero_when_all_incorrect() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..5 {
            cal.record("email", false);
        }
        let stats = cal.stats();
        assert_eq!(stats.len(), 1);
        let (_, accuracy, total) = stats[0];
        assert!((accuracy - 0.0).abs() < 1e-9);
        assert_eq!(total, 5);
    }

    // -----------------------------------------------------------------------
    // total_samples() / entity_type_count()
    // -----------------------------------------------------------------------

    #[test]
    fn total_samples_sums_across_all_types() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..3 {
            cal.record("a", true);
        }
        for _ in 0..7 {
            cal.record("b", false);
        }
        assert_eq!(cal.total_samples(), 10);
    }

    #[test]
    fn entity_type_count_counts_unique_types_only() {
        let mut cal = ConfidenceCalibrator::new();
        cal.record("person", true);
        cal.record("person", true);
        cal.record("company", false);
        assert_eq!(cal.entity_type_count(), 2);
    }

    // -----------------------------------------------------------------------
    // Serialisation
    // -----------------------------------------------------------------------

    #[test]
    fn extraction_confidence_serialises_and_deserialises() {
        let ec = ExtractionConfidence {
            entity_type: "person".to_string(),
            raw_confidence: 0.75,
            calibrated_confidence: 0.82,
        };
        let json = serde_json::to_string(&ec).expect("serialise");
        let back: ExtractionConfidence = serde_json::from_str(&json).expect("deserialise");
        assert_eq!(back.entity_type, ec.entity_type);
        assert!((back.raw_confidence - ec.raw_confidence).abs() < 1e-9);
        assert!((back.calibrated_confidence - ec.calibrated_confidence).abs() < 1e-9);
    }

    // -----------------------------------------------------------------------
    // PlattCalibrator
    // -----------------------------------------------------------------------

    #[test]
    fn platt_calibrator_initial_params() {
        let pc = PlattCalibrator::new();
        assert!((pc.a - (-1.0)).abs() < 1e-9);
        assert!((pc.b - 0.0).abs() < 1e-9);
        assert_eq!(pc.n_pos, 0);
        assert_eq!(pc.n_neg, 0);
    }

    #[test]
    fn platt_calibrator_not_fitted_below_twenty_samples() {
        let mut pc = PlattCalibrator::new();
        for i in 0..19 {
            pc.update(0.5, if i % 2 == 0 { 1.0 } else { 0.0 });
        }
        assert!(!pc.is_fitted());
    }

    #[test]
    fn platt_calibrator_fitted_at_twenty_samples() {
        let mut pc = PlattCalibrator::new();
        for i in 0..20 {
            pc.update(0.5, if i % 2 == 0 { 1.0 } else { 0.0 });
        }
        assert!(pc.is_fitted());
    }

    #[test]
    fn platt_calibrator_update_changes_params() {
        let mut pc = PlattCalibrator::new();
        let a_before = pc.a;
        let b_before = pc.b;
        pc.update(0.8, 1.0);
        // After a positive example the parameters should have moved.
        assert!((pc.a - a_before).abs() > 1e-12 || (pc.b - b_before).abs() > 1e-12);
    }

    #[test]
    fn platt_calibrator_output_clamped() {
        let pc = PlattCalibrator { a: -100.0, b: 100.0, n_pos: 20, n_neg: 0 };
        let v = pc.calibrate(0.0);
        assert!(v >= 0.0 && v <= 1.0);
        let v2 = pc.calibrate(1.0);
        assert!(v2 >= 0.0 && v2 <= 1.0);
    }

    #[test]
    fn platt_calibrator_identity_init_maps_midpoint_near_half() {
        // With A=-1, B=0: sigmoid(-1*0.5 + 0) = sigmoid(-0.5) ≈ 0.378.
        // That's the expected initial mapping — we just verify the formula.
        let pc = PlattCalibrator::new();
        let expected = 1.0 / (1.0 + (0.5f64).exp()); // sigmoid(-0.5)
        let got = pc.calibrate(0.5);
        assert!((got - expected).abs() < 1e-9, "expected {}, got {}", expected, got);
    }

    #[test]
    fn platt_calibrator_n_pos_n_neg_incremented_correctly() {
        let mut pc = PlattCalibrator::new();
        pc.update(0.7, 1.0);
        pc.update(0.3, 0.0);
        pc.update(0.6, 1.0);
        assert_eq!(pc.n_pos, 2);
        assert_eq!(pc.n_neg, 1);
    }

    #[test]
    fn confidence_calibrator_calibrate_platt_returns_none_before_fitted() {
        let mut cal = ConfidenceCalibrator::new();
        for i in 0..10 {
            cal.record_with_score("person", 0.5, i % 2 == 0);
        }
        // Only 10 samples — Platt not fitted yet (needs 20).
        assert!(cal.calibrate_platt("person", 0.5).is_none());
    }

    #[test]
    fn confidence_calibrator_calibrate_platt_returns_some_when_fitted() {
        let mut cal = ConfidenceCalibrator::new();
        for i in 0..20 {
            cal.record_with_score("person", 0.6, i % 2 == 0);
        }
        let result = cal.calibrate_platt("person", 0.6);
        assert!(result.is_some());
        let v = result.unwrap();
        assert!(v >= 0.0 && v <= 1.0);
    }

    #[test]
    fn confidence_calibrator_calibrate_platt_returns_none_for_unknown_type() {
        let cal = ConfidenceCalibrator::new();
        assert!(cal.calibrate_platt("unknown", 0.5).is_none());
    }

    // -----------------------------------------------------------------------
    // IsotonicBins
    // -----------------------------------------------------------------------

    #[test]
    fn isotonic_bins_new_all_zero() {
        let bins = IsotonicBins::new();
        for &(c, t) in &bins.bins {
            assert_eq!(c, 0);
            assert_eq!(t, 0);
        }
    }

    #[test]
    fn isotonic_bins_record_increments_correct_bin() {
        let mut bins = IsotonicBins::new();
        bins.record(0.05, true); // bin 0
        bins.record(0.15, false); // bin 1
        assert_eq!(bins.bins[0], (1, 1));
        assert_eq!(bins.bins[1], (0, 1));
    }

    #[test]
    fn isotonic_bins_calibrate_falls_back_to_raw_when_sparse() {
        let mut bins = IsotonicBins::new();
        bins.record(0.55, true);
        bins.record(0.55, false);
        // Only 2 samples in bin 5 — needs >= 3.
        let raw = 0.55;
        assert!((bins.calibrate(raw) - raw).abs() < 1e-9);
    }

    #[test]
    fn isotonic_bins_calibrate_returns_empirical_accuracy_when_sufficient() {
        let mut bins = IsotonicBins::new();
        // 3 correct out of 4 in bin 7 ([0.7, 0.8))
        bins.record(0.72, true);
        bins.record(0.73, true);
        bins.record(0.74, true);
        bins.record(0.75, false);
        let got = bins.calibrate(0.71);
        let expected = 3.0 / 4.0;
        assert!((got - expected).abs() < 1e-9, "expected {}, got {}", expected, got);
    }

    #[test]
    fn isotonic_bins_record_score_of_one_goes_to_last_bin() {
        let mut bins = IsotonicBins::new();
        bins.record(1.0, true);
        assert_eq!(bins.bins[9].1, 1);
    }

    #[test]
    fn isotonic_bins_enforce_monotonicity_merges_violating_pair() {
        let mut bins = IsotonicBins::new();
        // Bin 3: 9/10 → 0.9 accuracy.  Bin 4: 1/10 → 0.1 accuracy. Violates monotonicity.
        bins.bins[3] = (9, 10);
        bins.bins[4] = (1, 10);
        bins.enforce_monotonicity();
        // After merging, both bins should have the same pooled accuracy (10/20 = 0.5).
        let acc3 = bins.bins[3].0 as f64 / bins.bins[3].1 as f64;
        let acc4 = bins.bins[4].0 as f64 / bins.bins[4].1 as f64;
        assert!(
            (acc3 - acc4).abs() < 1e-9,
            "merged bins should have equal accuracy, acc3={}, acc4={}",
            acc3,
            acc4
        );
        assert!((acc3 - 0.5).abs() < 1e-9, "expected 0.5, got {}", acc3);
    }

    #[test]
    fn isotonic_bins_enforce_monotonicity_leaves_sorted_bins_unchanged() {
        let mut bins = IsotonicBins::new();
        // Strictly increasing accuracy across bins — no violation.
        bins.bins[0] = (1, 10); // 0.1
        bins.bins[1] = (2, 10); // 0.2
        bins.bins[2] = (5, 10); // 0.5
        bins.bins[3] = (8, 10); // 0.8
        let before = bins.bins;
        bins.enforce_monotonicity();
        assert_eq!(bins.bins, before, "monotone bins should be unchanged");
    }

    #[test]
    fn isotonic_bins_enforce_monotonicity_cascades_across_multiple_violations() {
        let mut bins = IsotonicBins::new();
        // Decreasing: 0.9, 0.5, 0.1 in bins 0-2. Two adjacent violations.
        bins.bins[0] = (9, 10);
        bins.bins[1] = (5, 10);
        bins.bins[2] = (1, 10);
        bins.enforce_monotonicity();
        // After pool adjacent violators, bins 0-2 should be non-decreasing.
        let acc = |b: (u32, u32)| b.0 as f64 / b.1 as f64;
        assert!(
            acc(bins.bins[0]) <= acc(bins.bins[1]) + 1e-9,
            "bin0={} should be <= bin1={}",
            acc(bins.bins[0]),
            acc(bins.bins[1])
        );
        assert!(
            acc(bins.bins[1]) <= acc(bins.bins[2]) + 1e-9,
            "bin1={} should be <= bin2={}",
            acc(bins.bins[1]),
            acc(bins.bins[2])
        );
    }
}

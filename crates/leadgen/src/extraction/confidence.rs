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
    /// Equals `raw_confidence` when there is insufficient feedback history.
    pub calibrated_confidence: f64,
}

// ---------------------------------------------------------------------------
// ConfidenceCalibrator
// ---------------------------------------------------------------------------

/// Tracks extraction accuracy per entity type and blends raw model confidence
/// with empirical accuracy using a Bayesian weighting scheme.
///
/// The blending formula is:
/// ```text
/// calibrated = raw_confidence * 0.3 + accuracy * 0.7
/// ```
/// This is applied only when at least 10 feedback samples have been recorded
/// for the entity type; below that threshold the raw confidence is returned
/// unchanged so early estimates stay unbiased by noise.
pub struct ConfidenceCalibrator {
    /// Entity type → (correct_count, total_count)
    type_accuracy: HashMap<String, (u32, u32)>,
}

impl Default for ConfidenceCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

impl ConfidenceCalibrator {
    /// Create a new calibrator with no prior feedback.
    pub fn new() -> Self {
        Self {
            type_accuracy: HashMap::new(),
        }
    }

    /// Record whether an extraction of `entity_type` was correct.
    ///
    /// Feed human-validated labels or downstream verification outcomes here
    /// to build up the accuracy history used by [`calibrate`].
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

    /// Return the calibrated confidence for a single `(entity_type, raw_confidence)` pair.
    ///
    /// - When `total >= 10`: applies `raw * 0.3 + accuracy * 0.7`.
    /// - When `total < 10`: returns `raw_confidence` unchanged.
    ///
    /// The result is always clamped to `[0.0, 1.0]`.
    pub fn calibrate(&self, entity_type: &str, raw_confidence: f64) -> f64 {
        let raw = raw_confidence.clamp(0.0, 1.0);
        match self.type_accuracy.get(entity_type) {
            Some(&(correct, total)) if total >= 10 => {
                let accuracy = correct as f64 / total as f64;
                (raw * 0.3 + accuracy * 0.7).clamp(0.0, 1.0)
            }
            _ => raw,
        }
    }

    /// Build a fully populated [`ExtractionConfidence`] for the given entity type
    /// and raw confidence value.
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
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // --- Default / construction ---------------------------------------------

    #[test]
    fn new_calibrator_has_no_samples() {
        let cal = ConfidenceCalibrator::new();
        assert_eq!(cal.total_samples(), 0);
        assert_eq!(cal.entity_type_count(), 0);
        assert!(cal.stats().is_empty());
    }

    // --- record() -----------------------------------------------------------

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

    // --- calibrate(): below threshold --------------------------------------

    #[test]
    fn calibrate_returns_raw_when_fewer_than_ten_samples() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..9 {
            cal.record("location", true);
        }
        let raw = 0.72;
        assert!((cal.calibrate("location", raw) - raw).abs() < 1e-9);
    }

    #[test]
    fn calibrate_returns_raw_for_unknown_entity_type() {
        let cal = ConfidenceCalibrator::new();
        let raw = 0.55;
        assert!((cal.calibrate("person", raw) - raw).abs() < 1e-9);
    }

    // --- calibrate(): at/above threshold ------------------------------------

    #[test]
    fn calibrate_applies_bayesian_blend_at_ten_samples() {
        let mut cal = ConfidenceCalibrator::new();
        // All 10 correct → accuracy = 1.0
        for _ in 0..10 {
            cal.record("person", true);
        }
        let raw = 0.5;
        // expected = 0.5 * 0.3 + 1.0 * 0.7 = 0.85
        let expected = 0.5 * 0.3 + 1.0 * 0.7;
        let got = cal.calibrate("person", raw);
        assert!((got - expected).abs() < 1e-9, "expected {}, got {}", expected, got);
    }

    #[test]
    fn calibrate_blends_correctly_with_partial_accuracy() {
        let mut cal = ConfidenceCalibrator::new();
        // 7 correct out of 10 → accuracy = 0.7
        for _ in 0..7 {
            cal.record("company", true);
        }
        for _ in 0..3 {
            cal.record("company", false);
        }
        let raw = 0.8;
        // expected = 0.8 * 0.3 + 0.7 * 0.7 = 0.24 + 0.49 = 0.73
        let expected = 0.8 * 0.3 + 0.7 * 0.7;
        let got = cal.calibrate("company", raw);
        assert!((got - expected).abs() < 1e-9, "expected {}, got {}", expected, got);
    }

    #[test]
    fn calibrate_result_is_clamped_to_unit_interval() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..10 {
            cal.record("x", true);
        }
        // raw above 1.0 should not produce a value above 1.0.
        let got = cal.calibrate("x", 2.0);
        assert!(got <= 1.0, "calibrated confidence should not exceed 1.0, got {}", got);
        // raw below 0.0 should not produce negative value.
        let got_neg = cal.calibrate("x", -0.5);
        assert!(
            got_neg >= 0.0,
            "calibrated confidence should be >= 0.0, got {}",
            got_neg
        );
    }

    // --- build() ------------------------------------------------------------

    #[test]
    fn build_populates_all_fields() {
        let cal = ConfidenceCalibrator::new();
        let ec = cal.build("person", 0.65);
        assert_eq!(ec.entity_type, "person");
        assert!((ec.raw_confidence - 0.65).abs() < 1e-9);
        // No history → calibrated == raw.
        assert!((ec.calibrated_confidence - 0.65).abs() < 1e-9);
    }

    #[test]
    fn build_uses_calibrated_value_when_history_available() {
        let mut cal = ConfidenceCalibrator::new();
        for _ in 0..10 {
            cal.record("location", true);
        }
        let ec = cal.build("location", 0.4);
        // expected = 0.4 * 0.3 + 1.0 * 0.7 = 0.82
        let expected = 0.4 * 0.3 + 1.0 * 0.7;
        assert!(
            (ec.calibrated_confidence - expected).abs() < 1e-9,
            "expected {}, got {}",
            expected,
            ec.calibrated_confidence
        );
    }

    // --- stats() ------------------------------------------------------------

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

    // --- total_samples() / entity_type_count() ------------------------------

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

    // --- Serialisation ------------------------------------------------------

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
}

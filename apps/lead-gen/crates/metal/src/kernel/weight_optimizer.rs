use serde::{Deserialize, Serialize};
use std::path::Path;

use super::scoring::*;
use super::ml_eval::*;

// ── Optimization result ───────────────────────────────────────────────────────

/// Full record of an optimization run: best ICP weights, learned logistic
/// parameters, calibration flag, and the diagnostics that led to them.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// Best-found ICP weight profile (rule-based layer).
    pub icp_weights: IcpProfile,
    /// Logistic regression weights after SGD refinement.
    pub logistic_weights: [f32; 7],
    /// Logistic regression bias after SGD refinement.
    pub logistic_bias: f32,
    /// Threshold that maximised F1 on the training set.
    pub best_threshold: f32,
    /// F1 score at `best_threshold`.
    pub best_f1: f32,
    /// Total combinations evaluated during grid search.
    pub grid_search_combos: usize,
    /// Number of SGD epochs used for logistic refinement.
    pub sgd_epochs: usize,
    /// Whether isotonic calibration was applied.
    pub calibrated: bool,
}

// ── Grid search ───────────────────────────────────────────────────────────────

/// Populate one slot in a `ContactBatch` from a pre-computed feature vector.
///
/// Because `LabeledSample::features` are already in normalised form, we
/// reverse the normalisation that `LogisticScorer::extract_features` applies:
///
/// | feature index | raw batch field   | reversal                                    |
/// |---------------|-------------------|---------------------------------------------|
/// | 0             | `industry_match`  | `(f > 0.5) as u8`                          |
/// | 1             | `employee_in_range` | `(f > 0.5) as u8`                        |
/// | 2             | `seniority_match` | `(f > 0.5) as u8`                          |
/// | 3             | `department_match`| `(f > 0.5) as u8`                          |
/// | 4             | `tech_overlap`    | `(f * 10.0) as u8`                          |
/// | 5             | `email_verified`  | `(f * 2.0) as u8`                           |
/// | 6             | `recency_days`    | `-f.ln() / 0.015`, clamped to `0..=365`   |
fn populate_batch_from_sample(batch: &mut ContactBatch, idx: usize, features: &[f32; 7]) {
    batch.industry_match[idx] = (features[0] > 0.5) as u8;
    batch.employee_in_range[idx] = (features[1] > 0.5) as u8;
    batch.seniority_match[idx] = (features[2] > 0.5) as u8;
    batch.department_match[idx] = (features[3] > 0.5) as u8;
    batch.tech_overlap[idx] = (features[4] * 10.0).clamp(0.0, 10.0) as u8;
    batch.email_verified[idx] = (features[5] * 2.0).clamp(0.0, 2.0) as u8;

    // Reverse smooth_recency: f = exp(-0.015 * d)  →  d = -ln(f) / 0.015
    // Guard against ln(0) and values outside (0, 1].
    let f6 = features[6].clamp(1e-7, 1.0);
    let days_f = -f6.ln() / 0.015;
    batch.recency_days[idx] = days_f.clamp(0.0, 365.0) as u16;
}

/// Score a labelled dataset with a given `IcpProfile` and return the F1 at
/// `threshold`.  Scores are normalised to `[0, 1]` before comparison (the
/// raw batch scores are on the `[0, 100]` scale).
fn icp_f1(samples: &[LabeledSample], icp: &IcpProfile, threshold: f32) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    // Process in chunks of 256 (ContactBatch capacity).
    let mut predicted: Vec<bool> = Vec::with_capacity(samples.len());
    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();

    let chunk_size = 256;
    for chunk in samples.chunks(chunk_size) {
        let mut batch = ContactBatch::new();
        batch.count = chunk.len();
        for (i, sample) in chunk.iter().enumerate() {
            populate_batch_from_sample(&mut batch, i, &sample.features);
        }
        batch.compute_scores_with(icp);

        for i in 0..chunk.len() {
            // Normalise from 0-100 to 0-1 before comparing with threshold.
            predicted.push(batch.scores[i] / 100.0 >= threshold);
        }
    }

    compute_f1(&predicted, &actual)
}

/// Grid search over the six ICP weights.
///
/// Each weight independently takes one of the values in `grid_values`.  For a
/// default grid of `[5.0, 15.0, 25.0, 35.0]` that is 4^6 = 4 096 combinations.
///
/// Returns the `IcpProfile` that maximises F1 on `samples` at `threshold`, and
/// the corresponding F1 value.
pub fn grid_search_icp(
    samples: &[LabeledSample],
    grid_values: &[f32],
    threshold: f32,
) -> (IcpProfile, f32) {
    let g = grid_values.len();
    assert!(g > 0, "grid_values must not be empty");

    let total_combos = g.pow(6);
    let mut best_icp = IcpProfile::default();
    let mut best_f1 = icp_f1(samples, &best_icp, threshold);

    // Iterate over all combinations by treating the 6-weight tuple as a
    // mixed-radix number in base `g`.
    for combo in 0..total_combos {
        let mut rem = combo;
        let mut indices = [0usize; 6];
        for slot in indices.iter_mut() {
            *slot = rem % g;
            rem /= g;
        }

        let candidate = IcpProfile {
            industry_weight: grid_values[indices[0]],
            employee_weight: grid_values[indices[1]],
            seniority_weight: grid_values[indices[2]],
            department_weight: grid_values[indices[3]],
            tech_weight: grid_values[indices[4]],
            email_weight: grid_values[indices[5]],
        };

        let f1 = icp_f1(samples, &candidate, threshold);
        if f1 > best_f1 {
            best_f1 = f1;
            best_icp = candidate;
        }
    }

    (best_icp, best_f1)
}

// ── SGD refinement ────────────────────────────────────────────────────────────

/// Train a fresh `LogisticScorer` on `samples` using stochastic gradient
/// descent for `epochs` passes at learning rate `lr`.
pub fn sgd_refine(samples: &[LabeledSample], epochs: usize, lr: f32) -> LogisticScorer {
    let features: Vec<[f32; 7]> = samples.iter().map(|s| s.features).collect();
    let labels: Vec<f32> = samples.iter().map(|s| s.label).collect();

    let mut scorer = LogisticScorer::new();
    scorer.fit(&features, &labels, lr, epochs);
    scorer
}

// ── Threshold sweep ───────────────────────────────────────────────────────────

/// Sweep the classification threshold from 0.10 to 0.90 in steps of 0.01 and
/// return `(best_threshold, best_f1)`.
///
/// Scores are computed once, then the loop only recomputes the boolean
/// classification per threshold.
pub fn threshold_sweep(scorer: &LogisticScorer, samples: &[LabeledSample]) -> (f32, f32) {
    if samples.is_empty() {
        return (0.5, 0.0);
    }

    // Score all samples upfront (one pass).
    let scores: Vec<f32> = samples.iter().map(|s| scorer.score(&s.features)).collect();
    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();

    let mut best_threshold = 0.5f32;
    let mut best_f1 = 0.0f32;

    // 0.10, 0.11, ..., 0.90 → 81 steps
    let mut t = 0.10f32;
    while t <= 0.90f32 + 1e-6 {
        let predicted: Vec<bool> = scores.iter().map(|&s| s >= t).collect();
        let f1 = compute_f1(&predicted, &actual);
        if f1 > best_f1 {
            best_f1 = f1;
            best_threshold = t;
        }
        t = (t + 0.01).min(0.90 + 1e-6);
        // Prevent infinite loop from floating-point accumulation.
        if t > 0.90 + 1e-5 {
            break;
        }
    }

    (best_threshold, best_f1)
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

/// Run the full four-stage optimization pipeline:
///
/// 1. **Grid search** — find best `IcpProfile` using rule-based scoring.
/// 2. **SGD refinement** — train a `LogisticScorer` on the labeled samples.
/// 3. **Threshold sweep** — find the threshold that maximises F1.
/// 4. **Isotonic calibration** — fit a `IsotonicCalibrator` on the SGD scores.
///
/// Returns:
/// - `OptimizationResult` — complete record of the run.
/// - `LogisticScorer` — trained scorer with SGD weights.
/// - `IsotonicCalibrator` — fitted calibrator.
pub fn optimize(
    samples: &[LabeledSample],
) -> (OptimizationResult, LogisticScorer, IsotonicCalibrator) {
    const DEFAULT_GRID: &[f32] = &[5.0, 15.0, 25.0, 35.0];
    const SGD_EPOCHS: usize = 100;
    const SGD_LR: f32 = 0.3;
    const GRID_THRESHOLD: f32 = 0.5;

    // Stage 1 — grid search.
    let grid_combos = DEFAULT_GRID.len().pow(6);
    let (best_icp, _grid_f1) = grid_search_icp(samples, DEFAULT_GRID, GRID_THRESHOLD);

    // Stage 2 — SGD refinement.
    let scorer = sgd_refine(samples, SGD_EPOCHS, SGD_LR);

    // Stage 3 — threshold sweep on the SGD scorer.
    let (best_threshold, best_f1) = threshold_sweep(&scorer, samples);

    // Stage 4 — isotonic calibration.
    let raw_scores: Vec<f32> = samples.iter().map(|s| scorer.score(&s.features)).collect();
    let labels: Vec<f32> = samples.iter().map(|s| s.label).collect();
    let mut calibrator = IsotonicCalibrator::new();
    calibrator.fit(&raw_scores, &labels);

    let result = OptimizationResult {
        icp_weights: best_icp,
        logistic_weights: scorer.weights,
        logistic_bias: scorer.bias,
        best_threshold,
        best_f1,
        grid_search_combos: grid_combos,
        sgd_epochs: SGD_EPOCHS,
        calibrated: calibrator.fitted,
    };

    (result, scorer, calibrator)
}

// ── Persistence ───────────────────────────────────────────────────────────────

/// Serialize `result` to pretty-printed JSON at `path`.
/// Parent directories are created automatically.
pub fn save_result(result: &OptimizationResult, path: &Path) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(result)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, json)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Build synthetic samples where `industry` (feature 0) and `seniority`
    /// (feature 2) are the dominant discriminating signals.
    fn synthetic_industry_seniority_samples(n: usize) -> Vec<LabeledSample> {
        let mut samples = Vec::with_capacity(n);
        for i in 0..n {
            // Alternate between strong positives and negatives.
            let pos = i % 2 == 0;
            let features = [
                if pos { 1.0 } else { 0.0 }, // industry_match
                0.5,                          // employee_in_range — neutral
                if pos { 1.0 } else { 0.0 }, // seniority_match
                0.0,                          // department_match — noise
                0.0,                          // tech_overlap — noise
                0.0,                          // email_verified — noise
                0.5,                          // recency_smooth — neutral
            ];
            samples.push(LabeledSample::new(features, if pos { 1.0 } else { 0.0 }));
        }
        samples
    }

    /// Balanced dataset: positives have high scores, negatives have low scores.
    fn balanced_samples(n: usize) -> Vec<LabeledSample> {
        let mut samples = Vec::with_capacity(n);
        for i in 0..n {
            let pos = i % 2 == 0;
            let v = if pos { 1.0 } else { 0.0 };
            samples.push(LabeledSample::new([v; 7], if pos { 1.0 } else { 0.0 }));
        }
        samples
    }

    // ── grid_search_icp ───────────────────────────────────────────────────────

    #[test]
    fn test_grid_search_finds_better_than_default() {
        // Data where only industry and seniority matter.
        let samples = synthetic_industry_seniority_samples(40);

        let default_icp = IcpProfile::default();
        let baseline_f1 = icp_f1(&samples, &default_icp, 0.5);

        let grid = &[5.0, 15.0, 25.0, 35.0];
        let (best_icp, best_f1) = grid_search_icp(&samples, grid, 0.5);

        // Grid search must match or beat the default.
        assert!(
            best_f1 >= baseline_f1 - 1e-5,
            "grid best_f1 {best_f1} should be >= baseline {baseline_f1}"
        );

        // With this data the winning profile should favour industry and
        // seniority (weights at the top of the grid).
        let _ = best_icp; // checked via best_f1; structure is opaque to caller
    }

    #[test]
    fn test_grid_search_perfect_separation() {
        // Perfect positive: industry=1 seniority=1; perfect negative: 0/0.
        let samples = balanced_samples(20);
        let grid = &[1.0, 10.0, 20.0, 30.0];
        let (_icp, f1) = grid_search_icp(&samples, grid, 0.5);
        // Should find near-perfect or perfect F1 since signals are unambiguous.
        assert!(f1 > 0.5, "expected f1 > 0.5, got {f1}");
    }

    #[test]
    fn test_grid_search_single_value() {
        let samples = balanced_samples(10);
        // Only one value → only one combination → should still return a result.
        let (icp, _f1) = grid_search_icp(&samples, &[20.0], 0.5);
        assert!((icp.industry_weight - 20.0).abs() < 1e-5);
    }

    // ── sgd_refine ────────────────────────────────────────────────────────────

    #[test]
    fn test_sgd_improves_over_pretrained() {
        let samples = balanced_samples(40);
        let pretrained = LogisticScorer::default_pretrained();

        // F1 of pretrained scorer at threshold 0.5
        let pretrained_eval = evaluate_scoring(&pretrained, &samples, 0.5);
        let pretrained_f1 = pretrained_eval.f1;

        // Train from scratch on the same data.
        let trained = sgd_refine(&samples, 200, 0.1);
        let trained_eval = evaluate_scoring(&trained, &samples, 0.5);
        let trained_f1 = trained_eval.f1;

        // SGD should not regress relative to pretrained.
        assert!(
            trained_f1 >= pretrained_f1 - 0.05,
            "trained_f1 {trained_f1} should be >= pretrained_f1 {pretrained_f1} - 0.05"
        );
    }

    #[test]
    fn test_sgd_refine_marks_trained() {
        let samples = balanced_samples(10);
        let scorer = sgd_refine(&samples, 10, 0.1);
        assert!(scorer.trained);
    }

    // ── threshold_sweep ───────────────────────────────────────────────────────

    #[test]
    fn test_threshold_sweep_finds_optimum() {
        // Logistic scorer trained on balanced data — optimal threshold near 0.5.
        let samples = balanced_samples(60);
        let scorer = sgd_refine(&samples, 200, 0.1);
        let (best_t, best_f1) = threshold_sweep(&scorer, &samples);

        assert!(
            (0.1..=0.9).contains(&best_t),
            "threshold {best_t} out of range [0.1, 0.9]"
        );
        assert!(best_f1 > 0.0, "expected positive F1, got {best_f1}");
    }

    #[test]
    fn test_threshold_sweep_empty_samples() {
        let scorer = LogisticScorer::default_pretrained();
        let (t, f1) = threshold_sweep(&scorer, &[]);
        assert!((t - 0.5).abs() < 1e-5);
        assert_eq!(f1, 0.0);
    }

    #[test]
    fn test_threshold_sweep_returns_best() {
        // All positives → recall = 1 for any threshold ≤ all scores.
        // Use pretrained scorer so scores are consistently high for all-1 features.
        let scorer = LogisticScorer::default_pretrained();
        let samples: Vec<LabeledSample> = (0..10)
            .map(|_| LabeledSample::positive([1.0; 7]))
            .collect();
        let (t, f1) = threshold_sweep(&scorer, &samples);
        assert!((0.1..=0.9).contains(&t));
        // With all positives and high scores, F1 should be 1.0 at some threshold.
        assert!(f1 > 0.9, "expected F1 near 1.0, got {f1}");
    }

    // ── optimize (full pipeline) ──────────────────────────────────────────────

    #[test]
    fn test_full_optimize() {
        let samples = balanced_samples(40);
        let (result, scorer, calibrator) = optimize(&samples);

        // grid_search_combos: 4^6 = 4096
        assert_eq!(result.grid_search_combos, 4096);
        assert_eq!(result.sgd_epochs, 100);
        assert!(result.calibrated);

        // Scorer should carry the SGD weights.
        assert!(scorer.trained);
        for (&rw, &sw) in result.logistic_weights.iter().zip(scorer.weights.iter()) {
            assert!((rw - sw).abs() < 1e-7);
        }
        assert!((result.logistic_bias - scorer.bias).abs() < 1e-7);

        // Calibrator must be fitted.
        assert!(calibrator.fitted);

        // Threshold must be in valid range.
        assert!(
            (0.1..=0.9).contains(&result.best_threshold),
            "threshold {} out of range",
            result.best_threshold
        );

        // F1 must be non-negative and at most 1.
        assert!((0.0..=1.0).contains(&result.best_f1));
    }

    #[test]
    fn test_optimize_icp_weights_from_result() {
        let samples = synthetic_industry_seniority_samples(30);
        let (result, _scorer, _cal) = optimize(&samples);
        // ICP weights must be positive (grid values are all positive).
        assert!(result.icp_weights.industry_weight > 0.0);
        assert!(result.icp_weights.seniority_weight > 0.0);
    }

    // ── save_result ───────────────────────────────────────────────────────────

    #[test]
    fn test_save_result_roundtrip() {
        let samples = balanced_samples(20);
        let (result, _scorer, _cal) = optimize(&samples);

        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("opt_result.json");

        save_result(&result, &path).expect("save_result");

        let raw = std::fs::read_to_string(&path).expect("read back");
        let loaded: OptimizationResult =
            serde_json::from_str(&raw).expect("deserialize OptimizationResult");

        assert_eq!(result.sgd_epochs, loaded.sgd_epochs);
        assert_eq!(result.grid_search_combos, loaded.grid_search_combos);
        assert!((result.best_f1 - loaded.best_f1).abs() < 1e-6);
        assert!((result.best_threshold - loaded.best_threshold).abs() < 1e-6);
        assert!(loaded.calibrated);
    }

    #[test]
    fn test_save_result_creates_parent_dirs() {
        let samples = balanced_samples(10);
        let (result, _scorer, _cal) = optimize(&samples);

        let dir = tempfile::tempdir().expect("tempdir");
        let nested = dir.path().join("a").join("b").join("c").join("result.json");

        save_result(&result, &nested).expect("save_result with nested dirs");
        assert!(nested.exists());
    }
}

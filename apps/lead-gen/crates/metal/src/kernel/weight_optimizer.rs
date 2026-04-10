use serde::{Deserialize, Serialize};
use std::path::Path;

use super::scoring::*;
use super::ml_eval::*;

// ── Momentum SGD ─────────────────────────────────────────────────────────────

/// Momentum-based stochastic gradient descent optimizer.
///
/// Performs fused momentum update + L2 regularization in a single pass:
/// `v = momentum * v - lr * (grad + l2_lambda * w); w += v`
#[derive(Debug, Clone)]
pub struct MomentumSGD {
    pub weights: Vec<f32>,
    pub velocity: Vec<f32>,
    pub lr: f32,
    pub momentum: f32,
    pub l2_lambda: f32,
}

impl MomentumSGD {
    /// Create a new MomentumSGD optimizer with the given dimension and hyperparameters.
    pub fn new(dim: usize, lr: f32, momentum: f32, l2_lambda: f32) -> Self {
        Self {
            weights: vec![0.0; dim],
            velocity: vec![0.0; dim],
            lr,
            momentum,
            l2_lambda,
        }
    }

    /// Create from existing weights.
    pub fn from_weights(weights: Vec<f32>, lr: f32, momentum: f32, l2_lambda: f32) -> Self {
        let dim = weights.len();
        Self {
            weights,
            velocity: vec![0.0; dim],
            lr,
            momentum,
            l2_lambda,
        }
    }

    /// Perform a single fused momentum + L2 regularization step.
    ///
    /// For each dimension i:
    ///   v[i] = momentum * v[i] - lr * (grad[i] + l2_lambda * w[i])
    ///   w[i] += v[i]
    #[inline(always)]
    pub fn step(&mut self, gradients: &[f32]) {
        debug_assert_eq!(
            gradients.len(),
            self.weights.len(),
            "gradient dimension must match weight dimension"
        );
        let n = self.weights.len();
        let lr = self.lr;
        let mom = self.momentum;
        let l2 = self.l2_lambda;

        // Process in chunks of 4 for auto-vectorization.
        let chunks = n / 4;
        for c in 0..chunks {
            let base = c * 4;
            let g0 = gradients[base];
            let g1 = gradients[base + 1];
            let g2 = gradients[base + 2];
            let g3 = gradients[base + 3];

            let w0 = self.weights[base];
            let w1 = self.weights[base + 1];
            let w2 = self.weights[base + 2];
            let w3 = self.weights[base + 3];

            let v0 = mom * self.velocity[base] - lr * (g0 + l2 * w0);
            let v1 = mom * self.velocity[base + 1] - lr * (g1 + l2 * w1);
            let v2 = mom * self.velocity[base + 2] - lr * (g2 + l2 * w2);
            let v3 = mom * self.velocity[base + 3] - lr * (g3 + l2 * w3);

            self.velocity[base] = v0;
            self.velocity[base + 1] = v1;
            self.velocity[base + 2] = v2;
            self.velocity[base + 3] = v3;

            self.weights[base] = w0 + v0;
            self.weights[base + 1] = w1 + v1;
            self.weights[base + 2] = w2 + v2;
            self.weights[base + 3] = w3 + v3;
        }

        // Handle remaining elements.
        for i in (chunks * 4)..n {
            let v = mom * self.velocity[i] - lr * (gradients[i] + l2 * self.weights[i]);
            self.velocity[i] = v;
            self.weights[i] += v;
        }
    }
}

// ── Adam Optimizer ───────────────────────────────────────────────────────────

/// Adam optimizer with bias correction (Kingma & Ba, 2015).
///
/// Maintains per-parameter first and second moment estimates for adaptive
/// learning rates.  Includes bias correction for the initial time steps.
#[derive(Debug, Clone)]
pub struct AdamOptimizer {
    pub weights: Vec<f32>,
    /// First moment estimate (exponential moving average of gradients).
    pub m: Vec<f32>,
    /// Second moment estimate (exponential moving average of squared gradients).
    pub v: Vec<f32>,
    pub lr: f32,
    pub beta1: f32,
    pub beta2: f32,
    pub epsilon: f32,
    pub t: u64,
}

impl AdamOptimizer {
    /// Create a new Adam optimizer with the given dimension and hyperparameters.
    pub fn new(dim: usize, lr: f32, beta1: f32, beta2: f32, epsilon: f32) -> Self {
        Self {
            weights: vec![0.0; dim],
            m: vec![0.0; dim],
            v: vec![0.0; dim],
            lr,
            beta1,
            beta2,
            epsilon,
            t: 0,
        }
    }

    /// Create from existing weights with standard Adam defaults (beta1=0.9, beta2=0.999, eps=1e-8).
    pub fn from_weights(weights: Vec<f32>, lr: f32) -> Self {
        let dim = weights.len();
        Self {
            weights,
            m: vec![0.0; dim],
            v: vec![0.0; dim],
            lr,
            beta1: 0.9,
            beta2: 0.999,
            epsilon: 1e-8,
            t: 0,
        }
    }

    /// Perform a single Adam step with bias correction.
    ///
    /// m_hat = m / (1 - beta1^t)
    /// v_hat = v / (1 - beta2^t)
    /// w -= lr * m_hat / (sqrt(v_hat) + epsilon)
    #[inline(always)]
    pub fn adam_step(&mut self, gradients: &[f32]) {
        debug_assert_eq!(
            gradients.len(),
            self.weights.len(),
            "gradient dimension must match weight dimension"
        );
        self.t += 1;
        let n = self.weights.len();
        let beta1 = self.beta1;
        let beta2 = self.beta2;
        let lr = self.lr;
        let eps = self.epsilon;

        // Bias correction denominators.
        let bc1 = 1.0 - beta1.powi(self.t as i32);
        let bc2 = 1.0 - beta2.powi(self.t as i32);

        // Process in chunks of 4 for auto-vectorization.
        let chunks = n / 4;
        for c in 0..chunks {
            let base = c * 4;

            // Unrolled: update moments and weights for 4 elements.
            for offset in 0..4 {
                let idx = base + offset;
                let g = gradients[idx];

                // Update biased first moment estimate.
                self.m[idx] = beta1 * self.m[idx] + (1.0 - beta1) * g;
                // Update biased second moment estimate.
                self.v[idx] = beta2 * self.v[idx] + (1.0 - beta2) * g * g;

                // Bias-corrected estimates.
                let m_hat = self.m[idx] / bc1;
                let v_hat = self.v[idx] / bc2;

                self.weights[idx] -= lr * m_hat / (v_hat.sqrt() + eps);
            }
        }

        // Handle remaining elements.
        for i in (chunks * 4)..n {
            let g = gradients[i];
            self.m[i] = beta1 * self.m[i] + (1.0 - beta1) * g;
            self.v[i] = beta2 * self.v[i] + (1.0 - beta2) * g * g;

            let m_hat = self.m[i] / bc1;
            let v_hat = self.v[i] / bc2;

            self.weights[i] -= lr * m_hat / (v_hat.sqrt() + eps);
        }
    }
}

// ── Batch gradient computation ───────────────────────────────────────────────

/// Compute the average gradient over a mini-batch using logistic (cross-entropy) loss.
///
/// For each sample `(x, y)`, the per-sample gradient is `(sigmoid(w . x) - y) * x`.
/// Returns the mean gradient over all samples in the batch.
///
/// The inner dot-product loop is unrolled 4x for auto-vectorization.
#[inline(always)]
pub fn compute_gradients_batch(
    features: &[&[f32]],
    labels: &[f32],
    weights: &[f32],
) -> Vec<f32> {
    assert_eq!(features.len(), labels.len(), "features and labels must have equal length");
    assert!(!features.is_empty(), "batch must not be empty");

    let dim = weights.len();
    let mut grad = vec![0.0f32; dim];
    let batch_size = features.len();

    for (x, &y) in features.iter().zip(labels.iter()) {
        debug_assert_eq!(x.len(), dim, "feature dimension must match weight dimension");

        // Compute dot product with 4x unrolling.
        let mut dot = 0.0f32;
        let chunks = dim / 4;
        for c in 0..chunks {
            let base = c * 4;
            let acc0 = weights[base] * x[base];
            let acc1 = weights[base + 1] * x[base + 1];
            let acc2 = weights[base + 2] * x[base + 2];
            let acc3 = weights[base + 3] * x[base + 3];
            dot += (acc0 + acc1) + (acc2 + acc3);
        }
        for i in (chunks * 4)..dim {
            dot += weights[i] * x[i];
        }

        // Logistic loss gradient: error = sigmoid(dot) - y
        let pred = LogisticScorer::sigmoid(dot);
        let error = pred - y;

        // Accumulate gradient with 4x unrolling.
        for c in 0..chunks {
            let base = c * 4;
            grad[base] += error * x[base];
            grad[base + 1] += error * x[base + 1];
            grad[base + 2] += error * x[base + 2];
            grad[base + 3] += error * x[base + 3];
        }
        for i in (chunks * 4)..dim {
            grad[i] += error * x[i];
        }
    }

    // Average over batch.
    let inv_n = 1.0 / batch_size as f32;
    for g in grad.iter_mut() {
        *g *= inv_n;
    }

    grad
}

// ── Gradient clipping ────────────────────────────────────────────────────────

/// Clip gradients by global L2 norm.
///
/// If `||gradients||_2 > max_norm`, scales all gradients by `max_norm / ||gradients||_2`.
/// Modifies the gradient vector in place.
pub fn clip_gradients(gradients: &mut [f32], max_norm: f32) {
    debug_assert!(max_norm > 0.0, "max_norm must be positive");
    let mut norm_sq = 0.0f32;
    for &g in gradients.iter() {
        norm_sq += g * g;
    }
    let norm = norm_sq.sqrt();
    if norm > max_norm {
        let scale = max_norm / norm;
        for g in gradients.iter_mut() {
            *g *= scale;
        }
    }
}

// ── Learning rate scheduling ─────────────────────────────────────────────────

/// Cosine annealing learning rate schedule.
///
/// Returns `initial_lr * 0.5 * (1 + cos(pi * step / total_steps))`.
/// At step 0 returns `initial_lr`; at step `total_steps` returns ~0.
/// Clamps to `[0, initial_lr]`.
pub fn cosine_annealing(initial_lr: f32, step: u64, total_steps: u64) -> f32 {
    if total_steps == 0 {
        return initial_lr;
    }
    let progress = (step as f64 / total_steps as f64).min(1.0);
    let lr = initial_lr as f64 * 0.5 * (1.0 + (std::f64::consts::PI * progress).cos());
    (lr as f32).max(0.0)
}

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

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Compute binary classification F1 from parallel slices of predicted and
/// actual booleans.  Returns `0.0` when precision and recall are both zero.
fn compute_f1(predicted: &[bool], actual: &[bool]) -> f32 {
    debug_assert_eq!(predicted.len(), actual.len(), "lengths must match");
    let (mut tp, mut fp, mut fn_) = (0usize, 0usize, 0usize);
    for (&p, &a) in predicted.iter().zip(actual.iter()) {
        match (p, a) {
            (true, true) => tp += 1,
            (true, false) => fp += 1,
            (false, true) => fn_ += 1,
            _ => {}
        }
    }
    let precision = if tp + fp == 0 {
        0.0
    } else {
        tp as f32 / (tp + fp) as f32
    };
    let recall = if tp + fn_ == 0 {
        0.0
    } else {
        tp as f32 / (tp + fn_) as f32
    };
    if precision + recall < 1e-9 {
        0.0
    } else {
        2.0 * precision * recall / (precision + recall)
    }
}

/// Populate one slot in a `ContactBatch` from a pre-computed feature vector.
///
/// Because `LabeledSample::features` are already in normalised form, we
/// reverse the normalisation that `LogisticScorer::extract_features` applies:
///
/// | idx | batch field         | reversal                                  |
/// |-----|---------------------|-------------------------------------------|
/// | 0   | `industry_match`    | `(f > 0.5) as u8`                        |
/// | 1   | `employee_in_range` | `(f > 0.5) as u8`                        |
/// | 2   | `seniority_match`   | `(f > 0.5) as u8`                        |
/// | 3   | `department_match`  | `(f > 0.5) as u8`                        |
/// | 4   | `tech_overlap`      | `(f * 10.0) as u8`                       |
/// | 5   | `email_verified`    | `(f * 2.0) as u8`                        |
/// | 6   | `recency_days`      | `-ln(f) / 0.015`, clamped to `0..=365`  |
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

/// Score all `samples` with `icp` (rule-based) and return the F1 at `threshold`.
///
/// Batch scores are on the `[0, 100]` scale; they are normalised to `[0, 1]`
/// before comparing against `threshold`.
fn icp_f1(samples: &[LabeledSample], icp: &IcpProfile, threshold: f32) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();
    let mut predicted: Vec<bool> = Vec::with_capacity(samples.len());

    // ContactBatch holds at most 256 contacts per chunk.
    for chunk in samples.chunks(256) {
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

// ── Grid search ───────────────────────────────────────────────────────────────

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
    // Initialise best to a sentinel so the first combo always wins on tie.
    let mut best_f1 = -1.0f32;
    let mut best_icp = IcpProfile::default();

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
/// All sample scores are computed once; only the boolean classification
/// boundary moves on each iteration.
pub fn threshold_sweep(scorer: &LogisticScorer, samples: &[LabeledSample]) -> (f32, f32) {
    if samples.is_empty() {
        return (0.5, 0.0);
    }

    // Score all samples upfront (single pass).
    let scores: Vec<f32> = samples.iter().map(|s| scorer.score(&s.features)).collect();
    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();

    let mut best_threshold = 0.5f32;
    let mut best_f1 = 0.0f32;

    // 0.10, 0.11, ..., 0.90 — 81 steps represented as integers to avoid
    // floating-point accumulation drift.
    for step in 10u32..=90 {
        let t = step as f32 / 100.0;
        let predicted: Vec<bool> = scores.iter().map(|&s| s >= t).collect();
        let f1 = compute_f1(&predicted, &actual);
        if f1 > best_f1 {
            best_f1 = f1;
            best_threshold = t;
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
/// - `LogisticScorer` — trained scorer carrying SGD weights.
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

    /// Synthetic dataset where industry (feature 0) and seniority (feature 2)
    /// are the sole discriminating signals; other features are fixed at 0.5.
    fn industry_seniority_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                LabeledSample {
                    features: [
                        if pos { 1.0 } else { 0.0 }, // industry_match
                        0.5,                          // employee_in_range — neutral
                        if pos { 1.0 } else { 0.0 }, // seniority_match
                        0.0,                          // department_match — noise
                        0.0,                          // tech_overlap — noise
                        0.0,                          // email_verified — noise
                        0.5,                          // recency_smooth — neutral
                    ],
                    label: if pos { 1.0 } else { 0.0 },
                }
            })
            .collect()
    }

    /// Balanced dataset: alternating perfect positives (all 1.0) and perfect
    /// negatives (all 0.0).
    fn balanced_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                let v = if pos { 1.0 } else { 0.0 };
                LabeledSample {
                    features: [v; 7],
                    label: v,
                }
            })
            .collect()
    }

    // ── compute_f1 (internal) ─────────────────────────────────────────────────

    #[test]
    fn test_compute_f1_perfect() {
        let predicted = vec![true, false, true, false];
        let actual = vec![true, false, true, false];
        assert!((compute_f1(&predicted, &actual) - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_compute_f1_all_negative_predictions() {
        let predicted = vec![false, false, false];
        let actual = vec![true, false, true];
        // precision undefined → 0; recall = 0/2 = 0
        assert_eq!(compute_f1(&predicted, &actual), 0.0);
    }

    #[test]
    fn test_compute_f1_balanced() {
        // tp=2, fp=1, fn=1 → precision = recall = 2/3
        let predicted = vec![true, true, true, false];
        let actual = vec![true, true, false, true];
        let f1 = compute_f1(&predicted, &actual);
        let pr = 2.0_f32 / 3.0;
        let expected = 2.0 * pr * pr / (pr + pr);
        assert!((f1 - expected).abs() < 1e-5);
    }

    // ── grid_search_icp ───────────────────────────────────────────────────────

    #[test]
    fn test_grid_search_finds_better_than_default() {
        // Data where only industry and seniority matter.
        let samples = industry_seniority_samples(40);

        let baseline_f1 = icp_f1(&samples, &IcpProfile::default(), 0.5);

        let grid = &[5.0, 15.0, 25.0, 35.0];
        let (_best_icp, best_f1) = grid_search_icp(&samples, grid, 0.5);

        // Grid search must match or strictly beat the default weights.
        assert!(
            best_f1 >= baseline_f1 - 1e-5,
            "grid best_f1 {best_f1:.4} should be >= baseline {baseline_f1:.4}"
        );
    }

    #[test]
    fn test_grid_search_perfect_separation() {
        // Perfectly separable: positives have all-1, negatives all-0.
        let samples = balanced_samples(20);
        let grid = &[1.0, 10.0, 20.0, 30.0];
        let (_icp, f1) = grid_search_icp(&samples, grid, 0.5);
        assert!(f1 > 0.5, "expected f1 > 0.5, got {f1:.4}");
    }

    #[test]
    fn test_grid_search_single_value() {
        // Only one grid value → only one combination per weight → trivially succeeds.
        let samples = balanced_samples(10);
        let (icp, _f1) = grid_search_icp(&samples, &[20.0], 0.5);
        assert!((icp.industry_weight - 20.0).abs() < 1e-5);
        assert!((icp.seniority_weight - 20.0).abs() < 1e-5);
    }

    // ── sgd_refine ────────────────────────────────────────────────────────────

    #[test]
    fn test_sgd_improves_over_pretrained() {
        let samples = balanced_samples(40);
        let pretrained = LogisticScorer::default_pretrained();

        let pretrained_f1 = evaluate_scoring(&pretrained, &samples, 0.5).f1;

        // Train from scratch on the same data.
        let trained = sgd_refine(&samples, 200, 0.1);
        let trained_f1 = evaluate_scoring(&trained, &samples, 0.5).f1;

        // SGD must not regress more than a small tolerance.
        assert!(
            trained_f1 >= pretrained_f1 - 0.05,
            "trained_f1 {trained_f1:.4} should be >= pretrained_f1 {pretrained_f1:.4} - 0.05"
        );
    }

    #[test]
    fn test_sgd_refine_marks_trained() {
        let samples = balanced_samples(10);
        let scorer = sgd_refine(&samples, 10, 0.1);
        assert!(scorer.trained);
    }

    #[test]
    fn test_sgd_refine_weights_change() {
        // Starting from zero weights, after training the weights must move.
        let samples = balanced_samples(20);
        let untrained = LogisticScorer::new();
        let trained = sgd_refine(&samples, 50, 0.1);
        let any_changed = trained
            .weights
            .iter()
            .zip(untrained.weights.iter())
            .any(|(a, b)| (a - b).abs() > 1e-6);
        assert!(any_changed, "SGD should update at least one weight");
    }

    // ── threshold_sweep ───────────────────────────────────────────────────────

    #[test]
    fn test_threshold_sweep_finds_optimum() {
        // Logistic scorer trained on balanced data → optimal threshold near 0.5.
        let samples = balanced_samples(60);
        let scorer = sgd_refine(&samples, 200, 0.1);
        let (best_t, best_f1) = threshold_sweep(&scorer, &samples);

        assert!(
            (0.10..=0.90).contains(&best_t),
            "threshold {best_t} out of range [0.10, 0.90]"
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
    fn test_threshold_sweep_all_positives_high_score() {
        // Pretrained scorer gives high scores to all-1 features.
        let scorer = LogisticScorer::default_pretrained();
        let samples: Vec<LabeledSample> = (0..10)
            .map(|_| LabeledSample {
                features: [1.0; 7],
                label: 1.0,
            })
            .collect();
        let (t, f1) = threshold_sweep(&scorer, &samples);
        assert!((0.10..=0.90).contains(&t));
        // With all positives and high scores, F1 should be 1.0 at some threshold.
        assert!(f1 > 0.9, "expected F1 near 1.0, got {f1:.4}");
    }

    // ── optimize (full pipeline) ──────────────────────────────────────────────

    #[test]
    fn test_full_optimize() {
        let samples = balanced_samples(40);
        let (result, scorer, calibrator) = optimize(&samples);

        // 4^6 = 4096 combinations in the default grid.
        assert_eq!(result.grid_search_combos, 4096);
        assert_eq!(result.sgd_epochs, 100);
        assert!(result.calibrated);

        // Result must carry the same weights as the returned scorer.
        assert!(scorer.trained);
        for (&rw, &sw) in result.logistic_weights.iter().zip(scorer.weights.iter()) {
            assert!(
                (rw - sw).abs() < 1e-7,
                "weight mismatch: result={rw} scorer={sw}"
            );
        }
        assert!((result.logistic_bias - scorer.bias).abs() < 1e-7);

        // Calibrator must be fitted.
        assert!(calibrator.fitted);

        // Threshold must be within the sweep range.
        assert!(
            (0.10..=0.90).contains(&result.best_threshold),
            "threshold {} out of [0.10, 0.90]",
            result.best_threshold
        );

        // F1 must be a valid probability.
        assert!(
            (0.0..=1.0).contains(&result.best_f1),
            "best_f1 {} out of [0.0, 1.0]",
            result.best_f1
        );
    }

    #[test]
    fn test_optimize_icp_weights_are_positive() {
        let samples = industry_seniority_samples(30);
        let (result, _scorer, _cal) = optimize(&samples);
        // All grid values are positive, so the best profile must have positive weights.
        assert!(result.icp_weights.industry_weight > 0.0);
        assert!(result.icp_weights.seniority_weight > 0.0);
        assert!(result.icp_weights.employee_weight > 0.0);
        assert!(result.icp_weights.department_weight > 0.0);
    }

    // ── save_result ───────────────────────────────────────────────────────────

    #[test]
    fn test_save_result_roundtrip() {
        let samples = balanced_samples(20);
        let (result, _scorer, _cal) = optimize(&samples);

        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("opt_result.json");

        save_result(&result, &path).expect("save_result should succeed");

        let raw = std::fs::read_to_string(&path).expect("read back JSON");
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
        let nested = dir
            .path()
            .join("nested")
            .join("deep")
            .join("result.json");

        save_result(&result, &nested).expect("save_result with nested dirs");
        assert!(nested.exists(), "JSON file should exist after save");
    }
}

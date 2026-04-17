use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::criteria::IcpWeights;
use crate::math::sigmoid;
use crate::scoring::{ContactBatch, LogisticScorer};
use crate::calibration::IsotonicCalibrator;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabeledSample {
    pub features: [f32; 7],
    pub label: f32,
}

impl LabeledSample {
    pub fn new(features: [f32; 7], label: f32) -> Self {
        Self { features, label }
    }

    pub fn positive(features: [f32; 7]) -> Self {
        Self::new(features, 1.0)
    }

    pub fn negative(features: [f32; 7]) -> Self {
        Self::new(features, 0.0)
    }
}

#[derive(Debug, Clone)]
pub struct MomentumSGD {
    pub weights: Vec<f32>,
    pub velocity: Vec<f32>,
    pub lr: f32,
    pub momentum: f32,
    pub l2_lambda: f32,
}

impl MomentumSGD {
    pub fn new(dim: usize, lr: f32, momentum: f32, l2_lambda: f32) -> Self {
        Self {
            weights: vec![0.0; dim],
            velocity: vec![0.0; dim],
            lr,
            momentum,
            l2_lambda,
        }
    }

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

    #[inline(always)]
    pub fn step(&mut self, gradients: &[f32]) {
        debug_assert_eq!(gradients.len(), self.weights.len());
        let n = self.weights.len();
        let lr = self.lr;
        let mom = self.momentum;
        let l2 = self.l2_lambda;

        let chunks = n / 4;
        for c in 0..chunks {
            let base = c * 4;
            let v0 = mom * self.velocity[base] - lr * (gradients[base] + l2 * self.weights[base]);
            let v1 = mom * self.velocity[base + 1] - lr * (gradients[base + 1] + l2 * self.weights[base + 1]);
            let v2 = mom * self.velocity[base + 2] - lr * (gradients[base + 2] + l2 * self.weights[base + 2]);
            let v3 = mom * self.velocity[base + 3] - lr * (gradients[base + 3] + l2 * self.weights[base + 3]);
            self.velocity[base] = v0;
            self.velocity[base + 1] = v1;
            self.velocity[base + 2] = v2;
            self.velocity[base + 3] = v3;
            self.weights[base] += v0;
            self.weights[base + 1] += v1;
            self.weights[base + 2] += v2;
            self.weights[base + 3] += v3;
        }
        for i in (chunks * 4)..n {
            let v = mom * self.velocity[i] - lr * (gradients[i] + l2 * self.weights[i]);
            self.velocity[i] = v;
            self.weights[i] += v;
        }
    }
}

#[derive(Debug, Clone)]
pub struct AdamOptimizer {
    pub weights: Vec<f32>,
    pub m: Vec<f32>,
    pub v: Vec<f32>,
    pub lr: f32,
    pub beta1: f32,
    pub beta2: f32,
    pub epsilon: f32,
    pub t: u64,
}

impl AdamOptimizer {
    pub fn new(dim: usize, lr: f32, beta1: f32, beta2: f32, epsilon: f32) -> Self {
        Self {
            weights: vec![0.0; dim],
            m: vec![0.0; dim],
            v: vec![0.0; dim],
            lr, beta1, beta2, epsilon, t: 0,
        }
    }

    pub fn from_weights(weights: Vec<f32>, lr: f32) -> Self {
        let dim = weights.len();
        Self {
            weights,
            m: vec![0.0; dim],
            v: vec![0.0; dim],
            lr, beta1: 0.9, beta2: 0.999, epsilon: 1e-8, t: 0,
        }
    }

    #[inline(always)]
    pub fn adam_step(&mut self, gradients: &[f32]) {
        debug_assert_eq!(gradients.len(), self.weights.len());
        self.t += 1;
        let n = self.weights.len();
        let beta1 = self.beta1;
        let beta2 = self.beta2;
        let lr = self.lr;
        let eps = self.epsilon;
        let bc1 = 1.0 - beta1.powi(self.t as i32);
        let bc2 = 1.0 - beta2.powi(self.t as i32);

        let chunks = n / 4;
        for c in 0..chunks {
            let base = c * 4;
            for offset in 0..4 {
                let idx = base + offset;
                let g = gradients[idx];
                self.m[idx] = beta1 * self.m[idx] + (1.0 - beta1) * g;
                self.v[idx] = beta2 * self.v[idx] + (1.0 - beta2) * g * g;
                let m_hat = self.m[idx] / bc1;
                let v_hat = self.v[idx] / bc2;
                self.weights[idx] -= lr * m_hat / (v_hat.sqrt() + eps);
            }
        }
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

#[inline(always)]
pub fn compute_gradients_batch(
    features: &[&[f32]],
    labels: &[f32],
    weights: &[f32],
) -> Vec<f32> {
    assert_eq!(features.len(), labels.len());
    assert!(!features.is_empty());

    let dim = weights.len();
    let mut grad = vec![0.0f32; dim];
    let batch_size = features.len();

    for (x, &y) in features.iter().zip(labels.iter()) {
        debug_assert_eq!(x.len(), dim);
        let mut dot = 0.0f32;
        let chunks = dim / 4;
        for c in 0..chunks {
            let base = c * 4;
            dot += (weights[base] * x[base] + weights[base + 1] * x[base + 1])
                + (weights[base + 2] * x[base + 2] + weights[base + 3] * x[base + 3]);
        }
        for i in (chunks * 4)..dim {
            dot += weights[i] * x[i];
        }

        let pred = sigmoid(dot);
        let error = pred - y;

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

    let inv_n = 1.0 / batch_size as f32;
    for g in grad.iter_mut() {
        *g *= inv_n;
    }

    grad
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub icp_weights: IcpWeights,
    pub logistic_weights: [f32; 7],
    pub logistic_bias: f32,
    pub best_threshold: f32,
    pub best_f1: f32,
    pub grid_search_combos: usize,
    pub sgd_epochs: usize,
    pub calibrated: bool,
}

fn compute_f1(predicted: &[bool], actual: &[bool]) -> f32 {
    debug_assert_eq!(predicted.len(), actual.len());
    let (mut tp, mut fp, mut fn_) = (0usize, 0usize, 0usize);
    for (&p, &a) in predicted.iter().zip(actual.iter()) {
        match (p, a) {
            (true, true) => tp += 1,
            (true, false) => fp += 1,
            (false, true) => fn_ += 1,
            _ => {}
        }
    }
    let precision = if tp + fp == 0 { 0.0 } else { tp as f32 / (tp + fp) as f32 };
    let recall = if tp + fn_ == 0 { 0.0 } else { tp as f32 / (tp + fn_) as f32 };
    if precision + recall < 1e-9 { 0.0 } else { 2.0 * precision * recall / (precision + recall) }
}

fn populate_batch_from_sample(batch: &mut ContactBatch, idx: usize, features: &[f32; 7]) {
    batch.industry_match[idx] = (features[0] > 0.5) as u8;
    batch.employee_in_range[idx] = (features[1] > 0.5) as u8;
    batch.seniority_match[idx] = (features[2] > 0.5) as u8;
    batch.department_match[idx] = (features[3] > 0.5) as u8;
    batch.tech_overlap[idx] = (features[4] * 10.0).clamp(0.0, 10.0) as u8;
    batch.email_verified[idx] = (features[5] * 2.0).clamp(0.0, 2.0) as u8;
    let f6 = features[6].clamp(1e-7, 1.0);
    let days_f = -f6.ln() / 0.015;
    batch.recency_days[idx] = days_f.clamp(0.0, 365.0) as u16;
}

fn icp_f1(samples: &[LabeledSample], icp: &IcpWeights, threshold: f32) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();
    let mut predicted: Vec<bool> = Vec::with_capacity(samples.len());

    for chunk in samples.chunks(256) {
        let mut batch = ContactBatch::new();
        batch.count = chunk.len();
        for (i, sample) in chunk.iter().enumerate() {
            populate_batch_from_sample(&mut batch, i, &sample.features);
        }
        batch.compute_scores_with(icp);

        for i in 0..chunk.len() {
            predicted.push(batch.scores[i] / 100.0 >= threshold);
        }
    }

    compute_f1(&predicted, &actual)
}

pub fn grid_search_icp(
    samples: &[LabeledSample],
    grid_values: &[f32],
    threshold: f32,
) -> (IcpWeights, f32) {
    let g = grid_values.len();
    assert!(g > 0);

    let total_combos = g.pow(6);
    let mut best_f1 = -1.0f32;
    let mut best_icp = IcpWeights::default();

    for combo in 0..total_combos {
        let mut rem = combo;
        let mut indices = [0usize; 6];
        for slot in indices.iter_mut() {
            *slot = rem % g;
            rem /= g;
        }

        let candidate = IcpWeights {
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

pub fn sgd_refine(samples: &[LabeledSample], epochs: usize, lr: f32) -> LogisticScorer {
    let features: Vec<[f32; 7]> = samples.iter().map(|s| s.features).collect();
    let labels: Vec<f32> = samples.iter().map(|s| s.label).collect();

    let mut scorer = LogisticScorer::new();
    scorer.fit(&features, &labels, lr, epochs);
    scorer
}

pub fn threshold_sweep(scorer: &LogisticScorer, samples: &[LabeledSample]) -> (f32, f32) {
    if samples.is_empty() {
        return (0.5, 0.0);
    }

    let scores: Vec<f32> = samples.iter().map(|s| scorer.score(&s.features)).collect();
    let actual: Vec<bool> = samples.iter().map(|s| s.label >= 0.5).collect();

    let mut best_threshold = 0.5f32;
    let mut best_f1 = 0.0f32;

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

pub fn optimize(
    samples: &[LabeledSample],
) -> (OptimizationResult, LogisticScorer, IsotonicCalibrator) {
    const DEFAULT_GRID: &[f32] = &[5.0, 15.0, 25.0, 35.0];
    const SGD_EPOCHS: usize = 100;
    const SGD_LR: f32 = 0.3;
    const GRID_THRESHOLD: f32 = 0.5;

    let grid_combos = DEFAULT_GRID.len().pow(6);
    let (best_icp, _grid_f1) = grid_search_icp(samples, DEFAULT_GRID, GRID_THRESHOLD);
    let scorer = sgd_refine(samples, SGD_EPOCHS, SGD_LR);
    let (best_threshold, best_f1) = threshold_sweep(&scorer, samples);

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

pub fn save_result(result: &OptimizationResult, path: &Path) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(result)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, json)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn balanced_samples(n: usize) -> Vec<LabeledSample> {
        (0..n)
            .map(|i| {
                let pos = i % 2 == 0;
                let v = if pos { 1.0 } else { 0.0 };
                LabeledSample { features: [v; 7], label: v }
            })
            .collect()
    }

    #[test]
    fn test_grid_search_perfect_separation() {
        let samples = balanced_samples(20);
        let grid = &[1.0, 10.0, 20.0, 30.0];
        let (_icp, f1) = grid_search_icp(&samples, grid, 0.5);
        assert!(f1 > 0.5, "expected f1 > 0.5, got {f1:.4}");
    }

    #[test]
    fn test_sgd_refine_marks_trained() {
        let samples = balanced_samples(10);
        let scorer = sgd_refine(&samples, 10, 0.1);
        assert!(scorer.trained);
    }

    #[test]
    fn test_threshold_sweep_empty() {
        let scorer = LogisticScorer::default_pretrained();
        let (t, f1) = threshold_sweep(&scorer, &[]);
        assert!((t - 0.5).abs() < 1e-5);
        assert_eq!(f1, 0.0);
    }

    #[test]
    fn test_full_optimize() {
        let samples = balanced_samples(40);
        let (result, scorer, calibrator) = optimize(&samples);
        assert_eq!(result.grid_search_combos, 4096);
        assert!(scorer.trained);
        assert!(calibrator.fitted);
        assert!((0.10..=0.90).contains(&result.best_threshold));
    }

    #[test]
    fn test_momentum_sgd_step() {
        let mut opt = MomentumSGD::new(7, 0.1, 0.9, 0.0);
        let grad = vec![1.0, -1.0, 0.5, -0.5, 0.2, -0.2, 0.0];
        opt.step(&grad);
        assert!(opt.weights[0] < 0.0);
        assert!(opt.weights[1] > 0.0);
    }

    #[test]
    fn test_adam_step() {
        let mut opt = AdamOptimizer::new(7, 0.001, 0.9, 0.999, 1e-8);
        let grad = vec![1.0, -1.0, 0.5, -0.5, 0.2, -0.2, 0.0];
        opt.adam_step(&grad);
        assert_eq!(opt.t, 1);
        assert!(opt.weights[0] < 0.0);
        assert!(opt.weights[1] > 0.0);
    }

    #[test]
    fn test_compute_gradients_batch() {
        let weights = vec![0.0; 7];
        let features: Vec<[f32; 7]> = vec![[1.0; 7]];
        let labels = vec![1.0];
        let refs: Vec<&[f32]> = features.iter().map(|f| f.as_slice()).collect();
        let grad = compute_gradients_batch(&refs, &labels, &weights);
        assert_eq!(grad.len(), 7);
        for &g in &grad {
            assert!((g - (-0.5)).abs() < 1e-5);
        }
    }

    #[test]
    fn test_save_result_roundtrip() {
        let samples = balanced_samples(20);
        let (result, _scorer, _cal) = optimize(&samples);
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("opt_result.json");
        save_result(&result, &path).expect("save_result should succeed");
        let raw = std::fs::read_to_string(&path).expect("read back JSON");
        let loaded: OptimizationResult = serde_json::from_str(&raw).expect("deserialize");
        assert_eq!(result.sgd_epochs, loaded.sgd_epochs);
    }
}

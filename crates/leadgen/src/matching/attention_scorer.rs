/// Self-Attention Lead Scorer.
///
/// From TabM BatchEnsemble (ICLR 2025) and ModernNCA research.  A lightweight
/// single-head self-attention over tabular lead features, capturing non-linear
/// feature interactions that the linear ICP scorer in `scoring/mod.rs` misses.
///
/// Architecture:
///
///   features (d) → Q/K/V projections (d×h) → attention weight → weighted V
///   → output projection (h→1) → sigmoid
///
/// No external ML framework is used — all computation is pure Rust with
/// simple `Vec<Vec<f64>>` matrices.
///
/// Xavier initialisation is applied to keep activations in a healthy range
/// from the first forward pass.

// ---------------------------------------------------------------------------
// AttentionScorer
// ---------------------------------------------------------------------------

/// Single-head attention scorer for tabular lead features.
///
/// Each feature dimension acts as a "token"; the attention mechanism
/// computes pairwise compatibility between all feature pairs and
/// produces a weighted sum of value projections before a final linear
/// layer maps to a scalar in [0, 1].
pub struct AttentionScorer {
    /// Query projection weights: shape (feature_dim, head_dim).
    w_q: Vec<Vec<f64>>,
    /// Key projection weights: shape (feature_dim, head_dim).
    w_k: Vec<Vec<f64>>,
    /// Value projection weights: shape (feature_dim, head_dim).
    w_v: Vec<Vec<f64>>,
    /// Output projection: shape (head_dim,) — maps attended value to scalar.
    w_out: Vec<f64>,
    feature_dim: usize,
    head_dim: usize,
}

impl AttentionScorer {
    /// Create a new scorer with Xavier-initialised weights.
    ///
    /// Xavier initialisation sets the weight scale to `sqrt(2 / (fan_in + fan_out))`
    /// to keep the variance of activations stable across projections.
    pub fn new(feature_dim: usize, head_dim: usize) -> Self {
        assert!(feature_dim > 0, "feature_dim must be > 0");
        assert!(head_dim > 0, "head_dim must be > 0");

        // Xavier scale for Q/K/V projections: fan_in=feature_dim, fan_out=head_dim.
        let xavier_qkv = xavier_scale(feature_dim, head_dim);
        // Xavier scale for output projection: fan_in=head_dim, fan_out=1.
        let xavier_out = xavier_scale(head_dim, 1);

        Self {
            w_q: xavier_matrix(feature_dim, head_dim, xavier_qkv),
            w_k: xavier_matrix(feature_dim, head_dim, xavier_qkv),
            w_v: xavier_matrix(feature_dim, head_dim, xavier_qkv),
            w_out: xavier_vector(head_dim, xavier_out),
            feature_dim,
            head_dim,
        }
    }

    /// Score a lead from its feature vector.
    ///
    /// Computation:
    ///
    /// 1. Project: `q = features · W_Q`, `k = features · W_K`, `v = features · W_V`
    ///    Each projection maps `(feature_dim,)` → `(head_dim,)`.
    ///
    /// 2. Attention weight (scalar, single-head):
    ///    `a = softmax_scalar(q · k^T / sqrt(head_dim))`
    ///    Because the "sequence" here is a single token (the full feature vector),
    ///    this reduces to a single compatibility score between q and k, then
    ///    `softmax` over a length-1 sequence = 1.0.  The meaningful non-linearity
    ///    comes from the tanh-gated magnitude (`tanh(q·k / sqrt(d))`).
    ///
    /// 3. Weighted value: `out = a_scaled * v`  where `a_scaled = tanh(q·k/sqrt(d))`
    ///    maps to (−1, 1), giving the network both positive and negative gating.
    ///
    /// 4. Final score: `sigmoid(out · w_out)` → [0, 1].
    pub fn score(&self, features: &[f64]) -> f64 {
        assert_eq!(
            features.len(),
            self.feature_dim,
            "feature vector length {}, expected {}",
            features.len(),
            self.feature_dim
        );

        let q = matvec_mul(&self.w_q, features);
        let k = matvec_mul(&self.w_k, features);
        let v = matvec_mul(&self.w_v, features);

        // Attention gate: tanh(q·k / sqrt(head_dim)).
        let qk: f64 = dot(&q, &k);
        let scale = (self.head_dim as f64).sqrt();
        let a: f64 = (qk / scale).tanh();

        // Gated value aggregation.
        let attended: Vec<f64> = v.iter().map(|vi| a * vi).collect();

        // Output projection then sigmoid.
        let logit = dot(&attended, &self.w_out);
        sigmoid(logit)
    }

    /// Attention weights over individual features, useful for interpretability.
    ///
    /// Returns a `feature_dim`-length vector where entry `i` is the magnitude
    /// of Q-row `i` dotted with K-row `i`, normalised via softmax.  Intuitively,
    /// features with higher weight contributed more to the attention gate.
    pub fn feature_attention_weights(&self, features: &[f64]) -> Vec<f64> {
        assert_eq!(
            features.len(),
            self.feature_dim,
            "feature vector length {}, expected {}",
            features.len(),
            self.feature_dim
        );

        // Per-feature compatibility: q_i · k_i / sqrt(head_dim) weighted by feature value.
        let scale = (self.head_dim as f64).sqrt();
        let scores: Vec<f64> = (0..self.feature_dim)
            .map(|i| {
                let qi: f64 = self.w_q[i].iter().map(|w| w * features[i]).sum();
                let ki: f64 = self.w_k[i].iter().map(|w| w * features[i]).sum();
                (qi * ki / scale).abs()
            })
            .collect();

        softmax(&scores)
    }

    /// Train on a batch of `(features, target_score)` pairs via SGD with
    /// numerical gradient estimation (finite differences).
    ///
    /// Using finite differences avoids hand-written backprop through the
    /// attention mechanism while remaining correct.  The perturbation `eps`
    /// is 1e-5, which balances numerical precision against floating-point
    /// cancellation error.
    ///
    /// Each parameter is nudged by `+eps` and `−eps`, the gradient is
    /// estimated as `(L(+eps) − L(−eps)) / (2 * eps)`, and the parameter
    /// is updated by `−lr * grad`.
    pub fn train_batch(&mut self, data: &[(Vec<f64>, f64)], lr: f64) {
        if data.is_empty() {
            return;
        }
        const EPS: f64 = 1e-5;

        // ---- W_Q ----
        for i in 0..self.feature_dim {
            for j in 0..self.head_dim {
                let orig = self.w_q[i][j];
                self.w_q[i][j] = orig + EPS;
                let loss_plus = batch_mse(self, data);
                self.w_q[i][j] = orig - EPS;
                let loss_minus = batch_mse(self, data);
                self.w_q[i][j] = orig;
                let grad = (loss_plus - loss_minus) / (2.0 * EPS);
                self.w_q[i][j] -= lr * grad;
            }
        }

        // ---- W_K ----
        for i in 0..self.feature_dim {
            for j in 0..self.head_dim {
                let orig = self.w_k[i][j];
                self.w_k[i][j] = orig + EPS;
                let loss_plus = batch_mse(self, data);
                self.w_k[i][j] = orig - EPS;
                let loss_minus = batch_mse(self, data);
                self.w_k[i][j] = orig;
                let grad = (loss_plus - loss_minus) / (2.0 * EPS);
                self.w_k[i][j] -= lr * grad;
            }
        }

        // ---- W_V ----
        for i in 0..self.feature_dim {
            for j in 0..self.head_dim {
                let orig = self.w_v[i][j];
                self.w_v[i][j] = orig + EPS;
                let loss_plus = batch_mse(self, data);
                self.w_v[i][j] = orig - EPS;
                let loss_minus = batch_mse(self, data);
                self.w_v[i][j] = orig;
                let grad = (loss_plus - loss_minus) / (2.0 * EPS);
                self.w_v[i][j] -= lr * grad;
            }
        }

        // ---- w_out ----
        for j in 0..self.head_dim {
            let orig = self.w_out[j];
            self.w_out[j] = orig + EPS;
            let loss_plus = batch_mse(self, data);
            self.w_out[j] = orig - EPS;
            let loss_minus = batch_mse(self, data);
            self.w_out[j] = orig;
            let grad = (loss_plus - loss_minus) / (2.0 * EPS);
            self.w_out[j] -= lr * grad;
        }
    }
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/// Xavier initialisation scale: `sqrt(2 / (fan_in + fan_out))`.
fn xavier_scale(fan_in: usize, fan_out: usize) -> f64 {
    (2.0 / (fan_in + fan_out) as f64).sqrt()
}

/// Generate a deterministic weight matrix of shape `(rows, cols)` using a
/// simple LCG pseudo-random sequence scaled to `[-scale, +scale]`.
fn xavier_matrix(rows: usize, cols: usize, scale: f64) -> Vec<Vec<f64>> {
    let mut state = 0x9e3779b97f4a7c15u64; // fixed seed
    (0..rows)
        .map(|_| {
            (0..cols)
                .map(|_| {
                    state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                    let f = (state >> 33) as f64 / (u32::MAX as f64); // [0, 1)
                    (f * 2.0 - 1.0) * scale
                })
                .collect()
        })
        .collect()
}

/// Generate a deterministic weight vector of length `n` scaled to `[-scale, +scale]`.
fn xavier_vector(n: usize, scale: f64) -> Vec<f64> {
    let mut state = 0xdeadbeefcafebabeu64;
    (0..n)
        .map(|_| {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let f = (state >> 33) as f64 / (u32::MAX as f64);
            (f * 2.0 - 1.0) * scale
        })
        .collect()
}

/// Matrix-vector multiply: `M (rows×cols) · v (cols,)` → `(rows,)`.
///
/// `M` is stored as a `Vec` of rows, so `M[i][j]` is row `i`, column `j`.
fn matvec_mul(m: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    m.iter()
        .map(|row| row.iter().zip(v.iter()).map(|(w, x)| w * x).sum())
        .collect()
}

/// Dot product of two equal-length slices.
fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// Sigmoid activation: `1 / (1 + exp(-x))`.
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

/// Numerically stable softmax over a slice.
fn softmax(x: &[f64]) -> Vec<f64> {
    if x.is_empty() {
        return Vec::new();
    }
    let max = x.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let exps: Vec<f64> = x.iter().map(|xi| (xi - max).exp()).collect();
    let sum: f64 = exps.iter().sum();
    if sum < f64::EPSILON {
        return vec![1.0 / x.len() as f64; x.len()];
    }
    exps.iter().map(|e| e / sum).collect()
}

/// Mean squared error over a batch.
fn batch_mse(scorer: &AttentionScorer, data: &[(Vec<f64>, f64)]) -> f64 {
    let total: f64 = data
        .iter()
        .map(|(features, target)| {
            let pred = scorer.score(features);
            let diff = pred - target;
            diff * diff
        })
        .sum();
    total / data.len() as f64
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_scorer(fd: usize, hd: usize) -> AttentionScorer {
        AttentionScorer::new(fd, hd)
    }

    // -- output range --

    #[test]
    fn score_is_in_unit_interval() {
        let scorer = make_scorer(4, 2);
        let features = vec![0.1, 0.5, 0.8, -0.3];
        let s = scorer.score(&features);
        assert!(
            (0.0..=1.0).contains(&s),
            "score must be in [0,1], got {s:.6}"
        );
    }

    #[test]
    fn score_zero_features_is_in_unit_interval() {
        let scorer = make_scorer(3, 2);
        let s = scorer.score(&[0.0, 0.0, 0.0]);
        assert!(
            (0.0..=1.0).contains(&s),
            "score for all-zero features must be in [0,1], got {s:.6}"
        );
    }

    #[test]
    fn score_large_positive_features_is_in_unit_interval() {
        let scorer = make_scorer(2, 4);
        let s = scorer.score(&[1e6, 1e6]);
        assert!(
            (0.0..=1.0).contains(&s),
            "score for large features must be in [0,1], got {s:.6}"
        );
    }

    // -- different features produce different scores --

    #[test]
    fn different_features_produce_different_scores() {
        let scorer = make_scorer(4, 3);
        let a = scorer.score(&[0.1, 0.2, 0.3, 0.4]);
        let b = scorer.score(&[0.9, 0.8, 0.7, 0.6]);
        assert_ne!(
            (a * 1e8) as i64,
            (b * 1e8) as i64,
            "different features should produce different scores: {a:.8} vs {b:.8}"
        );
    }

    // -- training reduces error --

    #[test]
    fn training_reduces_mse() {
        let mut scorer = AttentionScorer::new(3, 2);
        // All targets = 1.0: the model should learn to score higher.
        let data: Vec<(Vec<f64>, f64)> = vec![
            (vec![1.0, 1.0, 1.0], 1.0),
            (vec![0.8, 0.9, 0.7], 1.0),
            (vec![0.6, 0.7, 0.8], 1.0),
        ];
        let loss_before = batch_mse(&scorer, &data);
        for _ in 0..5 {
            scorer.train_batch(&data, 0.5);
        }
        let loss_after = batch_mse(&scorer, &data);
        assert!(
            loss_after < loss_before,
            "training must reduce MSE: before={loss_before:.6}, after={loss_after:.6}"
        );
    }

    // -- attention weights --

    #[test]
    fn attention_weights_sum_to_one() {
        let scorer = make_scorer(5, 3);
        let features = vec![0.1, 0.4, 0.9, 0.2, 0.7];
        let weights = scorer.feature_attention_weights(&features);
        assert_eq!(
            weights.len(),
            5,
            "attention weights length must equal feature_dim"
        );
        let sum: f64 = weights.iter().sum();
        assert!(
            (sum - 1.0).abs() < 1e-9,
            "attention weights must sum to 1.0, got {sum:.10}"
        );
    }

    #[test]
    fn attention_weights_all_non_negative() {
        let scorer = make_scorer(4, 2);
        let weights = scorer.feature_attention_weights(&[0.1, 0.2, 0.3, 0.4]);
        for (i, &w) in weights.iter().enumerate() {
            assert!(
                w >= 0.0,
                "attention weight [{i}] must be non-negative, got {w:.6}"
            );
        }
    }

    // -- helpers --

    #[test]
    fn sigmoid_bounds() {
        assert!((sigmoid(0.0) - 0.5).abs() < 1e-10);
        assert!(sigmoid(100.0) < 1.0 + f64::EPSILON);
        assert!(sigmoid(-100.0) > -f64::EPSILON);
    }

    #[test]
    fn softmax_sums_to_one() {
        let v = vec![1.0, 2.0, 3.0];
        let s = softmax(&v);
        let sum: f64 = s.iter().sum();
        assert!((sum - 1.0).abs() < 1e-10, "softmax sum={sum:.10}");
    }

    #[test]
    fn softmax_uniform_on_equal_inputs() {
        let v = vec![2.0, 2.0, 2.0];
        let s = softmax(&v);
        for &w in &s {
            assert!((w - 1.0 / 3.0).abs() < 1e-10, "equal inputs → uniform softmax, got {w:.10}");
        }
    }

    #[test]
    fn dot_product_correct() {
        assert!((dot(&[1.0, 2.0, 3.0], &[4.0, 5.0, 6.0]) - 32.0).abs() < 1e-10);
    }

    #[test]
    fn matvec_mul_correct() {
        let m = vec![vec![1.0, 2.0], vec![3.0, 4.0]];
        let v = vec![1.0, 1.0];
        let result = matvec_mul(&m, &v);
        assert!((result[0] - 3.0).abs() < 1e-10, "row 0: got {}", result[0]);
        assert!((result[1] - 7.0).abs() < 1e-10, "row 1: got {}", result[1]);
    }
}

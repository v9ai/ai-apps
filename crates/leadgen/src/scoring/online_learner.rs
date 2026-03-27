/// Online Gradient Descent Lead Scorer with feature hashing.
///
/// From the cost-efficiency active-learning research (synthesis layer, 2025).
/// Updates incrementally from user feedback without storing training data or
/// performing full retraining.  Suitable for streaming lead pipelines where
/// feedback arrives asynchronously.
///
/// Key design decisions:
///
/// - **Hashing trick** — categorical and numerical features are mapped into a
///   fixed-dimensional sparse binary/float vector via FNV-1a hashing.  No
///   explicit feature engineering or vocabulary is needed.
/// - **AdaGrad-style decay** — the global learning rate is divided by `sqrt(t)`
///   so that early updates are larger and later updates fine-tune.  This
///   converges faster than a fixed rate for sparse features.
/// - **L2 regularisation** — applied per-update to prevent weight explosion.

// ---------------------------------------------------------------------------
// OnlineLearner
// ---------------------------------------------------------------------------

/// Online gradient descent scorer for lead qualification.
///
/// Internally maintains a `d`-dimensional weight vector that is updated in
/// `O(nnz)` time per feedback event, where `nnz` is the number of active
/// features in the hashed representation.
pub struct OnlineLearner {
    /// Weight vector — one scalar per hashed bucket.
    weights: Vec<f64>,
    bias: f64,
    dimension: usize,
    learning_rate: f64,
    l2_reg: f64,
    /// Global step counter; drives the `1/sqrt(t)` learning-rate decay.
    t: u64,
    cumulative_loss: f64,
    observation_count: u64,
}

impl OnlineLearner {
    /// Create a new learner with `dimension` buckets.
    ///
    /// Sensible defaults: `learning_rate = 0.1`, `l2_reg = 1e-4`.
    /// All weights are initialised to zero so that the model starts as a
    /// constant predictor (sigmoid(0) = 0.5) and is pulled toward the data.
    pub fn new(dimension: usize) -> Self {
        assert!(dimension > 0, "dimension must be > 0");
        Self {
            weights: vec![0.0; dimension],
            bias: 0.0,
            dimension,
            learning_rate: 0.1,
            l2_reg: 1e-4,
            t: 0,
            cumulative_loss: 0.0,
            observation_count: 0,
        }
    }

    /// Create with custom learning rate and L2 regularisation coefficient.
    pub fn with_hyperparams(dimension: usize, learning_rate: f64, l2_reg: f64) -> Self {
        let mut s = Self::new(dimension);
        s.learning_rate = learning_rate;
        s.l2_reg = l2_reg;
        s
    }

    // -----------------------------------------------------------------------
    // Feature hashing
    // -----------------------------------------------------------------------

    /// Hash a set of `(name, value)` feature pairs into a sparse representation.
    ///
    /// Rules:
    /// - Each `(name, value)` pair is concatenated as `"name=value"` and hashed
    ///   with FNV-1a to obtain a bucket index in `[0, dimension)`.
    /// - If `value` can be parsed as `f64` the numeric value is used; otherwise
    ///   the indicator value `1.0` is used (binary feature encoding).
    ///
    /// Collisions are benign: hashing trick theory shows that with enough
    /// dimensions (typically 2^18–2^22) the collision noise is negligible.
    pub fn hash_features(features: &[(&str, &str)], dimension: usize) -> Vec<(usize, f64)> {
        assert!(dimension > 0, "dimension must be > 0");
        features
            .iter()
            .map(|&(name, value)| {
                let key = format!("{name}={value}");
                let idx = fnv1a_hash(key.as_bytes()) % dimension;
                let weight = value.parse::<f64>().unwrap_or(1.0);
                (idx, weight)
            })
            .collect()
    }

    // -----------------------------------------------------------------------
    // Prediction
    // -----------------------------------------------------------------------

    /// Predict the score for a set of hashed features in [0, 1].
    ///
    /// Computes `sigmoid(bias + Σ_{(i,v)} weights[i] * v)`.
    pub fn predict(&self, hashed: &[(usize, f64)]) -> f64 {
        let logit: f64 = self.bias
            + hashed
                .iter()
                .map(|&(idx, val)| self.weights[idx.min(self.dimension - 1)] * val)
                .sum::<f64>();
        sigmoid(logit)
    }

    // -----------------------------------------------------------------------
    // Online update
    // -----------------------------------------------------------------------

    /// Update weights from a single labelled example.
    ///
    /// Uses logistic loss gradient: `error = pred - label` where `label` is
    /// `1.0` for a converted lead and `0.0` for a rejected one.
    ///
    /// Learning rate schedule: `lr_t = base_lr / sqrt(t + 1)`.
    ///
    /// Weight update per active feature `(i, v)`:
    ///
    ///   `w[i] -= lr_t * (error * v + l2_reg * w[i])`
    ///
    /// Bias update (no regularisation on bias):
    ///
    ///   `bias -= lr_t * error`
    pub fn update(&mut self, hashed: &[(usize, f64)], label: f64) {
        let pred = self.predict(hashed);
        let error = pred - label;

        self.cumulative_loss += error * error;
        self.observation_count += 1;
        self.t += 1;

        let adjusted_lr = self.learning_rate / (self.t as f64).sqrt();

        for &(idx, val) in hashed {
            let i = idx.min(self.dimension - 1);
            self.weights[i] -=
                adjusted_lr * (error * val + self.l2_reg * self.weights[i]);
        }
        self.bias -= adjusted_lr * error;
    }

    // -----------------------------------------------------------------------
    // Diagnostics
    // -----------------------------------------------------------------------

    /// Average squared-error loss over all observations received so far.
    ///
    /// Returns `0.0` if no observations have been made.
    pub fn avg_loss(&self) -> f64 {
        if self.observation_count == 0 {
            return 0.0;
        }
        self.cumulative_loss / self.observation_count as f64
    }

    /// Fraction of weights that are exactly zero (sparsity indicator).
    ///
    /// High sparsity (> 0.9) is expected early in training when most hash
    /// buckets have never received a gradient update.
    pub fn sparsity(&self) -> f64 {
        if self.weights.is_empty() {
            return 1.0;
        }
        let zeros = self.weights.iter().filter(|&&w| w == 0.0).count();
        zeros as f64 / self.weights.len() as f64
    }

    /// Total number of gradient updates applied.
    pub fn step_count(&self) -> u64 {
        self.t
    }

    /// Number of labelled examples processed.
    pub fn observation_count(&self) -> u64 {
        self.observation_count
    }
}

// ---------------------------------------------------------------------------
// Hash function
// ---------------------------------------------------------------------------

/// FNV-1a 64-bit hash.
///
/// Fast, non-cryptographic, and excellent for the feature-hashing trick:
/// deterministic, cheap, and produces well-distributed bucket indices.
fn fnv1a_hash(bytes: &[u8]) -> usize {
    const FNV_OFFSET_BASIS: u64 = 14_695_981_039_346_656_037;
    const FNV_PRIME: u64 = 1_099_511_628_211;
    let mut hash = FNV_OFFSET_BASIS;
    for &b in bytes {
        hash ^= b as u64;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash as usize
}

/// Sigmoid activation: `1 / (1 + exp(-x))`.
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -- predict in [0, 1] --

    #[test]
    fn predict_zero_weights_is_half() {
        let learner = OnlineLearner::new(1024);
        let hashed = OnlineLearner::hash_features(&[("industry", "SaaS")], 1024);
        let p = learner.predict(&hashed);
        // Weights are zero → logit = 0 → sigmoid(0) = 0.5.
        assert!(
            (p - 0.5).abs() < 1e-10,
            "untrained model should predict 0.5, got {p:.8}"
        );
    }

    #[test]
    fn predict_is_in_unit_interval() {
        let mut learner = OnlineLearner::new(512);
        // Push weights to extremes with many updates.
        let hashed = OnlineLearner::hash_features(&[("x", "1")], 512);
        for _ in 0..100 {
            learner.update(&hashed, 1.0);
        }
        let p = learner.predict(&hashed);
        assert!(
            (0.0..=1.0).contains(&p),
            "predict must be in [0,1], got {p:.8}"
        );
    }

    // -- training on positive examples increases score --

    #[test]
    fn training_on_positive_examples_increases_score() {
        let mut learner = OnlineLearner::new(1024);
        let features: Vec<(&str, &str)> = vec![
            ("seniority", "VP"),
            ("industry", "SaaS"),
            ("employees", "150"),
        ];
        let hashed = OnlineLearner::hash_features(&features, 1024);
        let before = learner.predict(&hashed);
        for _ in 0..20 {
            learner.update(&hashed, 1.0);
        }
        let after = learner.predict(&hashed);
        assert!(
            after > before,
            "positive training must increase score: before={before:.6}, after={after:.6}"
        );
    }

    #[test]
    fn training_on_negative_examples_decreases_score() {
        let mut learner = OnlineLearner::new(1024);
        let hashed = OnlineLearner::hash_features(&[("seniority", "Intern")], 1024);
        let before = learner.predict(&hashed);
        for _ in 0..20 {
            learner.update(&hashed, 0.0);
        }
        let after = learner.predict(&hashed);
        assert!(
            after < before,
            "negative training must decrease score: before={before:.6}, after={after:.6}"
        );
    }

    // -- feature hashing is deterministic --

    #[test]
    fn hash_features_is_deterministic() {
        let features = vec![("company", "Acme"), ("role", "CTO"), ("size", "200")];
        let a = OnlineLearner::hash_features(&features, 2048);
        let b = OnlineLearner::hash_features(&features, 2048);
        assert_eq!(a, b, "hash_features must be deterministic");
    }

    #[test]
    fn hash_features_indices_within_dimension() {
        let features = vec![
            ("a", "b"),
            ("c", "d"),
            ("number", "42.5"),
        ];
        let hashed = OnlineLearner::hash_features(&features, 256);
        for (idx, _) in &hashed {
            assert!(
                *idx < 256,
                "index {idx} must be < dimension 256"
            );
        }
    }

    #[test]
    fn hash_features_numeric_value_parsed() {
        let hashed = OnlineLearner::hash_features(&[("employees", "250")], 1024);
        assert_eq!(hashed.len(), 1);
        let (_, val) = hashed[0];
        assert!(
            (val - 250.0).abs() < 1e-10,
            "numeric feature value should be 250.0, got {val}"
        );
    }

    #[test]
    fn hash_features_categorical_value_is_one() {
        let hashed = OnlineLearner::hash_features(&[("industry", "SaaS")], 1024);
        let (_, val) = hashed[0];
        assert!(
            (val - 1.0).abs() < 1e-10,
            "categorical feature value should be 1.0, got {val}"
        );
    }

    // -- sparsity high initially --

    #[test]
    fn sparsity_is_high_initially() {
        let learner = OnlineLearner::new(65536);
        let s = learner.sparsity();
        assert!(
            s > 0.99,
            "initial sparsity should be > 0.99 for large dimension, got {s:.4}"
        );
    }

    #[test]
    fn sparsity_decreases_after_updates() {
        let mut learner = OnlineLearner::new(64);
        let sparsity_before = learner.sparsity();
        // Update with many distinct features to spread weight mass.
        for i in 0..32 {
            let key = i.to_string();
            let hashed = OnlineLearner::hash_features(&[("f", key.as_str())], 64);
            learner.update(&hashed, 1.0);
        }
        let sparsity_after = learner.sparsity();
        assert!(
            sparsity_after < sparsity_before,
            "sparsity should decrease after updates: before={sparsity_before:.4}, after={sparsity_after:.4}"
        );
    }

    // -- AdaGrad decay works --

    #[test]
    fn adagrad_lr_decays_with_steps() {
        // The effective learning rate is `base_lr / sqrt(t)`.
        // A single update at step t=2 should move the score more than a single
        // update at step t=10_000, because sqrt(2) << sqrt(10_000).
        let hashed = OnlineLearner::hash_features(&[("x", "1")], 64);

        // Measure per-step delta early (step 1→2).
        let mut early_learner = OnlineLearner::new(64);
        early_learner.update(&hashed, 1.0); // step 1
        let before_step2 = early_learner.predict(&hashed);
        early_learner.update(&hashed, 1.0); // step 2
        let after_step2 = early_learner.predict(&hashed);
        let early_delta = (after_step2 - before_step2).abs();

        // Measure per-step delta late (step 9_999→10_000).
        let mut late_learner = OnlineLearner::new(64);
        for _ in 0..9_999 {
            late_learner.update(&hashed, 1.0);
        }
        let before_step10k = late_learner.predict(&hashed);
        late_learner.update(&hashed, 1.0); // step 10_000
        let after_step10k = late_learner.predict(&hashed);
        let late_delta = (after_step10k - before_step10k).abs();

        assert!(
            early_delta > late_delta,
            "AdaGrad: early per-step delta ({early_delta:.8}) must exceed late per-step delta ({late_delta:.8})"
        );
    }

    // -- avg_loss --

    #[test]
    fn avg_loss_zero_before_updates() {
        let learner = OnlineLearner::new(256);
        assert_eq!(learner.avg_loss(), 0.0, "avg_loss before any update must be 0.0");
    }

    #[test]
    fn avg_loss_positive_after_update() {
        let mut learner = OnlineLearner::new(256);
        let hashed = OnlineLearner::hash_features(&[("x", "y")], 256);
        learner.update(&hashed, 1.0);
        assert!(
            learner.avg_loss() > 0.0,
            "avg_loss must be positive after an update (model starts at 0.5, target=1.0)"
        );
    }

    // -- step counter --

    #[test]
    fn step_count_increments_on_update() {
        let mut learner = OnlineLearner::new(128);
        let hashed = OnlineLearner::hash_features(&[("a", "b")], 128);
        assert_eq!(learner.step_count(), 0);
        learner.update(&hashed, 1.0);
        assert_eq!(learner.step_count(), 1);
        learner.update(&hashed, 0.0);
        assert_eq!(learner.step_count(), 2);
    }

    // -- FNV hash --

    #[test]
    fn fnv1a_hash_deterministic() {
        let h1 = fnv1a_hash(b"hello world");
        let h2 = fnv1a_hash(b"hello world");
        assert_eq!(h1, h2, "FNV-1a must be deterministic");
    }

    #[test]
    fn fnv1a_hash_different_inputs_differ() {
        let h1 = fnv1a_hash(b"SaaS");
        let h2 = fnv1a_hash(b"Fintech");
        assert_ne!(h1, h2, "different inputs should (almost certainly) hash differently");
    }
}

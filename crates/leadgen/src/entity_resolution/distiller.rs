/// DistillER — Knowledge Distillation for entity matching.
///
/// Trains a small student logistic-regression model using soft probability
/// labels produced by an LLM teacher.  The combined loss is:
///
///   L = α · KL(student || teacher) + (1 − α) · BCE(student, hard_label)
///
/// where both terms are evaluated at temperature T (soft labels are
/// temperature-scaled before computing the KL term).
///
/// Feature layout matches `ensemble.rs` (8 features, indices stable):
///
/// | Index | Feature               |
/// |-------|-----------------------|
/// | 0     | name_jaro_winkler     |
/// | 1     | email_exact_match     |
/// | 2     | email_local_similarity|
/// | 3     | domain_match          |
/// | 4     | title_similarity      |
/// | 5     | linkedin_match        |
/// | 6     | phone_match           |
/// | 7     | embedding_cosine      |

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Hyperparameters for the distillation training loop.
#[derive(Debug, Clone)]
pub struct DistillationConfig {
    /// Mixing weight for the soft-label (KL) loss term.  `1 − alpha` is applied
    /// to the hard-label BCE term.  Default: 0.7.
    pub alpha: f64,
    /// Softmax temperature for scaling the soft labels.  Higher values smooth
    /// the distribution (reduce peak probability).  Default: 2.0.
    pub temperature: f64,
    /// SGD learning rate.  Default: 0.01.
    pub learning_rate: f64,
    /// Input feature dimension.  Must match the feature vector passed to every
    /// `train_step` and `predict` call.  Default: 8.
    pub feature_dim: usize,
    /// L2 regularisation coefficient (weight decay).  Default: 0.001.
    pub l2_lambda: f64,
}

impl Default for DistillationConfig {
    fn default() -> Self {
        Self {
            alpha: 0.7,
            temperature: 2.0,
            learning_rate: 0.01,
            feature_dim: 8,
            l2_lambda: 0.001,
        }
    }
}

// ---------------------------------------------------------------------------
// Student model
// ---------------------------------------------------------------------------

/// A distilled student model for entity-pair matching.
///
/// The student is a single-layer logistic regression (dot product + bias →
/// sigmoid) whose weights are updated online via SGD using the combined KD
/// loss.  This keeps the model trivially serialisable and fast at inference.
pub struct DistilledMatcher {
    weights: Vec<f64>,
    bias: f64,
    config: DistillationConfig,
    training_samples: u64,
}

impl DistilledMatcher {
    /// Create a new student model with zero-initialised weights.
    pub fn new(config: DistillationConfig) -> Self {
        let dim = config.feature_dim;
        Self {
            weights: vec![0.0; dim],
            bias: 0.0,
            config,
            training_samples: 0,
        }
    }

    /// Predict the match probability for a feature vector.
    ///
    /// Returns σ(w · x + b) ∈ (0, 1).
    pub fn predict(&self, features: &[f64]) -> f64 {
        let dot: f64 = self
            .weights
            .iter()
            .zip(features.iter())
            .map(|(w, x)| w * x)
            .sum::<f64>();
        sigmoid(dot + self.bias)
    }

    /// Single-step SGD update using the combined knowledge-distillation loss.
    ///
    /// The gradient of L with respect to the student logit `z` (before sigmoid)
    /// is derived as:
    ///
    ///   ∂L/∂z = α · (student_soft − teacher_soft) / T
    ///         + (1 − α) · (student_prob − hard_label)
    ///
    /// where `student_soft` and `teacher_soft` are the temperature-scaled
    /// probabilities and `student_prob` is the raw sigmoid output.
    pub fn train_step(&mut self, features: &[f64], hard_label: f64, teacher_prob: f64) {
        let student_prob = self.predict(features);
        let t = self.config.temperature;

        // Temperature-scaled probabilities (binary case: [p, 1-p]).
        let student_soft = temperature_scale(student_prob, t);
        let teacher_soft = temperature_scale(teacher_prob.clamp(0.0, 1.0), t);

        // Combined gradient w.r.t. the pre-sigmoid logit.
        let kl_grad = self.config.alpha * (student_soft - teacher_soft) / t;
        let bce_grad = (1.0 - self.config.alpha) * (student_prob - hard_label);
        let grad = kl_grad + bce_grad;

        let lr = self.config.learning_rate;
        let l2 = self.config.l2_lambda;

        for (i, w) in self.weights.iter_mut().enumerate() {
            let x = features.get(i).copied().unwrap_or(0.0);
            *w -= lr * (grad * x + l2 * *w);
        }
        self.bias -= lr * grad;
        self.training_samples += 1;
    }

    /// Batch training over a slice of `(features, hard_label, teacher_prob)` tuples.
    pub fn train_batch(&mut self, data: &[(Vec<f64>, f64, f64)]) {
        for (features, hard, teacher) in data {
            self.train_step(features, *hard, *teacher);
        }
    }

    /// Agreement rate between the student and the teacher on test pairs.
    ///
    /// A student and teacher "agree" when they are on the same side of the 0.5
    /// decision boundary.  Returns a value in [0, 1]; higher is better.
    pub fn agreement_rate(&self, test_data: &[(Vec<f64>, f64)]) -> f64 {
        if test_data.is_empty() {
            return 0.0;
        }
        let agreements = test_data
            .iter()
            .filter(|(features, teacher_prob)| {
                let student = self.predict(features);
                (student >= 0.5) == (*teacher_prob >= 0.5)
            })
            .count();
        agreements as f64 / test_data.len() as f64
    }

    /// Number of `train_step` calls performed so far.
    pub fn training_samples(&self) -> u64 {
        self.training_samples
    }

    /// Read-only view of the current weight vector.
    pub fn weights(&self) -> &[f64] {
        &self.weights
    }

    /// Current bias term.
    pub fn bias(&self) -> f64 {
        self.bias
    }
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

/// Temperature-scale a Bernoulli probability.
///
/// For a binary distribution P = [p, 1−p], the softmax at temperature T is:
///
///   p_T = σ(log(p / (1−p)) / T)
///
/// This is the binary analogue of dividing logits by T before softmax.
/// Clamps `p` away from 0 and 1 to avoid log(0).
fn temperature_scale(p: f64, t: f64) -> f64 {
    let p = p.clamp(1e-7, 1.0 - 1e-7);
    let logit = (p / (1.0 - p)).ln();
    sigmoid(logit / t)
}

/// Binary cross-entropy loss (not used in the gradient directly but useful
/// for computing loss trajectory in tests).
fn bce_loss(pred: f64, label: f64) -> f64 {
    let pred = pred.clamp(1e-7, 1.0 - 1e-7);
    -(label * pred.ln() + (1.0 - label) * (1.0 - pred).ln())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn default_matcher() -> DistilledMatcher {
        DistilledMatcher::new(DistillationConfig::default())
    }

    // -- sigmoid --

    #[test]
    fn sigmoid_at_zero_is_half() {
        assert!((sigmoid(0.0) - 0.5).abs() < 1e-10);
    }

    #[test]
    fn sigmoid_output_in_unit_interval() {
        for x in [-100.0, -10.0, -1.0, 0.0, 1.0, 10.0, 100.0] {
            let s = sigmoid(x);
            assert!((0.0..=1.0).contains(&s), "sigmoid({x}) = {s} outside [0,1]");
        }
    }

    // -- predict --

    #[test]
    fn untrained_model_predicts_half() {
        let m = default_matcher();
        let p = m.predict(&[1.0, 0.0, 0.5, 1.0, 0.8, 0.0, 0.0, 0.9]);
        // Zero weights and zero bias → sigmoid(0) = 0.5
        assert!((p - 0.5).abs() < 1e-10, "untrained model should predict 0.5, got {p}");
    }

    #[test]
    fn predict_output_in_unit_interval() {
        let m = default_matcher();
        for features in [
            vec![0.0; 8],
            vec![1.0; 8],
            vec![0.5, 0.0, 1.0, 0.0, 0.5, 1.0, 0.0, 0.8],
        ] {
            let p = m.predict(&features);
            assert!((0.0..=1.0).contains(&p), "predict returned {p} outside [0,1]");
        }
    }

    // -- training loss reduction --

    #[test]
    fn training_reduces_bce_loss_on_match_examples() {
        let mut m = default_matcher();
        let features = vec![0.9, 1.0, 0.0, 1.0, 0.85, 1.0, 0.0, 0.92];
        let loss_before = bce_loss(m.predict(&features), 1.0);
        for _ in 0..300 {
            m.train_step(&features, 1.0, 0.95);
        }
        let loss_after = bce_loss(m.predict(&features), 1.0);
        assert!(
            loss_after < loss_before,
            "loss should decrease after training on matches: {loss_before:.4} -> {loss_after:.4}"
        );
    }

    #[test]
    fn training_reduces_bce_loss_on_non_match_examples() {
        let mut m = default_matcher();
        let features = vec![0.3, 0.0, 0.2, 0.0, 0.4, 0.0, 0.0, 0.1];
        let loss_before = bce_loss(m.predict(&features), 0.0);
        for _ in 0..300 {
            m.train_step(&features, 0.0, 0.05);
        }
        let loss_after = bce_loss(m.predict(&features), 0.0);
        assert!(
            loss_after < loss_before,
            "loss should decrease after training on non-matches: {loss_before:.4} -> {loss_after:.4}"
        );
    }

    // -- agreement rate --

    #[test]
    fn agreement_rate_improves_with_training() {
        let mut m = default_matcher();
        let train_data: Vec<(Vec<f64>, f64, f64)> = vec![
            (vec![0.9, 1.0, 0.0, 1.0, 0.85, 0.0, 0.0, 0.92], 1.0, 0.95),
            (vec![0.1, 0.0, 0.1, 0.0, 0.2, 0.0, 0.0, 0.05], 0.0, 0.03),
            (vec![0.95, 0.0, 0.0, 0.0, 0.9, 1.0, 0.0, 0.88], 1.0, 0.91),
            (vec![0.3, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.15], 0.0, 0.08),
        ];
        let test_data: Vec<(Vec<f64>, f64)> = train_data
            .iter()
            .map(|(f, _, t)| (f.clone(), *t))
            .collect();

        let rate_before = m.agreement_rate(&test_data);

        for _ in 0..200 {
            m.train_batch(&train_data);
        }

        let rate_after = m.agreement_rate(&test_data);
        assert!(
            rate_after >= rate_before,
            "agreement rate should not decrease after training: {rate_before:.3} -> {rate_after:.3}"
        );
        assert!(
            rate_after > 0.5,
            "agreement rate should exceed random baseline after training, got {rate_after:.3}"
        );
    }

    #[test]
    fn agreement_rate_empty_test_set_returns_zero() {
        let m = default_matcher();
        assert_eq!(m.agreement_rate(&[]), 0.0);
    }

    // -- temperature scaling --

    #[test]
    fn temperature_scale_at_half_returns_half() {
        let scaled = temperature_scale(0.5, 2.0);
        assert!((scaled - 0.5).abs() < 1e-6, "temperature_scale(0.5, T) should be 0.5, got {scaled}");
    }

    #[test]
    fn higher_temperature_softens_extremes() {
        // A confident probability (0.9) should move closer to 0.5 at higher T.
        let low_t = temperature_scale(0.9, 1.0);
        let high_t = temperature_scale(0.9, 4.0);
        assert!(
            high_t < low_t,
            "higher temperature should soften high probabilities: t=1 gives {low_t:.3}, t=4 gives {high_t:.3}"
        );
    }

    // -- config defaults --

    #[test]
    fn default_config_has_expected_values() {
        let c = DistillationConfig::default();
        assert!((c.alpha - 0.7).abs() < f64::EPSILON, "default alpha should be 0.7");
        assert!((c.temperature - 2.0).abs() < f64::EPSILON, "default temperature should be 2.0");
        assert!((c.learning_rate - 0.01).abs() < f64::EPSILON, "default learning_rate should be 0.01");
        assert_eq!(c.feature_dim, 8, "default feature_dim should be 8");
    }

    #[test]
    fn training_samples_counter_increments() {
        let mut m = default_matcher();
        assert_eq!(m.training_samples(), 0);
        m.train_step(&vec![0.5; 8], 1.0, 0.9);
        m.train_step(&vec![0.1; 8], 0.0, 0.1);
        assert_eq!(m.training_samples(), 2);
    }

    #[test]
    fn weights_length_matches_feature_dim() {
        let m = default_matcher();
        assert_eq!(m.weights().len(), 8, "weights length must equal feature_dim");
    }
}

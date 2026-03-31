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
/// - **Per-feature AdaGrad** — each weight bucket maintains its own accumulated
///   squared-gradient sum, giving per-weight adaptive learning rates.  Features
///   that receive frequent, large gradients get automatically smaller effective
///   steps; rare features keep a larger effective step until they have been seen
///   enough times.  This supersedes the old global `1/sqrt(t)` schedule.
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
    /// Accumulated squared gradients per weight bucket (AdaGrad state).
    grad_sq: Vec<f64>,
    /// Accumulated squared gradient for the bias.
    bias_grad_sq: f64,
    /// Numerical stability addend for AdaGrad denominator.
    epsilon: f64,
    dimension: usize,
    learning_rate: f64,
    l2_reg: f64,
    /// Global step counter — kept for diagnostics and reporting only.
    t: u64,
    cumulative_loss: f64,
    observation_count: u64,
}

impl OnlineLearner {
    /// Create a new learner with `dimension` buckets.
    ///
    /// Sensible defaults: `learning_rate = 0.1`, `l2_reg = 1e-4`, `epsilon = 1e-7`.
    /// All weights are initialised to zero so that the model starts as a
    /// constant predictor (sigmoid(0) = 0.5) and is pulled toward the data.
    pub fn new(dimension: usize) -> Self {
        assert!(dimension > 0, "dimension must be > 0");
        Self {
            weights: vec![0.0; dimension],
            bias: 0.0,
            grad_sq: vec![0.0; dimension],
            bias_grad_sq: 0.0,
            epsilon: 1e-7,
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

    /// Hash owned `(String, f64)` feature pairs — convenience wrapper used by
    /// `company_features` and `contact_company_features`.
    fn hash_owned(features: &[(String, f64)], dimension: usize) -> Vec<(usize, f64)> {
        assert!(dimension > 0, "dimension must be > 0");
        features
            .iter()
            .map(|(name, &value)| {
                // Represent the value as its raw bits so the key remains unique
                // even for continuous features (e.g. "employee_log=5.0").
                let key = format!("{name}={value}");
                let idx = fnv1a_hash(key.as_bytes()) % dimension;
                (idx, value)
            })
            .collect()
    }

    // -----------------------------------------------------------------------
    // Domain feature extractors
    // -----------------------------------------------------------------------

    /// Extract company-level features for the hashing trick.
    ///
    /// Features produced:
    /// | name | value | semantics |
    /// |---|---|---|
    /// | `employee_log` | ln(count + 1) | log-scale employee count |
    /// | `industry:{x}` | 1.0 | binary industry indicator |
    /// | `funding:{x}` | 1.0 | binary funding-stage indicator |
    /// | `has_tech_stack` | 0/1 | whether tech_stack is non-empty |
    /// | `tech_count` | n/10 | normalised number of tech items |
    /// | `has_description` | 0/1 | whether description is >= 50 chars |
    /// | `domain_tld:{x}` | 1.0 | TLD of the company domain |
    /// | `is_saas` | 0/1 | description or industry mentions SaaS/software |
    pub fn company_features(company: &crate::Company) -> Vec<(String, f64)> {
        let mut feats: Vec<(String, f64)> = Vec::new();

        // --- employee_log ------------------------------------------------
        let emp = company.employee_count.unwrap_or(0) as f64;
        feats.push(("employee_log".to_string(), (emp + 1.0).ln()));

        // --- industry ----------------------------------------------------
        if let Some(ref ind) = company.industry {
            if !ind.is_empty() {
                feats.push((format!("industry:{}", ind.to_lowercase()), 1.0));
            }
        }

        // --- funding_stage -----------------------------------------------
        if let Some(ref fs) = company.funding_stage {
            if !fs.is_empty() {
                feats.push((format!("funding:{}", fs.to_lowercase()), 1.0));
            }
        }

        // --- tech_stack --------------------------------------------------
        let (has_tech, tech_count) = match &company.tech_stack {
            Some(ts) if !ts.is_empty() => {
                // tech_stack is a JSON array string, e.g. `["React","TypeScript"]`.
                let n = serde_json::from_str::<serde_json::Value>(ts)
                    .ok()
                    .and_then(|v| v.as_array().map(|a| a.len()))
                    .unwrap_or(0);
                (if n > 0 { 1.0 } else { 0.0 }, n as f64 / 10.0)
            }
            _ => (0.0, 0.0),
        };
        feats.push(("has_tech_stack".to_string(), has_tech));
        feats.push(("tech_count".to_string(), tech_count));

        // --- has_description ---------------------------------------------
        let desc_flag = match &company.description {
            Some(d) if d.len() > 50 => 1.0,
            _ => 0.0,
        };
        feats.push(("has_description".to_string(), desc_flag));

        // --- domain_tld --------------------------------------------------
        if let Some(ref domain) = company.domain {
            if let Some(tld) = domain.rsplit('.').next() {
                if !tld.is_empty() {
                    feats.push((format!("domain_tld:{}", tld.to_lowercase()), 1.0));
                }
            }
        }

        // --- is_saas -----------------------------------------------------
        let saas_keywords = ["saas", "software"];
        let combined = format!(
            "{} {}",
            company.description.as_deref().unwrap_or("").to_lowercase(),
            company.industry.as_deref().unwrap_or("").to_lowercase()
        );
        let is_saas = if saas_keywords.iter().any(|kw| combined.contains(kw)) {
            1.0
        } else {
            0.0
        };
        feats.push(("is_saas".to_string(), is_saas));

        feats
    }

    /// Extract joint contact + company features for lead scoring.
    ///
    /// Combines contact-level signals with all `company_features`:
    /// | name | value | semantics |
    /// |---|---|---|
    /// | `seniority:{x}` | 1.0 | binary seniority indicator |
    /// | `dept:{x}` | 1.0 | binary department indicator |
    /// | `email_verified` | 0/0.5/1.0 | verified=1, catch-all=0.5, else=0 |
    /// | `has_linkedin` | 0/1 | whether linkedin_url is present |
    /// | `has_phone` | 0/1 | whether phone is present |
    /// | … all company_features … | | |
    pub fn contact_company_features(
        contact: &crate::Contact,
        company: &crate::Company,
    ) -> Vec<(String, f64)> {
        let mut feats: Vec<(String, f64)> = Vec::new();

        // --- seniority ---------------------------------------------------
        if let Some(ref s) = contact.seniority {
            if !s.is_empty() {
                feats.push((format!("seniority:{}", s.to_lowercase()), 1.0));
            }
        }

        // --- department --------------------------------------------------
        if let Some(ref d) = contact.department {
            if !d.is_empty() {
                feats.push((format!("dept:{}", d.to_lowercase()), 1.0));
            }
        }

        // --- email_verified ----------------------------------------------
        let email_score = match contact.email_status.as_deref() {
            Some("verified") => 1.0,
            Some("catch-all") => 0.5,
            _ => 0.0,
        };
        feats.push(("email_verified".to_string(), email_score));

        // --- has_linkedin / has_phone ------------------------------------
        feats.push((
            "has_linkedin".to_string(),
            if contact.linkedin_url.is_some() { 1.0 } else { 0.0 },
        ));
        feats.push((
            "has_phone".to_string(),
            if contact.phone.is_some() { 1.0 } else { 0.0 },
        ));

        // --- company features --------------------------------------------
        feats.extend(Self::company_features(company));

        feats
    }

    // -----------------------------------------------------------------------
    // Lead-level predict / update
    // -----------------------------------------------------------------------

    /// Predict lead quality score in [0, 1] for a contact × company pair.
    ///
    /// Extracts `contact_company_features`, hashes them, and returns
    /// `sigmoid(bias + Σ w[i] * x[i])`.
    pub fn predict_lead(&self, contact: &crate::Contact, company: &crate::Company) -> f64 {
        let feats = Self::contact_company_features(contact, company);
        let hashed = Self::hash_owned(&feats, self.dimension);
        self.predict(&hashed)
    }

    /// Online SGD update for a contact × company example.
    ///
    /// `label = 1.0` for a converted/qualified lead; `0.0` for rejected.
    pub fn update_lead(
        &mut self,
        contact: &crate::Contact,
        company: &crate::Company,
        label: f64,
    ) {
        let feats = Self::contact_company_features(contact, company);
        let hashed = Self::hash_owned(&feats, self.dimension);
        self.update(&hashed, label);
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
    // Online update — per-feature AdaGrad
    // -----------------------------------------------------------------------

    /// Update weights from a single labelled example using per-feature AdaGrad.
    ///
    /// Uses logistic loss gradient: `error = pred - label` where `label` is
    /// `1.0` for a converted lead and `0.0` for a rejected one.
    ///
    /// Per-weight adaptive update for active feature `(i, v)`:
    ///
    ///   `grad_i   = error * v + l2_reg * w[i]`  (L2-regularised gradient)
    ///   `grad_sq[i] += grad_i^2`
    ///   `w[i] -= (lr / sqrt(grad_sq[i] + eps)) * grad_i`
    ///
    /// Bias update (no L2 on bias, independent AdaGrad accumulator):
    ///
    ///   `bias -= (lr / sqrt(bias_grad_sq + eps)) * error`
    pub fn update(&mut self, hashed: &[(usize, f64)], label: f64) {
        let pred = self.predict(hashed);
        let error = pred - label;

        self.cumulative_loss += error * error;
        self.observation_count += 1;
        self.t += 1;

        // Per-feature AdaGrad weight update.
        for &(idx, val) in hashed {
            let i = idx.min(self.dimension - 1);
            let grad = error * val + self.l2_reg * self.weights[i];
            self.grad_sq[i] += grad * grad;
            let effective_lr = self.learning_rate / (self.grad_sq[i] + self.epsilon).sqrt();
            self.weights[i] -= effective_lr * grad;
        }

        // AdaGrad bias update (no L2 regularisation on bias).
        self.bias_grad_sq += error * error;
        let bias_lr = self.learning_rate / (self.bias_grad_sq + self.epsilon).sqrt();
        self.bias -= bias_lr * error;
    }

    // -----------------------------------------------------------------------
    // Feature importance
    // -----------------------------------------------------------------------

    /// Return the top-20 weight buckets by absolute weight, sorted descending.
    ///
    /// Because the hashing trick is a one-way mapping (bucket → feature name
    /// is not recoverable due to collisions), buckets are labelled
    /// `"bucket_{index}"`.  Callers can cross-reference with known features by
    /// recomputing `fnv1a_hash("{name}={value}") % dimension` for any feature
    /// of interest.
    pub fn feature_importance(&self) -> Vec<(String, f64)> {
        let mut indexed: Vec<(usize, f64)> = self
            .weights
            .iter()
            .enumerate()
            .map(|(i, &w)| (i, w))
            .collect();

        // Sort by absolute weight descending.
        indexed.sort_unstable_by(|a, b| {
            b.1.abs()
                .partial_cmp(&a.1.abs())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        indexed
            .into_iter()
            .take(20)
            .map(|(i, w)| (format!("bucket_{i}"), w))
            .collect()
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
    use crate::{Company, Contact};

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    fn bare_company() -> Company {
        Company {
            id: "c1".to_string(),
            name: "Acme".to_string(),
            domain: Some("acme.io".to_string()),
            industry: Some("SaaS".to_string()),
            employee_count: Some(120),
            funding_stage: Some("Series A".to_string()),
            tech_stack: Some(r#"["React","TypeScript","Postgres"]"#.to_string()),
            location: Some("Remote".to_string()),
            description: Some(
                "A B2B SaaS platform for workflow automation with deep AI capabilities."
                    .to_string(),
            ),
            source: None,
            created_at: None,
            updated_at: None,
        }
    }

    fn bare_contact() -> Contact {
        Contact {
            id: "ct1".to_string(),
            company_id: Some("c1".to_string()),
            first_name: "Alice".to_string(),
            last_name: "Smith".to_string(),
            title: Some("VP of Engineering".to_string()),
            seniority: Some("VP".to_string()),
            department: Some("Engineering".to_string()),
            email: Some("alice@acme.io".to_string()),
            email_status: Some("verified".to_string()),
            linkedin_url: Some("https://linkedin.com/in/alice".to_string()),
            phone: None,
            source: None,
            created_at: None,
        }
    }

    // -----------------------------------------------------------------------
    // Predict in [0, 1]
    // -----------------------------------------------------------------------

    #[test]
    fn predict_zero_weights_is_half() {
        let learner = OnlineLearner::new(1024);
        let hashed = OnlineLearner::hash_features(&[("industry", "SaaS")], 1024);
        let p = learner.predict(&hashed);
        assert!(
            (p - 0.5).abs() < 1e-10,
            "untrained model should predict 0.5, got {p:.8}"
        );
    }

    #[test]
    fn predict_is_in_unit_interval() {
        let mut learner = OnlineLearner::new(512);
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

    // -----------------------------------------------------------------------
    // Training direction
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // Feature hashing
    // -----------------------------------------------------------------------

    #[test]
    fn hash_features_is_deterministic() {
        let features = vec![("company", "Acme"), ("role", "CTO"), ("size", "200")];
        let a = OnlineLearner::hash_features(&features, 2048);
        let b = OnlineLearner::hash_features(&features, 2048);
        assert_eq!(a, b, "hash_features must be deterministic");
    }

    #[test]
    fn hash_features_indices_within_dimension() {
        let features = vec![("a", "b"), ("c", "d"), ("number", "42.5")];
        let hashed = OnlineLearner::hash_features(&features, 256);
        for (idx, _) in &hashed {
            assert!(*idx < 256, "index {idx} must be < dimension 256");
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

    // -----------------------------------------------------------------------
    // Sparsity
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // Per-feature AdaGrad — weights change correctly
    // -----------------------------------------------------------------------

    #[test]
    fn adagrad_per_feature_weights_change() {
        // Two distinct features hashing to (almost certainly) different buckets.
        let dim = 1024;
        let feat_a = OnlineLearner::hash_features(&[("role", "CTO")], dim);
        let feat_b = OnlineLearner::hash_features(&[("role", "intern")], dim);

        let mut learner = OnlineLearner::new(dim);

        // Update only on feature A.
        for _ in 0..10 {
            learner.update(&feat_a, 1.0);
        }

        let idx_a = feat_a[0].0;
        let idx_b = feat_b[0].0;

        // Bucket A must have non-zero accumulated grad_sq.
        assert!(
            learner.grad_sq[idx_a] > 0.0,
            "grad_sq for trained bucket must be > 0"
        );
        // Bucket B (never updated) must still be zero.
        assert_eq!(
            learner.grad_sq[idx_b], 0.0,
            "grad_sq for untouched bucket must remain 0"
        );
        // Weight A must have moved away from zero.
        assert!(
            learner.weights[idx_a].abs() > 1e-9,
            "weight for trained feature must be non-zero"
        );
        // Weight B must be exactly zero.
        assert_eq!(
            learner.weights[idx_b], 0.0,
            "weight for untrained feature must remain 0"
        );
    }

    /// AdaGrad should produce diminishing per-step deltas for a frequently
    /// updated feature: because grad_sq accumulates, the effective LR shrinks.
    #[test]
    fn adagrad_effective_lr_shrinks_for_frequent_feature() {
        let dim = 64;
        let hashed = OnlineLearner::hash_features(&[("x", "1")], dim);
        let mut learner = OnlineLearner::new(dim);

        // Warm up with many updates so grad_sq is large.
        for _ in 0..500 {
            learner.update(&hashed, 1.0);
        }
        let before_warm = learner.predict(&hashed);
        learner.update(&hashed, 1.0);
        let after_warm = learner.predict(&hashed);
        let late_delta = (after_warm - before_warm).abs();

        // Cold learner — first update should move the score more.
        let mut fresh = OnlineLearner::new(dim);
        let before_cold = fresh.predict(&hashed);
        fresh.update(&hashed, 1.0);
        let after_cold = fresh.predict(&hashed);
        let early_delta = (after_cold - before_cold).abs();

        assert!(
            early_delta > late_delta,
            "AdaGrad: early per-step delta ({early_delta:.8}) must exceed warm per-step delta ({late_delta:.8})"
        );
    }

    // -----------------------------------------------------------------------
    // company_features — non-empty for a bare company
    // -----------------------------------------------------------------------

    #[test]
    fn company_features_non_empty() {
        let company = bare_company();
        let feats = OnlineLearner::company_features(&company);
        assert!(
            !feats.is_empty(),
            "company_features must be non-empty for a populated company"
        );
    }

    #[test]
    fn company_features_contains_expected_keys() {
        let company = bare_company();
        let feats = OnlineLearner::company_features(&company);
        let keys: Vec<&str> = feats.iter().map(|(k, _)| k.as_str()).collect();

        assert!(keys.contains(&"employee_log"), "missing employee_log");
        assert!(
            keys.iter().any(|k| k.starts_with("industry:")),
            "missing industry:*"
        );
        assert!(
            keys.iter().any(|k| k.starts_with("funding:")),
            "missing funding:*"
        );
        assert!(keys.contains(&"has_tech_stack"), "missing has_tech_stack");
        assert!(keys.contains(&"tech_count"), "missing tech_count");
        assert!(keys.contains(&"has_description"), "missing has_description");
        assert!(
            keys.iter().any(|k| k.starts_with("domain_tld:")),
            "missing domain_tld:*"
        );
        assert!(keys.contains(&"is_saas"), "missing is_saas");
    }

    #[test]
    fn company_features_employee_log_correct() {
        let mut company = bare_company();
        company.employee_count = Some(99); // ln(100) ≈ 4.605
        let feats = OnlineLearner::company_features(&company);
        let emp_val = feats
            .iter()
            .find(|(k, _)| k == "employee_log")
            .map(|(_, v)| *v)
            .expect("employee_log missing");
        let expected = 100_f64.ln();
        assert!(
            (emp_val - expected).abs() < 1e-9,
            "employee_log: expected {expected:.6}, got {emp_val:.6}"
        );
    }

    #[test]
    fn company_features_tech_count_normalised() {
        let mut company = bare_company();
        // 3 items → 3/10 = 0.3
        company.tech_stack = Some(r#"["React","TypeScript","Postgres"]"#.to_string());
        let feats = OnlineLearner::company_features(&company);
        let tc = feats
            .iter()
            .find(|(k, _)| k == "tech_count")
            .map(|(_, v)| *v)
            .expect("tech_count missing");
        assert!(
            (tc - 0.3).abs() < 1e-9,
            "tech_count: expected 0.3, got {tc:.6}"
        );
    }

    #[test]
    fn company_features_is_saas_detected() {
        let mut company = bare_company();
        company.description = Some("A B2B SaaS automation platform.".to_string());
        let feats = OnlineLearner::company_features(&company);
        let is_saas = feats
            .iter()
            .find(|(k, _)| k == "is_saas")
            .map(|(_, v)| *v)
            .expect("is_saas missing");
        assert!((is_saas - 1.0).abs() < 1e-9, "is_saas should be 1.0 for SaaS company");
    }

    // -----------------------------------------------------------------------
    // predict_lead — returns value in [0, 1]
    // -----------------------------------------------------------------------

    #[test]
    fn predict_lead_in_unit_interval() {
        let learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        let score = learner.predict_lead(&contact, &company);
        assert!(
            (0.0..=1.0).contains(&score),
            "predict_lead must be in [0,1], got {score:.8}"
        );
    }

    #[test]
    fn predict_lead_untrained_near_half() {
        let learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        let score = learner.predict_lead(&contact, &company);
        // All weights are zero → sigmoid(0) = 0.5 (exactly, because bias = 0).
        assert!(
            (score - 0.5).abs() < 1e-9,
            "untrained predict_lead should be ~0.5, got {score:.8}"
        );
    }

    // -----------------------------------------------------------------------
    // update_lead — moves prediction toward label
    // -----------------------------------------------------------------------

    #[test]
    fn update_lead_positive_increases_score() {
        let mut learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        let before = learner.predict_lead(&contact, &company);
        for _ in 0..20 {
            learner.update_lead(&contact, &company, 1.0);
        }
        let after = learner.predict_lead(&contact, &company);
        assert!(
            after > before,
            "update_lead(1.0) must increase prediction: before={before:.6}, after={after:.6}"
        );
    }

    #[test]
    fn update_lead_negative_decreases_score() {
        let mut learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        let before = learner.predict_lead(&contact, &company);
        for _ in 0..20 {
            learner.update_lead(&contact, &company, 0.0);
        }
        let after = learner.predict_lead(&contact, &company);
        assert!(
            after < before,
            "update_lead(0.0) must decrease prediction: before={before:.6}, after={after:.6}"
        );
    }

    // -----------------------------------------------------------------------
    // feature_importance — returns exactly 20 items
    // -----------------------------------------------------------------------

    #[test]
    fn feature_importance_returns_20_items() {
        let mut learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        // Train so that weights are non-zero.
        for _ in 0..30 {
            learner.update_lead(&contact, &company, 1.0);
        }
        let importance = learner.feature_importance();
        assert_eq!(
            importance.len(),
            20,
            "feature_importance must return exactly 20 entries, got {}",
            importance.len()
        );
    }

    #[test]
    fn feature_importance_sorted_descending() {
        let mut learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        for _ in 0..30 {
            learner.update_lead(&contact, &company, 1.0);
        }
        let importance = learner.feature_importance();
        for window in importance.windows(2) {
            assert!(
                window[0].1.abs() >= window[1].1.abs(),
                "feature_importance must be sorted descending by |weight|: {} ({:.6}) < {} ({:.6})",
                window[0].0,
                window[0].1,
                window[1].0,
                window[1].1
            );
        }
    }

    #[test]
    fn feature_importance_labels_are_bucket_prefixed() {
        let mut learner = OnlineLearner::new(2048);
        let contact = bare_contact();
        let company = bare_company();
        for _ in 0..5 {
            learner.update_lead(&contact, &company, 1.0);
        }
        let importance = learner.feature_importance();
        for (label, _) in &importance {
            assert!(
                label.starts_with("bucket_"),
                "feature_importance labels must start with 'bucket_', got '{label}'"
            );
        }
    }

    // -----------------------------------------------------------------------
    // avg_loss / step counter
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // FNV hash
    // -----------------------------------------------------------------------

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

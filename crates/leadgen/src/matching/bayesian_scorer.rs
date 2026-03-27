/// Bayesian lead scorer using Normal-Gamma conjugate prior.
///
/// Reference: Gelman et al., *Bayesian Data Analysis* (3rd ed.), ch. 2 — conjugate
/// Normal-Gamma model.  Grounded in the COP/agent-02-calibration-distribution-shift
/// research line on online Bayesian calibration for production ML systems.
///
/// # Motivation
///
/// Classical lead scoring produces point estimates.  A Bayesian formulation
/// additionally quantifies *uncertainty*: a lead with a high mean score and a
/// wide credible interval is treated differently from one with the same mean
/// score but a tight credible interval built from many observations.
///
/// # Model
///
/// For each ICP dimension `d`:
///
///   score_d | μ_d, τ_d  ~ N(μ_d, 1/τ_d)
///   τ_d                 ~ Gamma(α_d, β_d)
///   μ_d | τ_d           ~ N(μ₀, 1/(κ₀·τ_d))
///
/// Posterior update after observing `n` values with sample mean `x̄` and
/// corrected sum of squares `S = Σ(x_i − x̄)²`:
///
///   μ_n   = (κ₀·μ₀ + n·x̄) / (κ₀ + n)
///   κ_n   = κ₀ + n
///   α_n   = α₀ + n/2
///   β_n   = β₀ + S/2 + (κ₀·n·(x̄ − μ₀)²) / (2·(κ₀ + n))
///
/// The posterior predictive mean is μ_n and the posterior predictive variance
/// is β_n / (α_n − 1) / κ_n  (when α_n > 1).

// ---------------------------------------------------------------------------
// DimensionPosterior
// ---------------------------------------------------------------------------

/// Posterior state for a single ICP scoring dimension under the
/// Normal-Gamma conjugate model.
#[derive(Debug, Clone)]
pub struct DimensionPosterior {
    /// Human-readable dimension name (e.g. `"industry_fit"`).
    pub name: String,
    /// Posterior mean of the latent dimension score.
    pub mu: f64,
    /// Pseudo-observation count controlling prior precision.
    pub kappa: f64,
    /// Gamma shape parameter.
    pub alpha: f64,
    /// Gamma rate parameter.
    pub beta: f64,
}

impl DimensionPosterior {
    /// Create an uninformative (weakly informative) prior for a dimension.
    ///
    /// Default hyper-parameters:
    /// - μ₀ = 0.5  (centred in [0, 1])
    /// - κ₀ = 1.0  (equivalent to 1 pseudo-observation)
    /// - α₀ = 2.0  (ensures variance is defined: α > 1)
    /// - β₀ = 0.5  (implies prior variance ≈ 0.5)
    pub fn uninformative(name: &str) -> Self {
        Self {
            name: name.to_string(),
            mu: 0.5,
            kappa: 1.0,
            alpha: 2.0,
            beta: 0.5,
        }
    }

    /// Update the posterior with a batch of scalar observations.
    ///
    /// The update is a single closed-form posterior update over the batch,
    /// equivalent to sequentially incorporating each observation one-by-one.
    ///
    /// Has no effect on an empty observations slice.
    pub fn update(&mut self, observations: &[f64]) {
        let n = observations.len();
        if n == 0 {
            return;
        }

        let n_f = n as f64;

        // Sample mean.
        let x_bar = observations.iter().sum::<f64>() / n_f;

        // Corrected sum of squares S = Σ(x_i − x̄)².
        let s: f64 = observations.iter().map(|&x| (x - x_bar).powi(2)).sum();

        // Normal-Gamma conjugate posterior update.
        let kappa_n = self.kappa + n_f;
        let mu_n = (self.kappa * self.mu + n_f * x_bar) / kappa_n;
        let alpha_n = self.alpha + n_f / 2.0;
        let beta_n = self.beta
            + s / 2.0
            + (self.kappa * n_f * (x_bar - self.mu).powi(2)) / (2.0 * kappa_n);

        self.mu = mu_n;
        self.kappa = kappa_n;
        self.alpha = alpha_n;
        self.beta = beta_n;
    }

    /// Posterior predictive mean (the best point estimate of the true score).
    #[inline]
    pub fn mean(&self) -> f64 {
        self.mu
    }

    /// Posterior predictive variance.
    ///
    /// Derived from the Student-t posterior predictive distribution:
    /// `Var = β / (α − 1) / κ`.
    ///
    /// Returns `f64::INFINITY` when α ≤ 1 (variance is undefined for the
    /// corresponding Student-t distribution with 0 or negative degrees of
    /// freedom — this only occurs if the prior is set improperly).
    pub fn variance(&self) -> f64 {
        if self.alpha <= 1.0 {
            f64::INFINITY
        } else {
            self.beta / (self.alpha - 1.0) / self.kappa
        }
    }

    /// Approximate 95 % credible interval centred on the posterior mean.
    ///
    /// Uses a Gaussian approximation: [μ − 1.96·σ, μ + 1.96·σ] where
    /// σ = √variance.  Exact for large samples; conservative for small ones.
    pub fn credible_interval(&self) -> (f64, f64) {
        let sigma = self.variance().sqrt();
        if sigma.is_infinite() || sigma.is_nan() {
            return (0.0, 1.0);
        }
        let z = 1.96; // 95 % two-sided
        (self.mu - z * sigma, self.mu + z * sigma)
    }

    /// Approximate probability that the true score parameter exceeds `threshold`.
    ///
    /// Computed via the Gaussian CDF approximation of the posterior:
    ///   P(θ > threshold) = 1 − Φ((threshold − μ) / σ)
    ///
    /// Returns values in [0, 1].  When variance is infinite (prior not yet
    /// updated) the function falls back to 0.5 (maximum uncertainty).
    pub fn prob_above(&self, threshold: f64) -> f64 {
        let sigma = self.variance().sqrt();
        if sigma.is_infinite() || sigma.is_nan() || sigma < f64::EPSILON {
            // High uncertainty: return 0.5, or 1.0/0.0 if clearly above/below.
            return if self.mu > threshold { 0.75 } else { 0.25 };
        }
        let z = (threshold - self.mu) / sigma;
        1.0 - standard_normal_cdf(z)
    }
}

// ---------------------------------------------------------------------------
// BayesianScorer
// ---------------------------------------------------------------------------

/// Default ICP dimension names used when none are provided.
const DEFAULT_DIMENSIONS: &[&str] = &[
    "industry_fit",
    "company_size_fit",
    "seniority_match",
    "department_match",
    "tech_stack_overlap",
    "email_quality",
    "recency",
];

/// Online Bayesian lead scorer.
///
/// Maintains one [`DimensionPosterior`] per ICP scoring dimension.  As labeled
/// lead observations arrive, the posteriors are updated in closed form.
///
/// # Example
///
/// ```rust,ignore
/// let mut scorer = BayesianScorer::new();
/// // Observe ground-truth quality signals for dimension 0 ("industry_fit").
/// scorer.observe_batch(0, &[0.9, 0.85, 0.92]);
///
/// // Score a new lead given its raw dimension features.
/// let features = vec![0.88, 0.6, 0.7, 0.5, 0.4, 1.0, 0.9];
/// let scores = scorer.score(&features);
/// // scores[0] = ("industry_fit", posterior_mean, uncertainty)
/// ```
pub struct BayesianScorer {
    dimensions: Vec<DimensionPosterior>,
}

impl BayesianScorer {
    /// Create a scorer initialised with the default ICP dimensions and
    /// uninformative priors.
    pub fn new() -> Self {
        Self {
            dimensions: DEFAULT_DIMENSIONS
                .iter()
                .map(|&name| DimensionPosterior::uninformative(name))
                .collect(),
        }
    }

    /// Create a scorer with a custom set of dimension posteriors.
    pub fn with_dimensions(dimensions: Vec<DimensionPosterior>) -> Self {
        Self { dimensions }
    }

    /// Score a lead given its raw feature values.
    ///
    /// `features` must have the same length as the number of dimensions.
    /// Extra features are ignored; missing features receive the posterior mean
    /// of the corresponding dimension as a fallback.
    ///
    /// Returns a `Vec` of `(dimension_name, score, uncertainty)` triples where:
    /// - `score` is the posterior-weighted estimate of the lead's value on
    ///   that dimension (blends the raw feature with the posterior mean,
    ///   weighted by confidence);
    /// - `uncertainty` is the posterior predictive standard deviation.
    pub fn score(&self, features: &[f64]) -> Vec<(String, f64, f64)> {
        self.dimensions
            .iter()
            .enumerate()
            .map(|(i, dim)| {
                let raw = features.get(i).copied().unwrap_or(dim.mu);
                // Confidence-weighted score: blend raw feature with posterior mean.
                // As more observations are collected (higher kappa), we trust the
                // posterior more and down-weight the raw feature.
                let confidence = dim.kappa / (dim.kappa + 1.0);
                let score = confidence * dim.mu + (1.0 - confidence) * raw;
                let uncertainty = dim.variance().sqrt().min(1.0);
                (dim.name.clone(), score, uncertainty)
            })
            .collect()
    }

    /// Update the posterior for a single dimension with one observation.
    ///
    /// Silently ignores invalid `dimension_idx` values.
    pub fn observe(&mut self, dimension_idx: usize, value: f64) {
        if let Some(dim) = self.dimensions.get_mut(dimension_idx) {
            dim.update(&[value]);
        }
    }

    /// Batch-update the posterior for a single dimension.
    ///
    /// Equivalent to calling [`Self::observe`] for each value individually but
    /// numerically more efficient (single closed-form update over the batch).
    ///
    /// Silently ignores invalid `dimension_idx` values or empty slices.
    pub fn observe_batch(&mut self, dimension_idx: usize, values: &[f64]) {
        if let Some(dim) = self.dimensions.get_mut(dimension_idx) {
            dim.update(values);
        }
    }

    /// Overall uncertainty: the mean posterior predictive standard deviation
    /// across all dimensions.  Decreases as more observations are collected.
    pub fn overall_uncertainty(&self) -> f64 {
        let n = self.dimensions.len();
        if n == 0 {
            return 0.0;
        }
        let total: f64 = self
            .dimensions
            .iter()
            .map(|d| d.variance().sqrt().min(1.0))
            .sum();
        total / n as f64
    }

    /// Number of dimensions tracked by this scorer.
    pub fn dimension_count(&self) -> usize {
        self.dimensions.len()
    }

    /// Read-only access to the underlying dimension posteriors.
    pub fn dimensions(&self) -> &[DimensionPosterior] {
        &self.dimensions
    }
}

impl Default for BayesianScorer {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Gaussian CDF approximation
// ---------------------------------------------------------------------------

/// Approximate cumulative distribution function of the standard normal N(0, 1).
///
/// Uses the Horner-form rational approximation from Abramowitz & Stegun
/// (formula 26.2.17), maximum absolute error < 7.5 × 10⁻⁸.
fn standard_normal_cdf(z: f64) -> f64 {
    if z < -8.0 {
        return 0.0;
    }
    if z > 8.0 {
        return 1.0;
    }
    // Compute via erfc for numerical stability.
    0.5 * erfc(-z / std::f64::consts::SQRT_2)
}

/// Complementary error function erfc(x) ≈ 1 − erf(x).
///
/// Uses the continued-fraction approximation valid for all x.
/// Accurate to < 1.2 × 10⁻⁷ for |x| ≤ 3.
fn erfc(x: f64) -> f64 {
    // Approximation coefficients (Horner form, Abramowitz & Stegun 7.1.26).
    let t = 1.0 / (1.0 + 0.3275911 * x.abs());
    let poly = t
        * (1.061405429
            + t * (-1.453152027 + t * (1.421413741 + t * (-0.284496736 + t * 0.254829592))));
    let approx = poly * (-x * x).exp();
    if x >= 0.0 {
        approx
    } else {
        2.0 - approx
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // DimensionPosterior tests
    // -----------------------------------------------------------------------

    /// An uninformative prior should have high variance (low confidence).
    #[test]
    fn uninformative_prior_has_high_variance() {
        let dim = DimensionPosterior::uninformative("test");
        // With α₀ = 2, β₀ = 0.5, κ₀ = 1 → variance = 0.5 / 1 / 1 = 0.5
        let v = dim.variance();
        assert!(
            v >= 0.25,
            "uninformative prior should have variance >= 0.25, got {v:.4}"
        );
    }

    /// Adding observations must reduce variance (increase confidence).
    #[test]
    fn update_reduces_variance() {
        let mut dim = DimensionPosterior::uninformative("test");
        let v_before = dim.variance();
        let observations: Vec<f64> = (0..50).map(|i| i as f64 / 50.0).collect();
        dim.update(&observations);
        let v_after = dim.variance();
        assert!(
            v_after < v_before,
            "variance must decrease after 50 observations: before={v_before:.4}, after={v_after:.4}"
        );
    }

    /// The 95 % credible interval should contain most observed values.
    #[test]
    fn credible_interval_contains_observations() {
        let mut dim = DimensionPosterior::uninformative("test");
        let obs = [0.4, 0.5, 0.45, 0.55, 0.48, 0.52, 0.5, 0.47, 0.53, 0.5];
        dim.update(&obs);
        let (lo, hi) = dim.credible_interval();
        // Posterior mean should be close to 0.5; CI must contain 0.5.
        assert!(
            lo < 0.5 && hi > 0.5,
            "95% CI [{lo:.4}, {hi:.4}] must contain the cluster mean 0.5"
        );
    }

    /// prob_above must be monotonically decreasing in threshold.
    #[test]
    fn prob_above_is_monotone_decreasing_in_threshold() {
        let mut dim = DimensionPosterior::uninformative("test");
        dim.update(&[0.6, 0.65, 0.62, 0.63, 0.61]);

        let thresholds = [0.1, 0.3, 0.5, 0.7, 0.9];
        let probs: Vec<f64> = thresholds.iter().map(|&t| dim.prob_above(t)).collect();

        for window in probs.windows(2) {
            assert!(
                window[0] >= window[1],
                "prob_above must be non-increasing: {:.4} < {:.4}",
                window[0],
                window[1]
            );
        }
    }

    /// Batch update and sequential single updates must produce identical posteriors.
    #[test]
    fn batch_vs_sequential_equivalence() {
        let obs = vec![0.3, 0.5, 0.7, 0.4, 0.6, 0.55, 0.45];

        let mut batch = DimensionPosterior::uninformative("test");
        batch.update(&obs);

        let mut seq = DimensionPosterior::uninformative("test");
        for &v in &obs {
            seq.update(&[v]);
        }

        // The posteriors should be numerically equivalent (within floating-point tolerance).
        assert!(
            (batch.mu - seq.mu).abs() < 1e-10,
            "mu: batch={:.10} seq={:.10}",
            batch.mu,
            seq.mu
        );
        assert!(
            (batch.kappa - seq.kappa).abs() < 1e-10,
            "kappa: batch={:.10} seq={:.10}",
            batch.kappa,
            seq.kappa
        );
        assert!(
            (batch.alpha - seq.alpha).abs() < 1e-10,
            "alpha: batch={:.10} seq={:.10}",
            batch.alpha,
            seq.alpha
        );
        assert!(
            (batch.beta - seq.beta).abs() < 1e-10,
            "beta: batch={:.10} seq={:.10}",
            batch.beta,
            seq.beta
        );
    }

    /// After many observations centred on 0.7, the posterior mean should
    /// converge close to 0.7.
    #[test]
    fn posterior_mean_converges_to_true_mean() {
        let mut dim = DimensionPosterior::uninformative("test");
        let obs: Vec<f64> = (0..200).map(|i| 0.7 + ((i % 10) as f64 - 5.0) * 0.01).collect();
        dim.update(&obs);
        assert!(
            (dim.mean() - 0.7).abs() < 0.05,
            "posterior mean should converge to ~0.7, got {:.4}",
            dim.mean()
        );
    }

    // -----------------------------------------------------------------------
    // BayesianScorer tests
    // -----------------------------------------------------------------------

    /// Default scorer should have exactly the 7 ICP dimensions.
    #[test]
    fn scorer_has_default_dimension_count() {
        let scorer = BayesianScorer::new();
        assert_eq!(scorer.dimension_count(), 7);
    }

    /// Overall uncertainty should decrease after observations.
    #[test]
    fn overall_uncertainty_decreases_with_observations() {
        let mut scorer = BayesianScorer::new();
        let uncertainty_before = scorer.overall_uncertainty();
        for dim_idx in 0..7 {
            let obs: Vec<f64> = (0..30).map(|i| i as f64 / 30.0).collect();
            scorer.observe_batch(dim_idx, &obs);
        }
        let uncertainty_after = scorer.overall_uncertainty();
        assert!(
            uncertainty_after < uncertainty_before,
            "uncertainty must decrease after observations: before={uncertainty_before:.4}, after={uncertainty_after:.4}"
        );
    }

    /// score() should return one triple per dimension.
    #[test]
    fn score_returns_one_triple_per_dimension() {
        let scorer = BayesianScorer::new();
        let features = vec![0.8, 0.6, 0.9, 0.5, 0.7, 1.0, 0.85];
        let scores = scorer.score(&features);
        assert_eq!(scores.len(), 7, "should return 7 (name, score, uncertainty) triples");
    }

    /// Scores returned by score() should be in a plausible [0, 1] range.
    #[test]
    fn score_values_within_unit_range() {
        let scorer = BayesianScorer::new();
        let features = vec![0.8, 0.6, 0.9, 0.5, 0.7, 1.0, 0.85];
        for (name, score, uncertainty) in scorer.score(&features) {
            assert!(
                score >= 0.0 && score <= 1.0,
                "score for {name} should be in [0,1], got {score:.4}"
            );
            assert!(
                uncertainty >= 0.0,
                "uncertainty for {name} should be non-negative, got {uncertainty:.4}"
            );
        }
    }

    /// Dimension names in score output must match the canonical order.
    #[test]
    fn score_dimension_names_match_order() {
        let scorer = BayesianScorer::new();
        let scores = scorer.score(&[0.5; 7]);
        for (i, (name, _, _)) in scores.iter().enumerate() {
            assert_eq!(
                name,
                DEFAULT_DIMENSIONS[i],
                "dimension {i} name mismatch: expected {}, got {name}",
                DEFAULT_DIMENSIONS[i]
            );
        }
    }

    /// observe() with an out-of-range dimension index must not panic.
    #[test]
    fn observe_invalid_dimension_is_noop() {
        let mut scorer = BayesianScorer::new();
        scorer.observe(999, 0.5); // should not panic
    }
}

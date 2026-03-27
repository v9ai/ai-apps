/// Ensemble entity matching via online logistic regression.
///
/// Implements the EnsembleLink approach from AnyMatch (AAAI 2025): combines
/// multiple weak matching signals into a single match probability using a
/// weight vector learned through stochastic gradient descent with L2
/// regularisation.
///
/// Feature vector layout (8 features, indices are stable):
///
/// | Index | Feature               | Range  |
/// |-------|-----------------------|--------|
/// | 0     | name_jaro_winkler     | [0, 1] |
/// | 1     | email_exact_match     | {0, 1} |
/// | 2     | email_local_similarity| [0, 1] |
/// | 3     | domain_match          | {0, 1} |
/// | 4     | title_similarity      | [0, 1] |
/// | 5     | linkedin_match        | {0, 1} |
/// | 6     | phone_match           | {0, 1} |
/// | 7     | embedding_cosine      | [0, 1] |
use crate::Contact;

const N_FEATURES: usize = 8;

/// Online logistic regression scorer for entity pair matching.
///
/// Weights are initialised from domain knowledge (email / LinkedIn / phone are
/// the strongest signals) and refined through [`train`] calls as labelled pairs
/// become available.
pub struct EnsembleMatchScorer {
    weights: Vec<f64>,
    bias: f64,
    learning_rate: f64,
    l2_lambda: f64,
    observations: u64,
}

impl Default for EnsembleMatchScorer {
    fn default() -> Self {
        Self::new()
    }
}

impl EnsembleMatchScorer {
    /// Create a scorer with prior-knowledge weights.
    ///
    /// Weight ordering matches the feature-vector layout documented on the
    /// module.  `email_exact` (index 1) and `linkedin_match` (index 5) start
    /// highest because either alone is near-deterministic evidence of the same
    /// person.
    pub fn new() -> Self {
        Self {
            weights: vec![0.3, 1.0, 0.2, 0.1, 0.1, 1.0, 0.8, 0.4],
            bias: -0.5,
            learning_rate: 0.01,
            l2_lambda: 0.001,
            observations: 0,
        }
    }

    /// Score a candidate pair.  Returns match probability in [0, 1].
    pub fn score(&self, features: &[f64; N_FEATURES]) -> f64 {
        let z: f64 = self
            .weights
            .iter()
            .zip(features.iter())
            .map(|(w, x)| w * x)
            .sum::<f64>()
            + self.bias;
        sigmoid(z)
    }

    /// Online update: adjust weights given a labelled pair.
    ///
    /// `label` must be `1.0` for a confirmed match or `0.0` for a confirmed
    /// non-match.  The update rule is:
    ///
    /// ```text
    /// w_i ← w_i + lr * (y - ŷ) * x_i − λ * w_i
    /// b   ← b   + lr * (y - ŷ)
    /// ```
    ///
    /// L2 regularisation (the `−λ * w_i` term) shrinks weights toward zero
    /// each step, preventing any single feature from dominating on sparse data.
    pub fn train(&mut self, features: &[f64; N_FEATURES], label: f64) {
        let pred = self.score(features);
        let error = label - pred;
        for i in 0..N_FEATURES {
            self.weights[i] +=
                self.learning_rate * error * features[i] - self.l2_lambda * self.weights[i];
        }
        self.bias += self.learning_rate * error;
        self.observations += 1;
    }

    /// Extract the 8-feature vector from a contact pair.
    ///
    /// `embedding_sim` is the pre-computed cosine similarity between the two
    /// contact embeddings.  Pass `None` when embeddings are unavailable; the
    /// feature will be set to `0.0`, which is conservative (unknown ≠ match).
    pub fn extract_features(
        a: &Contact,
        b: &Contact,
        embedding_sim: Option<f64>,
    ) -> [f64; N_FEATURES] {
        let mut feat = [0.0f64; N_FEATURES];

        // 0 — Jaro-Winkler on full name.
        let name_a = format!("{} {}", a.first_name, a.last_name).to_lowercase();
        let name_b = format!("{} {}", b.first_name, b.last_name).to_lowercase();
        feat[0] = strsim::jaro_winkler(&name_a, &name_b);

        // 1 — Exact email match (both fields must be non-empty).
        // 2 — Email local-part similarity (Jaro-Winkler on the user@ portion).
        if let (Some(ea), Some(eb)) = (&a.email, &b.email) {
            let ea = ea.to_lowercase();
            let eb = eb.to_lowercase();
            if !ea.is_empty() && !eb.is_empty() {
                if ea == eb {
                    feat[1] = 1.0;
                } else {
                    let la = ea.split('@').next().unwrap_or("");
                    let lb = eb.split('@').next().unwrap_or("");
                    if !la.is_empty() && !lb.is_empty() {
                        feat[2] = strsim::jaro_winkler(la, lb);
                    }
                }
            }
        }

        // 3 — Domain match: same email domain implies same employer.
        let domain_a = a
            .email
            .as_deref()
            .and_then(|e| e.split('@').nth(1))
            .map(str::to_lowercase);
        let domain_b = b
            .email
            .as_deref()
            .and_then(|e| e.split('@').nth(1))
            .map(str::to_lowercase);
        if let (Some(da), Some(db)) = (&domain_a, &domain_b) {
            if !da.is_empty() && da == db {
                feat[3] = 1.0;
            }
        }

        // 4 — Title similarity (Jaro-Winkler).
        if let (Some(ta), Some(tb)) = (&a.title, &b.title) {
            feat[4] = strsim::jaro_winkler(&ta.to_lowercase(), &tb.to_lowercase());
        }

        // 5 — LinkedIn URL match (normalise before comparing).
        if let (Some(la), Some(lb)) = (&a.linkedin_url, &b.linkedin_url) {
            if !la.is_empty() && normalize_linkedin(la) == normalize_linkedin(lb) {
                feat[5] = 1.0;
            }
        }

        // 6 — Phone match (digits only).
        if let (Some(pa), Some(pb)) = (&a.phone, &b.phone) {
            let na = digits_only(pa);
            let nb = digits_only(pb);
            if !na.is_empty() && na == nb {
                feat[6] = 1.0;
            }
        }

        // 7 — Embedding cosine similarity (caller-supplied; 0.0 if absent).
        feat[7] = embedding_sim.unwrap_or(0.0).clamp(0.0, 1.0);

        feat
    }

    /// Current weight vector (index-stable, matches feature layout).
    pub fn weights(&self) -> &[f64] {
        &self.weights
    }

    /// Number of online training steps completed.
    pub fn observation_count(&self) -> u64 {
        self.observations
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

fn normalize_linkedin(url: &str) -> String {
    url.to_lowercase()
        .trim_end_matches('/')
        .replace("http://", "https://")
        .replace("www.linkedin.com", "linkedin.com")
        .to_string()
}

fn digits_only(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_digit()).collect()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_contact(
        id: &str,
        first: &str,
        last: &str,
        email: Option<&str>,
        title: Option<&str>,
        linkedin: Option<&str>,
        phone: Option<&str>,
    ) -> Contact {
        Contact {
            id: id.into(),
            company_id: None,
            first_name: first.into(),
            last_name: last.into(),
            title: title.map(Into::into),
            seniority: None,
            department: None,
            email: email.map(Into::into),
            email_status: None,
            linkedin_url: linkedin.map(Into::into),
            phone: phone.map(Into::into),
            source: None,
            created_at: None,
        }
    }

    // -- sigmoid --

    #[test]
    fn sigmoid_at_zero_is_half() {
        let s = sigmoid(0.0);
        assert!((s - 0.5).abs() < 1e-10, "sigmoid(0) should be 0.5, got {s}");
    }

    #[test]
    fn sigmoid_stays_in_unit_interval() {
        for x in [-100.0, -10.0, -1.0, 0.0, 1.0, 10.0, 100.0] {
            let s = sigmoid(x);
            assert!(
                (0.0..=1.0).contains(&s),
                "sigmoid({x}) = {s} is outside [0,1]"
            );
        }
    }

    #[test]
    fn sigmoid_monotone_increasing() {
        let mut prev = sigmoid(-10.0);
        for &x in &[-5.0, -1.0, 0.0, 1.0, 5.0, 10.0] {
            let cur = sigmoid(x);
            assert!(cur > prev, "sigmoid must be strictly increasing");
            prev = cur;
        }
    }

    // -- untrained scorer --

    #[test]
    fn untrained_scorer_gives_reasonable_scores() {
        let scorer = EnsembleMatchScorer::new();

        // Perfect match features should score > 0.5.
        let perfect: [f64; 8] = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
        let high = scorer.score(&perfect);
        assert!(high > 0.5, "all-1 features should score > 0.5, got {high}");

        // All-zero features should score < 0.5 (because bias = -0.5).
        let empty: [f64; 8] = [0.0; 8];
        let low = scorer.score(&empty);
        assert!(low < 0.5, "all-0 features should score < 0.5, got {low}");
    }

    #[test]
    fn score_stays_in_unit_interval() {
        let scorer = EnsembleMatchScorer::new();
        for f in [
            [0.0; 8],
            [1.0; 8],
            [0.5, 0.0, 1.0, 0.0, 0.5, 1.0, 0.0, 0.8],
        ] {
            let s = scorer.score(&f);
            assert!(
                (0.0..=1.0).contains(&s),
                "score {s} is outside [0,1] for features {f:?}"
            );
        }
    }

    // -- training convergence --

    #[test]
    fn training_converges_on_match_pairs() {
        let mut scorer = EnsembleMatchScorer::new();
        let positive: [f64; 8] = [0.95, 1.0, 0.0, 1.0, 0.9, 0.0, 0.0, 0.85];

        let before = scorer.score(&positive);
        for _ in 0..200 {
            scorer.train(&positive, 1.0);
        }
        let after = scorer.score(&positive);

        assert!(
            after > before,
            "training on matches should increase score: {before} -> {after}"
        );
        assert!(
            after > 0.85,
            "score should converge toward 1.0 after 200 positive examples, got {after}"
        );
    }

    #[test]
    fn training_converges_on_non_match_pairs() {
        let mut scorer = EnsembleMatchScorer::new();
        // Weak signals — two different people, similar names only.
        let negative: [f64; 8] = [0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

        let before = scorer.score(&negative);
        for _ in 0..200 {
            scorer.train(&negative, 0.0);
        }
        let after = scorer.score(&negative);

        assert!(
            after < before || after < 0.2,
            "training on non-matches should decrease score: {before} -> {after}"
        );
    }

    #[test]
    fn observation_count_increments() {
        let mut scorer = EnsembleMatchScorer::new();
        assert_eq!(scorer.observation_count(), 0);
        scorer.train(&[0.0; 8], 0.0);
        scorer.train(&[1.0; 8], 1.0);
        assert_eq!(scorer.observation_count(), 2);
    }

    // -- L2 regularisation --

    #[test]
    fn l2_regularisation_shrinks_weights() {
        // Train on all-zero features: no gradient for weights, only L2 decay.
        let mut scorer = EnsembleMatchScorer::new();
        let initial_norm: f64 = scorer.weights().iter().map(|w| w * w).sum::<f64>().sqrt();

        for _ in 0..500 {
            scorer.train(&[0.0; 8], 0.5); // neutral label → minimal gradient
        }
        let final_norm: f64 = scorer.weights().iter().map(|w| w * w).sum::<f64>().sqrt();

        assert!(
            final_norm < initial_norm,
            "L2 should shrink weight norm: {initial_norm:.4} -> {final_norm:.4}"
        );
    }

    // -- feature extraction --

    #[test]
    fn extract_features_returns_8_values() {
        let a = make_contact("1", "Alice", "Smith", Some("alice@acme.com"), Some("Engineer"), None, None);
        let b = make_contact("2", "Bob", "Jones", Some("bob@other.com"), Some("Manager"), None, None);
        let feat = EnsembleMatchScorer::extract_features(&a, &b, None);
        assert_eq!(feat.len(), 8);
    }

    #[test]
    fn extract_features_all_in_unit_interval() {
        let a = make_contact(
            "1", "Alice", "Smith",
            Some("alice@acme.com"), Some("Software Engineer"),
            Some("https://linkedin.com/in/alice"), Some("+1-555-123-4567"),
        );
        let b = make_contact(
            "2", "Alice", "Smith",
            Some("alice@acme.com"), Some("Software Engineer"),
            Some("https://linkedin.com/in/alice"), Some("+15551234567"),
        );
        let feat = EnsembleMatchScorer::extract_features(&a, &b, Some(0.95));
        for (i, &v) in feat.iter().enumerate() {
            assert!(
                (0.0..=1.0).contains(&v),
                "feature[{i}] = {v} is outside [0,1]"
            );
        }
    }

    #[test]
    fn exact_email_sets_feature_1_and_not_2() {
        let a = make_contact("1", "Alice", "Smith", Some("alice@acme.com"), None, None, None);
        let b = make_contact("2", "Alice", "Smith", Some("alice@acme.com"), None, None, None);
        let feat = EnsembleMatchScorer::extract_features(&a, &b, None);
        assert_eq!(feat[1], 1.0, "exact email match should set feature[1]=1");
        assert_eq!(feat[2], 0.0, "exact email match must not set local-part feature");
    }

    #[test]
    fn matching_linkedin_sets_feature_5() {
        let a = make_contact(
            "1", "Alice", "Smith", None, None,
            Some("https://linkedin.com/in/alicesmith/"), None,
        );
        let b = make_contact(
            "2", "Alice", "Smith", None, None,
            Some("https://www.linkedin.com/in/alicesmith"), None,
        );
        let feat = EnsembleMatchScorer::extract_features(&a, &b, None);
        assert_eq!(feat[5], 1.0, "normalised LinkedIn match should set feature[5]=1");
    }

    #[test]
    fn matching_phone_sets_feature_6() {
        let a = make_contact("1", "Alice", "Smith", None, None, None, Some("+1 (555) 000-1234"));
        let b = make_contact("2", "Alice", "Smith", None, None, None, Some("15550001234"));
        let feat = EnsembleMatchScorer::extract_features(&a, &b, None);
        assert_eq!(feat[6], 1.0, "digits-normalised phone match should set feature[6]=1");
    }

    #[test]
    fn embedding_sim_clamped_to_unit_interval() {
        let a = make_contact("1", "A", "B", None, None, None, None);
        let b = make_contact("2", "C", "D", None, None, None, None);
        let feat_high = EnsembleMatchScorer::extract_features(&a, &b, Some(1.5));
        let feat_low = EnsembleMatchScorer::extract_features(&a, &b, Some(-0.3));
        assert_eq!(feat_high[7], 1.0, "embedding_sim > 1 should clamp to 1.0");
        assert_eq!(feat_low[7], 0.0, "embedding_sim < 0 should clamp to 0.0");
    }

    #[test]
    fn no_email_leaves_features_1_2_3_zero() {
        let a = make_contact("1", "Alice", "Smith", None, None, None, None);
        let b = make_contact("2", "Alice", "Smith", None, None, None, None);
        let feat = EnsembleMatchScorer::extract_features(&a, &b, None);
        assert_eq!(feat[1], 0.0);
        assert_eq!(feat[2], 0.0);
        assert_eq!(feat[3], 0.0);
    }

    #[test]
    fn weights_length_is_8() {
        let scorer = EnsembleMatchScorer::new();
        assert_eq!(scorer.weights().len(), 8);
    }
}

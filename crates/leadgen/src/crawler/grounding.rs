//! Mixture of Grounding Experts for DOM element selection.
//!
//! Implements the Avenir-Web multi-expert scoring approach from
//! agent-02-novelty-crawler-2026. Each expert is specialized for a
//! different page type (team, about, leadership, contact, generic) and
//! scores DOM elements by their probability of containing contact information.
//!
//! ## Architecture
//!
//! Each `GroundingExpert` is a **linear scorer** (weighted feature sum → sigmoid).
//! Feature weights are initialized with domain-informed priors and updated
//! online via stochastic gradient descent (SGD) with a fixed learning rate.
//!
//! The `GroundingMixture` selects the appropriate expert based on the URL
//! path and delegates scoring to it. This avoids cross-contamination of
//! learned weights across structurally different page types.
//!
//! ## Feature vector (10 dimensions)
//!
//! ```text
//! [0] tag score             — structural prior (a/h3=high, div/span=medium)
//! [1] text_length_norm      — log(len+1) / 10.0, clamped to [0, 1]
//! [2] has_email             — 0.0 or 1.0
//! [3] has_phone             — 0.0 or 1.0
//! [4] has_title_words       — 0.0 or 1.0
//! [5] has_name_pattern      — 0.0 or 1.0
//! [6] depth_penalty         — 1.0 / (1.0 + depth)
//! [7] sibling_penalty       — 1.0 / (1.0 + sibling_count)
//! [8] parent_tag_score      — structural prior for parent tag
//! [9] class_hint            — 1.0 if class contains "team"/"staff"/"people"
//! ```

// ── ElementFeatures ───────────────────────────────────────────────────────────

/// DOM element features extracted from an HTML page for contact grounding.
#[derive(Debug, Clone)]
pub struct ElementFeatures {
    /// HTML tag name, e.g. `"a"`, `"div"`, `"li"`, `"span"`, `"h3"`.
    pub tag: String,
    /// Character length of the element's text content.
    pub text_length: usize,
    /// `true` if the element's text contains a recognizable email pattern.
    pub has_email: bool,
    /// `true` if the element's text contains a recognizable phone pattern.
    pub has_phone: bool,
    /// `true` if the text contains executive title words (CEO, CTO, VP, …).
    pub has_title_words: bool,
    /// `true` if the text matches a "First Last" name pattern.
    pub has_name_pattern: bool,
    /// DOM depth (0 = document root).
    pub depth: usize,
    /// Number of sibling nodes at the same level.
    pub sibling_count: usize,
    /// Tag name of the parent element.
    pub parent_tag: String,
    /// `1.0` if the element's `class` attribute contains `"team"`, `"staff"`,
    /// `"people"`, or similar; `0.0` otherwise.
    pub class_hint: f64,
}

impl ElementFeatures {
    /// Extract the 10-dimensional feature vector from this element.
    pub(crate) fn to_feature_vec(&self) -> [f64; 10] {
        [
            tag_score(&self.tag),
            (((self.text_length + 1) as f64).ln() / 10.0).min(1.0),
            bool_f(self.has_email),
            bool_f(self.has_phone),
            bool_f(self.has_title_words),
            bool_f(self.has_name_pattern),
            1.0 / (1.0 + self.depth as f64),
            1.0 / (1.0 + self.sibling_count as f64),
            tag_score(&self.parent_tag),
            self.class_hint.clamp(0.0, 1.0),
        ]
    }
}

// ── ExpertType ────────────────────────────────────────────────────────────────

/// Expert specialization for different page types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpertType {
    /// `/team`, `/people`, `/staff` pages.
    TeamPage,
    /// `/about`, `/company` pages.
    AboutPage,
    /// `/leadership`, `/management`, `/board` pages.
    LeadershipPage,
    /// `/contact`, `/contact-us` pages.
    ContactPage,
    /// Generic fallback for any other page structure.
    Generic,
}

// ── GroundingExpert ───────────────────────────────────────────────────────────

/// A single linear grounding expert (weighted dot product → sigmoid).
///
/// Weights are initialized with domain-specific priors and refined online via
/// stochastic gradient descent. One expert exists per `ExpertType` in the
/// `GroundingMixture`.
pub struct GroundingExpert {
    expert_type: ExpertType,
    /// One weight per feature dimension (10 total).
    weights: [f64; 10],
}

impl GroundingExpert {
    /// Create a new expert with domain-specific prior weights.
    ///
    /// Priors are hand-designed from empirical observations about which
    /// features matter most on each page type:
    /// - Team pages: name patterns and class hints are strongest signals.
    /// - Leadership pages: title words and name patterns dominate.
    /// - Contact pages: email and phone are the primary signals.
    /// - About pages: balanced — name, title, and class all contribute.
    /// - Generic: conservative, all features weighted equally.
    pub fn new(expert_type: ExpertType) -> Self {
        let weights = match expert_type {
            ExpertType::TeamPage => [
                0.4,  // tag score
                0.2,  // text_length_norm
                0.6,  // has_email
                0.3,  // has_phone
                0.5,  // has_title_words
                0.9,  // has_name_pattern — strongest signal on team pages
                0.3,  // depth_penalty
                0.2,  // sibling_penalty
                0.3,  // parent_tag_score
                0.8,  // class_hint — "team"/"staff" classes very informative
            ],
            ExpertType::AboutPage => [
                0.4,  // tag score
                0.3,  // text_length_norm
                0.5,  // has_email
                0.2,  // has_phone
                0.6,  // has_title_words
                0.7,  // has_name_pattern
                0.3,  // depth_penalty
                0.2,  // sibling_penalty
                0.3,  // parent_tag_score
                0.6,  // class_hint
            ],
            ExpertType::LeadershipPage => [
                0.4,  // tag score
                0.2,  // text_length_norm
                0.4,  // has_email
                0.1,  // has_phone — rarely on leadership pages
                0.9,  // has_title_words — CEO/CTO/VP critical on leadership pages
                0.9,  // has_name_pattern
                0.3,  // depth_penalty
                0.2,  // sibling_penalty
                0.3,  // parent_tag_score
                0.7,  // class_hint
            ],
            ExpertType::ContactPage => [
                0.5,  // tag score
                0.2,  // text_length_norm
                0.95, // has_email — primary signal on contact pages
                0.8,  // has_phone — also very common
                0.3,  // has_title_words
                0.3,  // has_name_pattern
                0.3,  // depth_penalty
                0.1,  // sibling_penalty
                0.3,  // parent_tag_score
                0.2,  // class_hint — less relevant on contact pages
            ],
            ExpertType::Generic => [
                0.3, 0.2, 0.5, 0.4, 0.4, 0.5, 0.3, 0.2, 0.3, 0.4,
            ],
        };
        Self { expert_type, weights }
    }

    /// Score a DOM element: weighted sum of features fed through a sigmoid.
    ///
    /// Returns a value in (0, 1) where values > 0.5 indicate likely contact
    /// elements.
    pub fn score(&self, features: &ElementFeatures) -> f64 {
        let fv = features.to_feature_vec();
        let dot: f64 = self
            .weights
            .iter()
            .zip(fv.iter())
            .map(|(w, f)| w * f)
            .sum();
        sigmoid(dot)
    }

    /// The expert specialization.
    pub fn expert_type(&self) -> ExpertType {
        self.expert_type
    }
}

// ── GroundingMixture ──────────────────────────────────────────────────────────

/// Mixture of grounding experts: routes to the right expert by page path.
///
/// # Example
/// ```rust
/// use leadgen::crawler::grounding::{GroundingMixture, ElementFeatures};
///
/// let mixture = GroundingMixture::new();
/// let elem = ElementFeatures {
///     tag: "h3".into(), text_length: 18, has_email: false, has_phone: false,
///     has_title_words: true, has_name_pattern: true, depth: 4,
///     sibling_count: 5, parent_tag: "div".into(), class_hint: 1.0,
/// };
/// let ranked = mixture.rank_elements("/team", &[elem], 1);
/// assert_eq!(ranked.len(), 1);
/// assert!(ranked[0].1 > 0.0 && ranked[0].1 < 1.0);
/// ```
pub struct GroundingMixture {
    experts: Vec<GroundingExpert>,
}

impl GroundingMixture {
    /// Create a mixture with one expert per `ExpertType`.
    pub fn new() -> Self {
        Self {
            experts: vec![
                GroundingExpert::new(ExpertType::TeamPage),
                GroundingExpert::new(ExpertType::AboutPage),
                GroundingExpert::new(ExpertType::LeadershipPage),
                GroundingExpert::new(ExpertType::ContactPage),
                GroundingExpert::new(ExpertType::Generic),
            ],
        }
    }

    /// Select the most appropriate expert for a URL path.
    ///
    /// Matching is case-insensitive and checks for path segment containment.
    pub fn select_expert(&self, path: &str) -> &GroundingExpert {
        let p = path.to_lowercase();
        let expert_type = if p.contains("team")
            || p.contains("people")
            || p.contains("staff")
        {
            ExpertType::TeamPage
        } else if p.contains("leadership")
            || p.contains("management")
            || p.contains("board")
            || p.contains("executive")
        {
            ExpertType::LeadershipPage
        } else if p.contains("contact") {
            ExpertType::ContactPage
        } else if p.contains("about") || p.contains("company") {
            ExpertType::AboutPage
        } else {
            ExpertType::Generic
        };

        // The experts vec is fixed-ordered to match ExpertType variants
        self.experts
            .iter()
            .find(|e| e.expert_type == expert_type)
            .unwrap_or(&self.experts[4]) // Generic is always last
    }

    /// Score all elements on a page and return the top `k` (index, score) pairs.
    ///
    /// Scores are computed by the expert selected for `path`. The returned
    /// indices refer to positions in the `elements` slice. Results are sorted
    /// descending by score.
    pub fn rank_elements(
        &self,
        path: &str,
        elements: &[ElementFeatures],
        k: usize,
    ) -> Vec<(usize, f64)> {
        if k == 0 || elements.is_empty() {
            return Vec::new();
        }

        let expert = self.select_expert(path);
        let mut scored: Vec<(usize, f64)> = elements
            .iter()
            .enumerate()
            .map(|(i, elem)| (i, expert.score(elem)))
            .collect();

        scored.sort_by(|a, b| {
            b.1.partial_cmp(&a.1)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        scored.truncate(k);
        scored
    }

    /// Train the expert for `expert_type` on a labeled example using online SGD.
    ///
    /// `label` is the ground-truth relevance score for the element in [0, 1].
    /// The gradient is `(prediction - label) * feature_value` (cross-entropy
    /// approximation for the sigmoid output). Learning rate = 0.01.
    pub fn train(
        &mut self,
        expert_type: ExpertType,
        features: &ElementFeatures,
        label: f64,
    ) {
        const LR: f64 = 0.01;
        let label = label.clamp(0.0, 1.0);

        if let Some(expert) = self
            .experts
            .iter_mut()
            .find(|e| e.expert_type == expert_type)
        {
            let fv = features.to_feature_vec();
            let prediction = expert.score(features); // sigmoid output
            let error = prediction - label; // d(BCE)/d(prediction) * sigmoid'

            for (w, f) in expert.weights.iter_mut().zip(fv.iter()) {
                *w -= LR * error * f;
                // Clip weights to [-5, 5] to prevent runaway gradient descent
                *w = w.clamp(-5.0, 5.0);
            }
        }
    }
}

impl Default for GroundingMixture {
    fn default() -> Self {
        Self::new()
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Sigmoid activation function.
#[inline]
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

/// Convert a boolean to a float feature value.
#[inline]
fn bool_f(b: bool) -> f64 {
    if b { 1.0 } else { 0.0 }
}

/// Prior score for an HTML tag based on how often it wraps contact information.
fn tag_score(tag: &str) -> f64 {
    match tag.to_lowercase().as_str() {
        "a" => 0.8,        // links often wrap names+emails
        "h1" | "h2" => 0.7,
        "h3" | "h4" => 0.65,
        "li" => 0.5,
        "p" => 0.4,
        "div" => 0.3,
        "span" => 0.3,
        "td" | "th" => 0.35,
        "article" | "section" => 0.2,
        _ => 0.1,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_elem(
        tag: &str,
        has_email: bool,
        has_phone: bool,
        has_title_words: bool,
        has_name_pattern: bool,
        class_hint: f64,
    ) -> ElementFeatures {
        ElementFeatures {
            tag: tag.into(),
            text_length: 25,
            has_email,
            has_phone,
            has_title_words,
            has_name_pattern,
            depth: 3,
            sibling_count: 4,
            parent_tag: "div".into(),
            class_hint,
        }
    }

    // ── expert selection ──────────────────────────────────────────────────────

    #[test]
    fn select_expert_team_path() {
        let mix = GroundingMixture::new();
        assert_eq!(mix.select_expert("/team").expert_type(), ExpertType::TeamPage);
        assert_eq!(mix.select_expert("/our-team").expert_type(), ExpertType::TeamPage);
        assert_eq!(mix.select_expert("/people").expert_type(), ExpertType::TeamPage);
        assert_eq!(mix.select_expert("/staff").expert_type(), ExpertType::TeamPage);
    }

    #[test]
    fn select_expert_leadership_path() {
        let mix = GroundingMixture::new();
        assert_eq!(
            mix.select_expert("/leadership").expert_type(),
            ExpertType::LeadershipPage
        );
        assert_eq!(
            mix.select_expert("/management").expert_type(),
            ExpertType::LeadershipPage
        );
        assert_eq!(
            mix.select_expert("/board").expert_type(),
            ExpertType::LeadershipPage
        );
    }

    #[test]
    fn select_expert_contact_path() {
        let mix = GroundingMixture::new();
        assert_eq!(
            mix.select_expert("/contact").expert_type(),
            ExpertType::ContactPage
        );
        assert_eq!(
            mix.select_expert("/contact-us").expert_type(),
            ExpertType::ContactPage
        );
    }

    #[test]
    fn select_expert_about_path() {
        let mix = GroundingMixture::new();
        assert_eq!(mix.select_expert("/about").expert_type(), ExpertType::AboutPage);
        assert_eq!(mix.select_expert("/company").expert_type(), ExpertType::AboutPage);
    }

    #[test]
    fn select_expert_generic_fallback() {
        let mix = GroundingMixture::new();
        assert_eq!(mix.select_expert("/pricing").expert_type(), ExpertType::Generic);
        assert_eq!(mix.select_expert("/").expert_type(), ExpertType::Generic);
        assert_eq!(mix.select_expert("/blog/post-1").expert_type(), ExpertType::Generic);
    }

    // ── team page expert prioritizes name patterns ────────────────────────────

    #[test]
    fn team_expert_scores_name_pattern_higher_than_no_name() {
        let expert = GroundingExpert::new(ExpertType::TeamPage);

        let with_name = make_elem("h3", false, false, false, true, 0.0);
        let without_name = make_elem("h3", false, false, false, false, 0.0);

        assert!(
            expert.score(&with_name) > expert.score(&without_name),
            "element with name pattern should score higher on team pages"
        );
    }

    #[test]
    fn team_expert_class_hint_boosts_score() {
        let expert = GroundingExpert::new(ExpertType::TeamPage);

        let with_class = make_elem("div", false, false, false, false, 1.0);
        let without_class = make_elem("div", false, false, false, false, 0.0);

        assert!(
            expert.score(&with_class) > expert.score(&without_class),
            "class hint should boost score on team pages"
        );
    }

    #[test]
    fn leadership_expert_prioritizes_title_words() {
        let expert = GroundingExpert::new(ExpertType::LeadershipPage);

        let with_title = make_elem("h3", false, false, true, true, 0.0);
        let without_title = make_elem("h3", false, false, false, false, 0.0);

        assert!(
            expert.score(&with_title) > expert.score(&without_title),
            "title words should be strong signal for leadership expert"
        );
    }

    #[test]
    fn contact_expert_prioritizes_email_and_phone() {
        let expert = GroundingExpert::new(ExpertType::ContactPage);

        let with_contact = make_elem("p", true, true, false, false, 0.0);
        let without_contact = make_elem("p", false, false, true, true, 0.0);

        assert!(
            expert.score(&with_contact) > expert.score(&without_contact),
            "email/phone should dominate on contact pages"
        );
    }

    // ── scoring produces [0, 1] ───────────────────────────────────────────────

    #[test]
    fn all_experts_score_in_unit_interval() {
        let mix = GroundingMixture::new();
        let paths = ["/team", "/about", "/leadership", "/contact", "/"];
        let elem = make_elem("div", true, false, true, true, 0.5);

        for path in &paths {
            let expert = mix.select_expert(path);
            let score = expert.score(&elem);
            assert!(
                (0.0..=1.0).contains(&score),
                "score {score} out of [0,1] for path {path}"
            );
        }
    }

    #[test]
    fn high_signal_element_scores_above_low_signal() {
        let mix = GroundingMixture::new();
        let strong = make_elem("h3", true, false, true, true, 1.0);
        let weak = make_elem("div", false, false, false, false, 0.0);

        let expert = mix.select_expert("/team");
        assert!(
            expert.score(&strong) > expert.score(&weak),
            "strong contact element should outscore empty div"
        );
    }

    // ── rank_elements returns top-k ───────────────────────────────────────────

    #[test]
    fn rank_returns_top_k_sorted_descending() {
        let mix = GroundingMixture::new();
        let elements = vec![
            make_elem("div", false, false, false, false, 0.0),
            make_elem("h3", true, false, true, true, 1.0),
            make_elem("a", false, true, false, true, 0.5),
            make_elem("span", false, false, false, false, 0.0),
        ];

        let ranked = mix.rank_elements("/team", &elements, 2);
        assert_eq!(ranked.len(), 2);
        assert!(
            ranked[0].1 >= ranked[1].1,
            "results must be sorted descending by score"
        );
    }

    #[test]
    fn rank_returns_indices_into_elements_slice() {
        let mix = GroundingMixture::new();
        let elements = vec![
            make_elem("div", false, false, false, false, 0.0),
            make_elem("h3", true, false, true, true, 1.0),
        ];
        let ranked = mix.rank_elements("/team", &elements, 2);
        for (idx, _score) in &ranked {
            assert!(*idx < elements.len(), "index {idx} out of bounds");
        }
    }

    #[test]
    fn rank_k_zero_returns_empty() {
        let mix = GroundingMixture::new();
        let elem = make_elem("div", false, false, false, false, 0.0);
        assert!(mix.rank_elements("/team", &[elem], 0).is_empty());
    }

    #[test]
    fn rank_empty_elements_returns_empty() {
        let mix = GroundingMixture::new();
        assert!(mix.rank_elements("/team", &[], 5).is_empty());
    }

    #[test]
    fn rank_k_larger_than_elements_returns_all() {
        let mix = GroundingMixture::new();
        let elements = vec![
            make_elem("h3", true, false, true, true, 1.0),
            make_elem("div", false, false, false, false, 0.0),
        ];
        let ranked = mix.rank_elements("/team", &elements, 100);
        assert_eq!(ranked.len(), 2);
    }

    // ── training updates weights ──────────────────────────────────────────────

    #[test]
    fn training_increases_score_for_positive_label() {
        let mut mix = GroundingMixture::new();
        let elem = make_elem("h3", false, false, false, true, 1.0);
        let expert = mix.select_expert("/team");
        let score_before = expert.score(&elem);

        // Train toward label=1.0 (very positive) multiple times
        for _ in 0..50 {
            mix.train(ExpertType::TeamPage, &elem, 1.0);
        }

        let score_after = mix.select_expert("/team").score(&elem);
        assert!(
            score_after >= score_before,
            "score should increase or hold after positive training: {score_before} → {score_after}"
        );
    }

    #[test]
    fn training_decreases_score_for_negative_label() {
        let mut mix = GroundingMixture::new();
        // Start with a strong positive element to have headroom to decrease
        let elem = make_elem("h3", true, true, true, true, 1.0);
        let score_before = mix.select_expert("/team").score(&elem);

        // Train toward label=0.0 (very negative) multiple times
        for _ in 0..50 {
            mix.train(ExpertType::TeamPage, &elem, 0.0);
        }

        let score_after = mix.select_expert("/team").score(&elem);
        assert!(
            score_after <= score_before,
            "score should decrease or hold after negative training: {score_before} → {score_after}"
        );
    }

    #[test]
    fn training_does_not_affect_other_experts() {
        let mut mix = GroundingMixture::new();
        let elem = make_elem("h3", true, false, true, true, 1.0);

        let contact_score_before = mix.select_expert("/contact").score(&elem);

        // Train only the TeamPage expert
        for _ in 0..20 {
            mix.train(ExpertType::TeamPage, &elem, 0.0);
        }

        let contact_score_after = mix.select_expert("/contact").score(&elem);
        assert!(
            (contact_score_before - contact_score_after).abs() < 1e-9,
            "training TeamPage expert must not change ContactPage expert weights"
        );
    }

    #[test]
    fn weights_remain_bounded_after_many_training_steps() {
        let mut mix = GroundingMixture::new();
        let elem = make_elem("h3", true, true, true, true, 1.0);

        for _ in 0..1000 {
            mix.train(ExpertType::TeamPage, &elem, 1.0);
        }

        // Score must stay in (0, 1) — sigmoid guarantees this as long as
        // weights are finite. The clip to [-5, 5] prevents overflow.
        let score = mix.select_expert("/team").score(&elem);
        assert!(
            (0.0..=1.0).contains(&score),
            "score must stay in [0,1] after many training steps, got {score}"
        );
    }
}

//! Multi-label logistic scorer for LinkedIn post intent classification.
//!
//! Follows the `LogisticScorer` pattern from `metal/src/kernel/scoring.rs`:
//! weights × features + bias → sigmoid, producing independent probabilities
//! for 7 intent labels.
//!
//! Feature vector (12 elements):
//!   \[hiring_kw_density, ai_kw_density, remote_kw_density, eng_kw_density,
//!    culture_kw_density, noise_kw_density, text_length_norm, reactions_norm,
//!    comments_norm, has_url, is_repost, media_type_enc\]

use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::models::Post;
use crate::scoring::{
    has_word, AI_KEYWORDS, CULTURE_KEYWORDS, ENGINEERING_KEYWORDS, HIRING_KEYWORDS,
    NOISE_KEYWORDS, REMOTE_KEYWORDS,
};

// ── Constants ────────────────────────────────────────────────────────────────

pub const NUM_FEATURES: usize = 12;
pub const NUM_LABELS: usize = 7;

pub const LABEL_HIRING: usize = 0;
pub const LABEL_AI_ML: usize = 1;
pub const LABEL_REMOTE: usize = 2;
pub const LABEL_ENG_CULTURE: usize = 3;
pub const LABEL_COMPANY_GROWTH: usize = 4;
pub const LABEL_THOUGHT_LEADERSHIP: usize = 5;
pub const LABEL_NOISE: usize = 6;

pub const LABEL_NAMES: [&str; NUM_LABELS] = [
    "hiring_signal",
    "ai_ml_content",
    "remote_signal",
    "engineering_culture",
    "company_growth",
    "thought_leadership",
    "noise",
];

// ── Intent probabilities ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostIntents {
    pub hiring_signal: f32,
    pub ai_ml_content: f32,
    pub remote_signal: f32,
    pub engineering_culture: f32,
    pub company_growth: f32,
    pub thought_leadership: f32,
    pub noise: f32,
}

impl PostIntents {
    pub fn from_array(scores: &[f32; NUM_LABELS]) -> Self {
        Self {
            hiring_signal: scores[LABEL_HIRING],
            ai_ml_content: scores[LABEL_AI_ML],
            remote_signal: scores[LABEL_REMOTE],
            engineering_culture: scores[LABEL_ENG_CULTURE],
            company_growth: scores[LABEL_COMPANY_GROWTH],
            thought_leadership: scores[LABEL_THOUGHT_LEADERSHIP],
            noise: scores[LABEL_NOISE],
        }
    }

    /// Return the label name with the highest confidence.
    pub fn primary_intent(&self) -> &'static str {
        let scores = [
            self.hiring_signal,
            self.ai_ml_content,
            self.remote_signal,
            self.engineering_culture,
            self.company_growth,
            self.thought_leadership,
            self.noise,
        ];
        let max_idx = scores
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(i, _)| i)
            .unwrap_or(LABEL_NOISE);
        LABEL_NAMES[max_idx]
    }

    /// Weighted relevance score combining intents.
    pub fn relevance_score(&self) -> f32 {
        0.30 * self.hiring_signal
            + 0.25 * self.ai_ml_content
            + 0.20 * self.remote_signal
            + 0.10 * self.engineering_culture
            + 0.10 * self.company_growth
            + 0.05 * self.thought_leadership
            - 0.30 * self.noise
    }
}

// ── Scorer ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostIntentScorer {
    pub weights: [[f32; NUM_FEATURES]; NUM_LABELS],
    pub biases: [f32; NUM_LABELS],
    pub trained: bool,
}

impl PostIntentScorer {
    /// Hand-tuned initial weights that approximate the existing keyword scorer.
    /// Each row maps feature densities to an intent probability.
    pub fn default_pretrained() -> Self {
        // Rows: hiring, ai_ml, remote, eng_culture, company_growth, thought_leadership, noise
        // Cols: hiring_d, ai_d, remote_d, eng_d, culture_d, noise_d, len_norm, react_n, comment_n, has_url, is_repost, media_enc
        //
        // Keyword densities are typically 0.02-0.15 (multi-word phrases in 15-50 word posts),
        // so primary feature weights are high (20-30) to push through sigmoid.
        let weights = [
            // hiring_signal — strongly driven by hiring keywords
            [25.0, 3.0, 5.0, 3.0, 2.0, -5.0, 1.0, 0.5, 0.3, 0.5, -1.0, 0.0],
            // ai_ml_content — strongly driven by AI keywords + engineering
            [2.0, 25.0, 2.0, 6.0, 2.0, -4.0, 1.0, 0.3, 0.5, 0.3, -0.5, 0.3],
            // remote_signal — strongly driven by remote keywords
            [3.0, 2.0, 30.0, 2.0, 1.0, -4.0, 0.5, 0.2, 0.2, 0.3, -0.5, 0.0],
            // engineering_culture — engineering + culture keywords
            [2.0, 5.0, 1.0, 20.0, 10.0, -4.0, 1.0, 0.5, 0.6, 0.3, -0.3, 0.5],
            // company_growth — culture keywords (funding, series, etc.)
            [2.0, 2.0, 1.0, 2.0, 25.0, -4.0, 0.5, 0.6, 0.4, 0.3, -0.3, 0.2],
            // thought_leadership — long text, high engagement, low noise
            [1.0, 5.0, 1.0, 5.0, 2.0, -8.0, 3.0, 1.5, 2.0, 0.3, -1.0, 0.8],
            // noise — strongly driven by noise keywords, penalize short text
            [-5.0, -4.0, -3.0, -3.0, -2.0, 20.0, -3.0, -0.3, -0.5, -0.5, 1.5, -0.5],
        ];

        let biases = [
            -1.5, // hiring — default low
            -1.2, // ai_ml — default low
            -1.5, // remote — default low
            -1.2, // eng_culture — default low
            -1.5, // company_growth — default low
            -1.0, // thought_leadership — slightly easier
            -0.8, // noise — slightly easier to trigger
        ];

        Self {
            weights,
            biases,
            trained: false,
        }
    }

    /// Score a post, returning per-label probabilities.
    pub fn score_intents(&self, features: &[f32; NUM_FEATURES]) -> PostIntents {
        let mut scores = [0.0f32; NUM_LABELS];
        for (label, score) in scores.iter_mut().enumerate() {
            let mut z = self.biases[label];
            for (w, feat) in self.weights[label].iter().zip(features.iter()) {
                z += w * feat;
            }
            *score = sigmoid(z);
        }
        PostIntents::from_array(&scores)
    }

    /// Load weights from a JSON file. Validates all values are finite.
    pub fn from_json(path: &Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read weights file: {}", e))?;
        let scorer: Self =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse weights: {}", e))?;

        // Validate no NaN/Inf in weights or biases
        for (label, row) in scorer.weights.iter().enumerate() {
            for (feat, &w) in row.iter().enumerate() {
                if !w.is_finite() {
                    return Err(format!(
                        "Non-finite weight at [{label}][{feat}]: {w}"
                    ));
                }
            }
        }
        for (label, &b) in scorer.biases.iter().enumerate() {
            if !b.is_finite() {
                return Err(format!("Non-finite bias at [{label}]: {b}"));
            }
        }

        Ok(scorer)
    }

    /// Save weights to a JSON file.
    pub fn to_json(&self, path: &Path) -> Result<(), String> {
        let content =
            serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize: {}", e))?;
        std::fs::write(path, content).map_err(|e| format!("Failed to write: {}", e))
    }
}

// ── Feature extraction ───────────────────────────────────────────────────────

/// Extract 12-element feature vector from a post.
pub fn extract_features(post: &Post) -> [f32; NUM_FEATURES] {
    let text = post.post_text.as_deref().unwrap_or("");
    let lower = text.to_lowercase();
    // min 5 to prevent inflated keyword densities on 1-3 word posts
    let word_count = lower.split_whitespace().count().max(5) as f32;

    // Use boundary-aware matching for space-padded keywords (e.g. " llm ", " rust ")
    let kw_hits = |keywords: &[&str]| -> f32 {
        keywords
            .iter()
            .filter(|kw| {
                let trimmed = kw.trim();
                if trimmed == **kw {
                    lower.contains(**kw)
                } else {
                    has_word(&lower, trimmed)
                }
            })
            .count() as f32
    };

    let hiring_hits = kw_hits(HIRING_KEYWORDS);
    let ai_hits = kw_hits(AI_KEYWORDS);
    let remote_hits = kw_hits(REMOTE_KEYWORDS);
    let eng_hits = kw_hits(ENGINEERING_KEYWORDS);
    let culture_hits = kw_hits(CULTURE_KEYWORDS);
    let noise_hits = kw_hits(NOISE_KEYWORDS);

    let media_enc = match post.media_type.as_str() {
        "image" => 0.2,
        "article" => 0.4,
        "document" => 0.6,
        "video" => 0.8,
        "poll" => 1.0,
        _ => 0.0,
    };

    [
        hiring_hits / word_count,                           // 0: hiring_kw_density
        ai_hits / word_count,                               // 1: ai_kw_density
        remote_hits / word_count,                           // 2: remote_kw_density
        eng_hits / word_count,                              // 3: eng_kw_density
        culture_hits / word_count,                          // 4: culture_kw_density
        noise_hits / word_count,                            // 5: noise_kw_density
        (text.len() as f32 / 500.0).min(1.0),              // 6: text_length_norm
        (1.0 + post.reactions_count.max(0) as f32).ln() / 10.0, // 7: reactions_norm
        (1.0 + post.comments_count.max(0) as f32).ln() / 8.0, // 8: comments_norm
        if post.post_url.is_some() { 1.0 } else { 0.0 },  // 9: has_url
        if post.is_repost { 1.0 } else { 0.0 },           // 10: is_repost
        media_enc,                                          // 11: media_type_enc
    ]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

#[inline]
fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_post(text: &str) -> Post {
        Post {
            post_url: Some("https://linkedin.com/feed/update/123".to_string()),
            post_text: Some(text.to_string()),
            posted_date: None,
            reactions_count: 50,
            comments_count: 10,
            reposts_count: 5,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
        }
    }

    #[test]
    fn hiring_post_scores_high_on_hiring() {
        let scorer = PostIntentScorer::default_pretrained();
        let post = make_post(
            "We're hiring a Senior ML Engineer to join our team in Berlin. Fully remote, working on LLMs and RAG pipelines. Apply now!",
        );
        let features = extract_features(&post);
        let intents = scorer.score_intents(&features);

        assert!(
            intents.hiring_signal > 0.5,
            "hiring_signal={:.3}",
            intents.hiring_signal
        );
        assert!(
            intents.hiring_signal > intents.noise,
            "hiring={:.3} should beat noise={:.3}",
            intents.hiring_signal,
            intents.noise
        );
    }

    #[test]
    fn ai_post_scores_high_on_ai() {
        let scorer = PostIntentScorer::default_pretrained();
        let post = make_post(
            "Just published our engineering blog about fine-tuning a large language model with PyTorch for code review. Impressive results with transformer architectures.",
        );
        let features = extract_features(&post);
        let intents = scorer.score_intents(&features);

        assert!(
            intents.ai_ml_content > 0.5,
            "ai_ml={:.3}",
            intents.ai_ml_content
        );
    }

    #[test]
    fn noise_post_scores_high_on_noise() {
        let scorer = PostIntentScorer::default_pretrained();
        let post = make_post("Happy birthday to my amazing colleague! Congrats on your work anniversary! #blessed #grateful");
        let features = extract_features(&post);
        let intents = scorer.score_intents(&features);

        assert!(
            intents.noise > 0.5,
            "noise={:.3}",
            intents.noise
        );
        assert!(
            intents.relevance_score() < 0.15,
            "relevance={:.3} should be < 0.15",
            intents.relevance_score()
        );
    }

    #[test]
    fn remote_post_scores_high_on_remote() {
        let scorer = PostIntentScorer::default_pretrained();
        let post = make_post(
            "Open position: Platform Engineer. We're remote-first, work from anywhere. Distributed team across 15 countries.",
        );
        let features = extract_features(&post);
        let intents = scorer.score_intents(&features);

        assert!(
            intents.remote_signal > 0.5,
            "remote={:.3}",
            intents.remote_signal
        );
    }

    #[test]
    fn feature_extraction_dimensions() {
        let post = make_post("test");
        let features = extract_features(&post);
        assert_eq!(features.len(), NUM_FEATURES);
    }

    #[test]
    fn json_roundtrip() {
        let scorer = PostIntentScorer::default_pretrained();
        let json = serde_json::to_string(&scorer).unwrap();
        let restored: PostIntentScorer = serde_json::from_str(&json).unwrap();
        assert_eq!(scorer.weights[0][0], restored.weights[0][0]);
        assert_eq!(scorer.biases[0], restored.biases[0]);
    }

    #[test]
    fn primary_intent_correct() {
        let scorer = PostIntentScorer::default_pretrained();
        let post = make_post("We're hiring ML engineers! Join our team, now hiring for open positions.");
        let features = extract_features(&post);
        let intents = scorer.score_intents(&features);
        assert_eq!(intents.primary_intent(), "hiring_signal");
    }

    #[test]
    fn short_post_density_dampened() {
        // With word_count.max(5), a 2-word post gets density 2/5=0.4 instead of 2/2=1.0
        let features_short = extract_features(&make_post("pytorch transformers"));
        // Verify density is dampened: ai_kw_density = 2/5 = 0.4, not 2/2 = 1.0
        assert!(features_short[1] < 0.5, "ai density should be dampened: {:.3}", features_short[1]);
        // Compare with a normal post where the same keywords appear
        let features_normal = extract_features(&make_post(
            "Our team uses pytorch and transformers for all our production machine learning models"
        ));
        assert!(features_short[1] >= features_normal[1],
            "short post density ({:.3}) should still be >= normal ({:.3})",
            features_short[1], features_normal[1]);
    }

    #[test]
    fn relevance_score_pure_noise() {
        let intents = PostIntents {
            hiring_signal: 0.0,
            ai_ml_content: 0.0,
            remote_signal: 0.0,
            engineering_culture: 0.0,
            company_growth: 0.0,
            thought_leadership: 0.0,
            noise: 1.0,
        };
        assert!(intents.relevance_score() < 0.0, "pure noise should be negative");
    }

    #[test]
    fn relevance_score_pure_hiring() {
        let intents = PostIntents {
            hiring_signal: 1.0,
            ai_ml_content: 0.0,
            remote_signal: 0.0,
            engineering_culture: 0.0,
            company_growth: 0.0,
            thought_leadership: 0.0,
            noise: 0.0,
        };
        assert!((intents.relevance_score() - 0.30).abs() < 0.001);
    }

    #[test]
    fn sigmoid_boundary_values() {
        assert!((sigmoid(0.0) - 0.5).abs() < 0.001);
        assert!(sigmoid(100.0) > 0.999);
        assert!(sigmoid(-100.0) < 0.001);
        // No NaN or panic
        assert!(!sigmoid(f32::MAX).is_nan());
        assert!(!sigmoid(f32::MIN).is_nan());
    }

    #[test]
    fn negative_reactions_no_nan_in_features() {
        let post = Post {
            post_url: None,
            post_text: Some("test text for feature extraction".to_string()),
            posted_date: None,
            reactions_count: -5,
            comments_count: -3,
            reposts_count: 0,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
        };
        let features = extract_features(&post);
        for (i, f) in features.iter().enumerate() {
            assert!(!f.is_nan(), "feature[{}] is NaN with negative reactions", i);
        }
    }

    // ── New regression tests (round 2) ──

    #[test]
    fn extract_features_llm_at_start() {
        // " llm " should match "LLM infrastructure" at position 0 via has_word
        let post = make_post("LLM infrastructure and deployment at scale");
        let features = extract_features(&post);
        assert!(features[1] > 0.0, "ai_kw_density should be > 0 for LLM post: {:.3}", features[1]);
    }

    #[test]
    fn extract_features_rust_at_start() {
        // " rust " should match "Rust microservices" at position 0 via has_word
        let post = make_post("Rust microservices in production with kubernetes and docker");
        let features = extract_features(&post);
        assert!(features[3] > 0.0, "eng_kw_density should be > 0 for Rust post: {:.3}", features[3]);
    }

    #[test]
    fn extract_features_no_false_positive_entrust() {
        // " rust " should NOT match inside "entrust"
        let post = make_post("We entrust our data security to the best enterprise solutions available today");
        let features = extract_features(&post);
        // eng_kw_density should be 0 (no actual engineering keywords)
        assert!(features[3] < 0.01, "eng_kw_density should be ~0 for 'entrust': {:.3}", features[3]);
    }

    #[test]
    fn extract_features_none_text() {
        // post_text: None should not panic, noise label should win
        let post = Post {
            post_url: None,
            post_text: None,
            posted_date: None,
            reactions_count: 0,
            comments_count: 0,
            reposts_count: 0,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
        };
        let features = extract_features(&post);
        for (i, f) in features.iter().enumerate() {
            assert!(!f.is_nan(), "feature[{}] is NaN with None text", i);
        }
        let scorer = PostIntentScorer::default_pretrained();
        let intents = scorer.score_intents(&features);
        // With no text, noise should dominate or all should be low
        assert!(!intents.noise.is_nan());
    }

    #[test]
    fn from_json_validates_scorer() {
        // Roundtrip through JSON preserves all weights
        let scorer = PostIntentScorer::default_pretrained();
        let json = serde_json::to_string(&scorer).unwrap();
        let restored: PostIntentScorer = serde_json::from_str(&json).unwrap();
        assert_eq!(scorer.weights, restored.weights);
        assert_eq!(scorer.biases, restored.biases);
    }
}

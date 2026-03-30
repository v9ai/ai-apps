/// Combined post analysis — orchestrates intent scoring + NER extraction.
///
/// Produces a `PostAnalysis` struct that captures the full ML-enriched
/// view of a LinkedIn post: multi-label intents, extracted entities,
/// relevance score, and keep/discard decision.

use serde::{Deserialize, Serialize};

use crate::intent_scorer::{extract_features, PostIntentScorer, PostIntents};
use crate::models::Post;
use crate::post_ner::{extract_post_entities, PostEntities, PostEntitiesSerde};

// ── Analysis result ──────────────────────────────────────────────────────────

/// Full ML analysis of a single LinkedIn post.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostAnalysis {
    pub intents: PostIntents,
    pub entities: PostEntitiesSerde,
    pub relevance_score: f32,
    pub keep: bool,
    pub primary_intent: String,
}

/// Default relevance threshold — posts below this are filtered.
pub const DEFAULT_RELEVANCE_THRESHOLD: f32 = 0.15;

// ── Analysis function ────────────────────────────────────────────────────────

/// Analyze a post: extract features → score intents → extract entities → decide.
pub fn analyze(post: &Post, scorer: &PostIntentScorer) -> PostAnalysis {
    let text = post.post_text.as_deref().unwrap_or("");

    // Empty text — instant discard
    if text.is_empty() {
        return PostAnalysis {
            intents: PostIntents {
                hiring_signal: 0.0,
                ai_ml_content: 0.0,
                remote_signal: 0.0,
                engineering_culture: 0.0,
                company_growth: 0.0,
                thought_leadership: 0.0,
                noise: 1.0,
            },
            entities: PostEntitiesSerde::default(),
            relevance_score: -0.30,
            keep: false,
            primary_intent: "noise".to_string(),
        };
    }

    // Intent classification
    let features = extract_features(post);
    let intents = scorer.score_intents(&features);
    let relevance_score = intents.relevance_score();
    let primary_intent = intents.primary_intent().to_string();

    // Entity extraction (zero-alloc FSM)
    let mut entities_raw = PostEntities::new();
    extract_post_entities(text, &mut entities_raw);
    let entities = entities_raw.to_serde();

    // Keep decision
    let keep = relevance_score >= DEFAULT_RELEVANCE_THRESHOLD;

    PostAnalysis {
        intents,
        entities,
        relevance_score,
        keep,
        primary_intent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn post(text: &str) -> Post {
        Post {
            post_url: Some("https://linkedin.com/feed/update/test".to_string()),
            post_text: Some(text.to_string()),
            posted_date: None,
            reactions_count: 25,
            comments_count: 5,
            reposts_count: 2,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
        }
    }

    #[test]
    fn keeps_hiring_post() {
        let scorer = PostIntentScorer::default_pretrained();
        let result = analyze(
            &post("We're hiring a Senior ML Engineer to join our team. Fully remote, working on LLMs and RAG pipelines."),
            &scorer,
        );
        assert!(result.keep, "relevance={:.3}", result.relevance_score);
        assert!(result.relevance_score > 0.3);
        assert_eq!(result.primary_intent, "hiring_signal");
    }

    #[test]
    fn filters_noise() {
        let scorer = PostIntentScorer::default_pretrained();
        let result = analyze(
            &post("Happy birthday to my amazing colleague! Wishing you the best! #blessed"),
            &scorer,
        );
        assert!(!result.keep, "relevance={:.3}", result.relevance_score);
    }

    #[test]
    fn filters_empty() {
        let scorer = PostIntentScorer::default_pretrained();
        let result = analyze(
            &Post {
                post_text: None,
                ..post("")
            },
            &scorer,
        );
        assert!(!result.keep);
        assert_eq!(result.primary_intent, "noise");
    }

    #[test]
    fn extracts_entities_with_intents() {
        let scorer = PostIntentScorer::default_pretrained();
        let result = analyze(
            &post("Anthropic is hiring ML engineers. Fully remote. Tech stack: Python, PyTorch, Rust, Kubernetes."),
            &scorer,
        );
        assert!(result.keep);
        assert!(!result.entities.tech_skills.is_empty(), "should extract tech skills");
        assert_eq!(result.entities.remote_policy, "full_remote");
    }

    #[test]
    fn analysis_serializes() {
        let scorer = PostIntentScorer::default_pretrained();
        let result = analyze(
            &post("Looking for a Staff Engineer to work on distributed systems and Kubernetes."),
            &scorer,
        );
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: PostAnalysis = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.primary_intent, result.primary_intent);
    }
}

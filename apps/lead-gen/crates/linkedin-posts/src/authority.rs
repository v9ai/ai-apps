//! Contact authority signal aggregation from LinkedIn post analysis.
//!
//! Aggregates post-level ML signals into a per-contact authority delta,
//! then pushes the update to Neon PostgreSQL's contacts.authority_score.

use serde::Serialize;

use crate::models::StoredPost;

// ── Aggregated signals ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ContactPostSignals {
    pub contact_id: i32,
    pub total_posts: usize,
    pub avg_relevance: f32,
    pub max_hiring_signal: f32,
    pub hiring_post_count: usize,
    pub ai_content_count: usize,
    pub thought_leadership_count: usize,
    pub avg_engagement: f32,
    pub post_frequency_score: f32,
    /// Computed delta to add to authority_score (0.0-1.0 scale).
    pub authority_delta: f32,
}

// Intent threshold for counting a post as "belonging" to a category
const INTENT_THRESHOLD: f32 = 0.4;

/// Aggregate ML signals from a contact's stored posts.
pub fn aggregate_signals(contact_id: i32, posts: &[StoredPost]) -> ContactPostSignals {
    if posts.is_empty() {
        return ContactPostSignals {
            contact_id,
            total_posts: 0,
            avg_relevance: 0.0,
            max_hiring_signal: 0.0,
            hiring_post_count: 0,
            ai_content_count: 0,
            thought_leadership_count: 0,
            avg_engagement: 0.0,
            post_frequency_score: 0.0,
            authority_delta: 0.0,
        };
    }

    let n = posts.len();

    let mut sum_relevance = 0.0f32;
    let mut max_hiring = 0.0f32;
    let mut hiring_count = 0usize;
    let mut ai_count = 0usize;
    let mut thought_count = 0usize;
    let mut sum_engagement = 0.0f32;

    for p in posts {
        sum_relevance += p.relevance_score;

        if p.intent_hiring > max_hiring {
            max_hiring = p.intent_hiring;
        }
        if p.intent_hiring > INTENT_THRESHOLD {
            hiring_count += 1;
        }
        if p.intent_ai_ml > INTENT_THRESHOLD {
            ai_count += 1;
        }
        if p.intent_thought_leadership > INTENT_THRESHOLD {
            thought_count += 1;
        }

        // Engagement: log-normalized (reactions + comments, guard negative)
        let engagement = (2.0 + p.reactions_count.max(0) as f32 + p.comments_count.max(0) as f32).ln();
        sum_engagement += engagement;
    }

    let avg_relevance = sum_relevance / n as f32;
    let avg_engagement = sum_engagement / n as f32;

    // Post frequency score: more posts = higher (capped at 1.0)
    // 10+ relevant posts = max score
    let post_frequency_score = (n as f32 / 10.0).min(1.0);

    // Ratios (0.0-1.0)
    let thought_ratio = thought_count as f32 / n as f32;
    let ai_ratio = ai_count as f32 / n as f32;
    let engagement_norm = (avg_engagement / 5.0).min(1.0); // normalize to ~0-1

    // Hiring ratio (fraction of posts with hiring signal, not just max)
    let hiring_ratio = hiring_count as f32 / n as f32;

    // Authority score formula — avg_relevance gates the result so noisy contacts
    // don't get authority from a single stray hiring post.
    let raw = 0.30 * thought_ratio
        + 0.25 * (0.5 * max_hiring + 0.5 * hiring_ratio)
        + 0.20 * ai_ratio
        + 0.15 * engagement_norm
        + 0.10 * post_frequency_score;
    let relevance_gate = avg_relevance.clamp(0.0, 1.0);
    let authority_delta = (raw * (0.3 + 0.7 * relevance_gate)).clamp(0.0, 1.0);

    ContactPostSignals {
        contact_id,
        total_posts: n,
        avg_relevance,
        max_hiring_signal: max_hiring,
        hiring_post_count: hiring_count,
        ai_content_count: ai_count,
        thought_leadership_count: thought_count,
        avg_engagement,
        post_frequency_score,
        authority_delta,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_stored_post(
        contact_id: i32,
        intent_hiring: f32,
        intent_ai_ml: f32,
        intent_thought: f32,
        reactions: i32,
        comments: i32,
    ) -> StoredPost {
        StoredPost {
            id: 1,
            contact_id,
            post_url: None,
            post_text: Some("test".to_string()),
            posted_date: None,
            reactions_count: reactions,
            comments_count: comments,
            reposts_count: 0,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
            scraped_at: "2024-01-01".to_string(),
            relevance_score: 0.5,
            primary_intent: "hiring_signal".to_string(),
            intent_hiring,
            intent_ai_ml,
            intent_remote: 0.0,
            intent_eng_culture: 0.0,
            intent_company_growth: 0.0,
            intent_thought_leadership: intent_thought,
            intent_noise: 0.0,
            entities_json: None,
        }
    }

    #[test]
    fn empty_posts_zero_delta() {
        let signals = aggregate_signals(1, &[]);
        assert_eq!(signals.authority_delta, 0.0);
        assert_eq!(signals.total_posts, 0);
    }

    #[test]
    fn hiring_posts_boost_authority() {
        let posts = vec![
            make_stored_post(1, 0.9, 0.3, 0.2, 100, 20),
            make_stored_post(1, 0.8, 0.5, 0.1, 50, 10),
        ];
        let signals = aggregate_signals(1, &posts);
        assert!(
            signals.authority_delta > 0.2,
            "delta={:.3}",
            signals.authority_delta
        );
        assert_eq!(signals.hiring_post_count, 2);
        assert!(signals.max_hiring_signal >= 0.9);
    }

    #[test]
    fn thought_leadership_boosts_authority() {
        let posts = vec![
            make_stored_post(1, 0.1, 0.2, 0.9, 200, 50),
            make_stored_post(1, 0.0, 0.3, 0.8, 150, 30),
        ];
        let signals = aggregate_signals(1, &posts);
        assert!(
            signals.authority_delta > 0.3,
            "delta={:.3}",
            signals.authority_delta
        );
        assert_eq!(signals.thought_leadership_count, 2);
    }

    #[test]
    fn single_post_frequency_score() {
        let posts = vec![make_stored_post(1, 0.5, 0.5, 0.5, 10, 5)];
        let signals = aggregate_signals(1, &posts);
        assert!((signals.post_frequency_score - 0.1).abs() < 0.01);
    }

    #[test]
    fn ten_posts_max_frequency() {
        let posts: Vec<StoredPost> = (0..10)
            .map(|_| make_stored_post(1, 0.5, 0.5, 0.5, 10, 5))
            .collect();
        let signals = aggregate_signals(1, &posts);
        assert!((signals.post_frequency_score - 1.0).abs() < 0.01);
    }

    #[test]
    fn all_below_threshold_zero_counts() {
        let posts = vec![
            make_stored_post(1, 0.3, 0.3, 0.3, 10, 5),
            make_stored_post(1, 0.2, 0.1, 0.2, 5, 2),
        ];
        let signals = aggregate_signals(1, &posts);
        assert_eq!(signals.hiring_post_count, 0);
        assert_eq!(signals.ai_content_count, 0);
        assert_eq!(signals.thought_leadership_count, 0);
    }

    #[test]
    fn negative_reactions_no_nan() {
        let mut post = make_stored_post(1, 0.5, 0.5, 0.5, -5, -3);
        post.reactions_count = -5;
        post.comments_count = -3;
        let signals = aggregate_signals(1, &[post]);
        assert!(!signals.avg_engagement.is_nan(), "NaN from negative reactions");
        assert!(!signals.authority_delta.is_nan(), "NaN in authority_delta");
    }

    #[test]
    fn authority_delta_capped_at_one() {
        let posts: Vec<StoredPost> = (0..20)
            .map(|_| make_stored_post(1, 1.0, 1.0, 1.0, 10000, 5000))
            .collect();
        let signals = aggregate_signals(1, &posts);
        assert!(signals.authority_delta <= 1.0, "delta={:.3}", signals.authority_delta);
    }

    // ── New regression tests (round 2) ──

    #[test]
    fn relevance_gates_authority() {
        // Low relevance posts should produce lower authority than high relevance posts
        let low_rel = make_stored_post(1, 0.8, 0.5, 0.5, 100, 20);
        let mut high_rel = make_stored_post(1, 0.8, 0.5, 0.5, 100, 20);
        high_rel.relevance_score = 0.8;

        let mut low_post = low_rel;
        low_post.relevance_score = 0.05; // near-noise

        let signals_low = aggregate_signals(1, &[low_post]);
        let signals_high = aggregate_signals(1, &[high_rel]);

        assert!(
            signals_high.authority_delta > signals_low.authority_delta,
            "high relevance ({:.3}) should produce higher authority than low relevance ({:.3})",
            signals_high.authority_delta,
            signals_low.authority_delta,
        );
    }

    #[test]
    fn authority_delta_non_negative() {
        // Even with zero signals, authority_delta should be >= 0
        let post = make_stored_post(1, 0.0, 0.0, 0.0, 0, 0);
        let signals = aggregate_signals(1, &[post]);
        assert!(signals.authority_delta >= 0.0, "delta={:.3}", signals.authority_delta);
    }

    #[test]
    fn hiring_ratio_blended_with_max() {
        // Two posts: one with max hiring, one without — hiring_ratio = 0.5
        let posts = vec![
            make_stored_post(1, 0.9, 0.5, 0.2, 50, 10),
            make_stored_post(1, 0.1, 0.5, 0.2, 50, 10),
        ];
        let signals = aggregate_signals(1, &posts);
        assert_eq!(signals.hiring_post_count, 1);
        // Should still have some authority from the hiring signal
        assert!(signals.authority_delta > 0.0, "delta={:.3}", signals.authority_delta);
    }
}

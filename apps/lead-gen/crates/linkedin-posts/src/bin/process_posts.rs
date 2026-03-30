/// Batch contact AI-affinity classifier.
///
/// Reads all scraped LinkedIn posts from LanceDB, groups by contact,
/// computes a Bayesian AI-affinity score, and tags non-AI contacts
/// with "to-be-deleted" in Neon PostgreSQL.
use std::collections::HashMap;

use anyhow::{Context, Result};

use linkedin_posts::db::PostsDb;
use linkedin_posts::models::{Contact, StoredPost};
use linkedin_posts::neon;
use linkedin_posts::scoring::{title_has_ai_signal, title_has_engineering_signal};

// ── Configuration ───────────────────────────────────────────────────────────

const AI_THRESHOLD: f32 = 0.35;
const INTENT_THRESHOLD: f32 = 0.4;

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
enum Verdict {
    AiRelated,
    NotAi,
}

#[derive(Debug)]
#[allow(dead_code)] // fields used via Debug formatting in tracing output
struct AffinityResult {
    contact_id: i32,
    name: String,
    position: String,
    company: String,
    ai_probability: f32,
    prior_from_title: f32,
    ai_post_count: usize,
    hiring_ai_count: usize,
    total_posts: usize,
    max_ai_score: f32,
    weighted_avg_ai: f32,
    verdict: Verdict,
}

// ── AI Affinity Scoring ─────────────────────────────────────────────────────
//
// Two-signal model:
//   Signal 1 — Title prior: AI keywords in position → strong AI prior.
//   Signal 2 — Post ratio: fraction of posts with intent_ai_ml > threshold.
//              Only AI posts contribute positive evidence; non-AI posts are
//              neutral (absence of AI content ≠ evidence against AI affinity).
//
// Contacts WITHOUT posts: classified by title alone.
//   AI title → AiRelated. Non-AI title → NotAi (tag for deletion).

fn compute_ai_affinity(contact: &Contact, posts: &[StoredPost]) -> AffinityResult {
    let position = contact.position.as_deref().unwrap_or("");
    let company = contact.company.as_deref().unwrap_or("");
    let name = format!("{} {}", contact.first_name, contact.last_name);

    let has_ai_title = title_has_ai_signal(position);
    let has_eng_title = title_has_engineering_signal(position);

    // 1. Title prior
    let title_score: f32 = if has_ai_title { 0.70 } else if has_eng_title { 0.30 } else { 0.10 };

    // 2. Post evidence — only positive (AI posts boost, non-AI posts are neutral)
    let mut ai_post_count = 0usize;
    let mut hiring_ai_count = 0usize;
    let mut max_ai_score = 0.0f32;
    let mut weighted_ai_sum = 0.0f32;
    let mut weight_total = 0.0f32;

    for p in posts {
        // Guard against NaN/Inf from upstream ML pipeline
        let ai_score = if p.intent_ai_ml.is_finite() { p.intent_ai_ml } else { 0.0 };
        let hiring_score = if p.intent_hiring.is_finite() { p.intent_hiring } else { 0.0 };

        if ai_score > max_ai_score {
            max_ai_score = ai_score;
        }

        // Engagement weight (guard against negative counts producing NaN via ln)
        let engagement = (p.reactions_count.max(0) as f32) + (p.comments_count.max(0) as f32);
        let mut w = (2.0 + engagement).ln();

        // Reposts carry less signal than original content
        if p.is_repost {
            w *= 0.5;
        }

        weight_total += w;

        if ai_score > INTENT_THRESHOLD {
            ai_post_count += 1;
            // Only AI posts contribute positive evidence
            weighted_ai_sum += ai_score * w;
        }

        // Hiring + AI combo: recruiter posting AI jobs
        if hiring_score > INTENT_THRESHOLD && ai_score > INTENT_THRESHOLD {
            hiring_ai_count += 1;
        }
    }

    // AI ratio: what fraction of posts (by engagement weight) are AI-related
    let ai_ratio = if weight_total > 0.0 {
        weighted_ai_sum / weight_total
    } else {
        0.0
    };

    // 3. Combined score: blend title prior + post evidence
    let ai_probability = if posts.is_empty() {
        // No posts — title is the only signal
        title_score
    } else {
        // Weighted blend: title contributes less as we get more post evidence
        let post_confidence = (posts.len() as f32 / 10.0).min(1.0); // 10+ posts → full confidence in posts
        let title_weight = 1.0 - post_confidence * 0.7; // title always keeps at least 30% influence
        let post_weight = 1.0 - title_weight;

        // Post score: ratio-based with multiplicative boosts (avoids additive saturation)
        let hiring_ai_ratio = hiring_ai_count as f32 / posts.len().max(1) as f32;
        let post_score = (ai_ratio * (1.0 + 0.15 * max_ai_score + 0.20 * hiring_ai_ratio)).min(1.0);

        (title_weight * title_score + post_weight * post_score).clamp(0.0, 1.0)
    };

    // 4. Verdict
    let verdict = if ai_probability >= AI_THRESHOLD {
        Verdict::AiRelated
    } else {
        Verdict::NotAi
    };

    AffinityResult {
        contact_id: contact.id,
        name,
        position: position.to_string(),
        company: company.to_string(),
        ai_probability,
        prior_from_title: title_score,
        ai_post_count,
        hiring_ai_count,
        total_posts: posts.len(),
        max_ai_score,
        weighted_avg_ai: ai_ratio,
        verdict,
    }
}

// ── Neon batch tag update ────────────────────────────────────────────────────

/// Batch-tag contacts as "to-be-deleted". Uses two SQL statements:
/// 1. Contacts with NULL/empty tags → set directly to '["to-be-deleted"]'
/// 2. Contacts with existing tags that don't already have "to-be-deleted" →
///    append via jsonb concat
///
/// Returns (newly_tagged, already_tagged).
async fn batch_tag_for_deletion(
    client: &tokio_postgres::Client,
    contact_ids: &[i32],
) -> Result<(usize, usize)> {
    if contact_ids.is_empty() {
        return Ok((0, 0));
    }

    // First: find which ones already have the tag
    let rows = client
        .query(
            "SELECT id, tags FROM contacts WHERE id = ANY($1)",
            &[&contact_ids],
        )
        .await
        .context("Failed to read contact tags")?;

    let mut needs_tag: Vec<i32> = Vec::new();
    let mut already_tagged = 0usize;

    for row in &rows {
        let id: i32 = row.get(0);
        let tags_raw: Option<String> = row.get(1);
        let tags: Vec<String> = tags_raw
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();

        if tags.iter().any(|t| t == "to-be-deleted") {
            already_tagged += 1;
        } else {
            needs_tag.push(id);
        }
    }

    if needs_tag.is_empty() {
        return Ok((0, already_tagged));
    }

    // Build new tags in Rust (avoids tags::jsonb cast crash on corrupt data)
    // and update each contact with its computed tag string.
    let mut updated = 0usize;
    for row in &rows {
        let id: i32 = row.get(0);
        if !needs_tag.contains(&id) {
            continue;
        }
        let tags_raw: Option<String> = row.get(1);
        let mut tags: Vec<String> = tags_raw
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        tags.push("to-be-deleted".to_string());
        let new_tags = serde_json::to_string(&tags).unwrap_or_else(|_| "[\"to-be-deleted\"]".to_string());

        client
            .execute(
                "UPDATE contacts SET tags = $1, updated_at = now()::text WHERE id = $2",
                &[&new_tags, &id],
            )
            .await
            .context("Failed to update contact tags")?;
        updated += 1;
    }

    Ok((updated, already_tagged))
}

/// Remove "to-be-deleted" tag from contacts that have been reclassified as AI-Related.
/// Returns (untagged_count, not_tagged_count).
async fn batch_untag_deletion(
    client: &tokio_postgres::Client,
    contact_ids: &[i32],
) -> Result<(usize, usize)> {
    if contact_ids.is_empty() {
        return Ok((0, 0));
    }

    let rows = client
        .query(
            "SELECT id, tags FROM contacts WHERE id = ANY($1)",
            &[&contact_ids],
        )
        .await
        .context("Failed to read contact tags for untag")?;

    let mut needs_untag: Vec<i32> = Vec::new();
    let mut not_tagged = 0usize;

    for row in &rows {
        let id: i32 = row.get(0);
        let tags_raw: Option<String> = row.get(1);
        let tags: Vec<String> = tags_raw
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();

        if tags.iter().any(|t| t == "to-be-deleted") {
            needs_untag.push(id);
        } else {
            not_tagged += 1;
        }
    }

    if needs_untag.is_empty() {
        return Ok((0, not_tagged));
    }

    // Remove "to-be-deleted" in Rust (avoids tags::jsonb cast crash on corrupt data)
    let mut updated = 0usize;
    for row in &rows {
        let id: i32 = row.get(0);
        if !needs_untag.contains(&id) {
            continue;
        }
        let tags_raw: Option<String> = row.get(1);
        let tags: Vec<String> = tags_raw
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        let new_tags: Vec<&String> = tags.iter().filter(|t| t.as_str() != "to-be-deleted").collect();
        let new_tags_json = serde_json::to_string(&new_tags).unwrap_or_else(|_| "[]".to_string());

        client
            .execute(
                "UPDATE contacts SET tags = $1, updated_at = now()::text WHERE id = $2",
                &[&new_tags_json, &id],
            )
            .await
            .context("Failed to remove to-be-deleted tag")?;
        updated += 1;
    }

    Ok((updated, not_tagged))
}

// ── Main ────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "process_posts=info".into()),
        )
        .init();

    println!("═══ Post-Process: AI Affinity Classification ═══");
    println!();

    // 1. Open LanceDB and load all posts
    let db_path = linkedin_posts::lance_db_path();
    tracing::info!("LanceDB path: {}", db_path);
    let db = PostsDb::open(&db_path).await?;
    let all_posts = db.load_all_posts().await?;

    // 2. Connect to Neon (single connection reused for all operations)
    let client = neon::connect_neon().await?;
    let contacts = neon::fetch_contacts_with_client(&client).await?;
    println!(
        "Loaded {} posts for {} contacts from LanceDB",
        all_posts.len(),
        contacts.len()
    );

    // 3. Group posts by contact_id
    let mut posts_by_contact: HashMap<i32, Vec<StoredPost>> = HashMap::new();
    for post in all_posts {
        posts_by_contact
            .entry(post.contact_id)
            .or_default()
            .push(post);
    }

    // 4. Compute AI affinity for each contact
    let mut results: Vec<AffinityResult> = contacts
        .iter()
        .map(|c| {
            let posts = posts_by_contact.get(&c.id).map(|v| v.as_slice()).unwrap_or(&[]);
            compute_ai_affinity(c, posts)
        })
        .collect();

    // Sort by AI probability descending for reporting
    results.sort_by(|a, b| b.ai_probability.total_cmp(&a.ai_probability));

    let ai_count = results.iter().filter(|r| matches!(r.verdict, Verdict::AiRelated)).count();
    let not_ai_count = results.iter().filter(|r| matches!(r.verdict, Verdict::NotAi)).count();
    let with_posts = results.iter().filter(|r| r.total_posts > 0).count();
    let without_posts = results.iter().filter(|r| r.total_posts == 0).count();
    let total = results.len();

    println!();
    println!("Contact Results:");
    println!(
        "  AI-Related:      {:>4}  ({:.1}%)",
        ai_count,
        if total > 0 { ai_count as f32 / total as f32 * 100.0 } else { 0.0 }
    );
    println!(
        "  Not AI:          {:>4}  ({:.1}%)  → to-be-deleted",
        not_ai_count,
        if total > 0 { not_ai_count as f32 / total as f32 * 100.0 } else { 0.0 }
    );
    println!(
        "  With posts:      {:>4}  |  Without posts: {}  (title-only classification)",
        with_posts, without_posts,
    );

    // 5. Batch-tag non-AI contacts (reusing the Neon connection from step 2)

    let not_ai_ids: Vec<i32> = results
        .iter()
        .filter(|r| matches!(r.verdict, Verdict::NotAi))
        .map(|r| r.contact_id)
        .collect();

    // Process in chunks of 500 to avoid query parameter limits
    let mut newly_tagged = 0usize;
    let mut already_tagged = 0usize;

    for chunk in not_ai_ids.chunks(500) {
        let (new, existing) = batch_tag_for_deletion(&client, chunk).await?;
        newly_tagged += new;
        already_tagged += existing;
        if new > 0 {
            tracing::info!("Batch tagged {} contacts (chunk of {})", new, chunk.len());
        }
    }

    // 6. Remove stale "to-be-deleted" tags from AI-Related contacts
    let ai_ids: Vec<i32> = results
        .iter()
        .filter(|r| matches!(r.verdict, Verdict::AiRelated))
        .map(|r| r.contact_id)
        .collect();

    let mut untagged = 0usize;

    for chunk in ai_ids.chunks(500) {
        let (removed, _clean) = batch_untag_deletion(&client, chunk).await?;
        untagged += removed;
        if removed > 0 {
            tracing::info!("Removed to-be-deleted from {} AI contacts (chunk of {})", removed, chunk.len());
        }
    }

    println!();
    println!("Tags Applied:");
    println!(
        "  to-be-deleted:   {:>4}  ({} new, {} already tagged)",
        not_ai_count, newly_tagged, already_tagged,
    );
    if untagged > 0 {
        println!(
            "  untagged:        {:>4}  (reclassified as AI-Related)",
            untagged,
        );
    }

    // 6. Top AI contacts
    let top_ai: Vec<&AffinityResult> = results
        .iter()
        .filter(|r| matches!(r.verdict, Verdict::AiRelated) && r.total_posts > 0)
        .take(5)
        .collect();

    if !top_ai.is_empty() {
        println!();
        println!("Top {} strongest AI contacts:", top_ai.len());
        for (i, r) in top_ai.iter().enumerate() {
            println!(
                "  {}. {} ({} @ {})  p={:.2}  posts={}  ai_posts={}  hiring_ai={}",
                i + 1,
                r.name,
                r.position,
                r.company,
                r.ai_probability,
                r.total_posts,
                r.ai_post_count,
                r.hiring_ai_count,
            );
        }
    }

    // 7. Bottom contacts (tagged for deletion)
    let bottom: Vec<&AffinityResult> = results
        .iter()
        .filter(|r| matches!(r.verdict, Verdict::NotAi))
        .rev()
        .take(5)
        .collect();

    if !bottom.is_empty() {
        println!();
        println!("Bottom {} tagged for deletion:", bottom.len());
        for (i, r) in bottom.iter().enumerate() {
            println!(
                "  {}. {} ({} @ {})  p={:.2}  posts={}  ai_posts={}  hiring_ai={}",
                i + 1,
                r.name,
                r.position,
                r.company,
                r.ai_probability,
                r.total_posts,
                r.ai_post_count,
                r.hiring_ai_count,
            );
        }
    }

    println!();
    println!("═══ Complete ═══");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_contact(id: i32, position: Option<&str>, company: Option<&str>) -> Contact {
        Contact {
            id,
            first_name: "Test".to_string(),
            last_name: "User".to_string(),
            linkedin_url: "https://linkedin.com/in/test".to_string(),
            company: company.map(|s| s.to_string()),
            position: position.map(|s| s.to_string()),
            scraped_at: "2024-01-01".to_string(),
        }
    }

    fn make_post(contact_id: i32, intent_ai_ml: f32, reactions: i32, comments: i32) -> StoredPost {
        make_post_full(contact_id, intent_ai_ml, 0.1, reactions, comments)
    }

    fn make_post_full(contact_id: i32, intent_ai_ml: f32, intent_hiring: f32, reactions: i32, comments: i32) -> StoredPost {
        StoredPost {
            id: 1,
            contact_id,
            post_url: None,
            post_text: Some("test post".to_string()),
            posted_date: None,
            reactions_count: reactions,
            comments_count: comments,
            reposts_count: 0,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
            scraped_at: "2024-01-01".to_string(),
            relevance_score: 0.5,
            primary_intent: "ai_ml_content".to_string(),
            intent_hiring,
            intent_ai_ml,
            intent_remote: 0.0,
            intent_eng_culture: 0.0,
            intent_company_growth: 0.0,
            intent_thought_leadership: 0.0,
            intent_noise: 0.1,
            entities_json: None,
        }
    }

    // ── No-posts classification (title-only) ──

    #[test]
    fn no_posts_ai_title_is_ai_related() {
        let contact = make_contact(1, Some("ML Engineer"), None);
        let result = compute_ai_affinity(&contact, &[]);
        assert!(matches!(result.verdict, Verdict::AiRelated));
        assert!((result.ai_probability - 0.70).abs() < 0.01);
    }

    #[test]
    fn no_posts_eng_title_is_not_ai() {
        let contact = make_contact(1, Some("Backend Engineer"), None);
        let result = compute_ai_affinity(&contact, &[]);
        assert!(matches!(result.verdict, Verdict::NotAi));
        assert!((result.ai_probability - 0.30).abs() < 0.01);
    }

    #[test]
    fn no_posts_generic_title_is_not_ai() {
        let contact = make_contact(1, Some("Sales Manager"), None);
        let result = compute_ai_affinity(&contact, &[]);
        assert!(matches!(result.verdict, Verdict::NotAi));
        assert!((result.ai_probability - 0.10).abs() < 0.01);
    }

    #[test]
    fn no_posts_empty_position() {
        let contact = make_contact(1, None, None);
        let result = compute_ai_affinity(&contact, &[]);
        assert!(matches!(result.verdict, Verdict::NotAi));
        assert!((result.ai_probability - 0.10).abs() < 0.01);
    }

    // ── Posts-based classification ──

    #[test]
    fn all_ai_posts_high_probability() {
        let contact = make_contact(1, Some("Engineer"), Some("Acme"));
        let posts: Vec<StoredPost> = (0..5)
            .map(|_| make_post(1, 0.8, 50, 10))
            .collect();
        let result = compute_ai_affinity(&contact, &posts);
        assert!(matches!(result.verdict, Verdict::AiRelated));
        assert!(result.ai_probability > AI_THRESHOLD, "p={:.3}", result.ai_probability);
        assert_eq!(result.ai_post_count, 5);
    }

    #[test]
    fn no_ai_posts_with_ai_title_stays_ai() {
        // AI title (0.70 prior) with no AI posts — title dominates
        let contact = make_contact(1, Some("ML Engineer"), Some("Acme"));
        let posts: Vec<StoredPost> = (0..5)
            .map(|_| make_post(1, 0.1, 10, 2)) // low AI intent
            .collect();
        let result = compute_ai_affinity(&contact, &posts);
        assert!(matches!(result.verdict, Verdict::AiRelated),
            "AI title should keep verdict AiRelated, p={:.3}", result.ai_probability);
    }

    #[test]
    fn single_post_title_dominates() {
        let contact = make_contact(1, Some("Sales Manager"), None);
        let posts = vec![make_post(1, 0.9, 100, 20)];
        let result = compute_ai_affinity(&contact, &posts);
        // With 1 post: post_confidence=0.1, title_weight=0.93
        // Title (0.10) dominates over post signal
        assert!(result.ai_probability < 0.35, "p={:.3} single post shouldn't override low title", result.ai_probability);
    }

    #[test]
    fn ten_plus_posts_full_confidence() {
        let contact = make_contact(1, Some("Generic Role"), None);
        let posts: Vec<StoredPost> = (0..15)
            .map(|_| make_post(1, 0.8, 50, 10))
            .collect();
        let result = compute_ai_affinity(&contact, &posts);
        // With 15 posts: post_confidence capped at 1.0, title_weight=0.30
        assert!(matches!(result.verdict, Verdict::AiRelated));
        assert!(result.ai_probability > 0.5, "p={:.3}", result.ai_probability);
    }

    #[test]
    fn verdict_boundary_at_threshold() {
        let contact = make_contact(1, Some("ML Engineer"), None);
        let result = compute_ai_affinity(&contact, &[]);
        // 0.70 >= 0.35 → AiRelated
        assert!(result.ai_probability >= AI_THRESHOLD);
        assert!(matches!(result.verdict, Verdict::AiRelated));
    }

    // ── Recruiter posting AI jobs ──

    #[test]
    fn recruiter_posting_ai_jobs_is_ai_related() {
        // Generic recruiter title (no AI keywords) but posts AI hiring content
        let contact = make_contact(1, Some("Technical Recruiter"), Some("Acme"));
        let posts: Vec<StoredPost> = (0..10)
            .map(|_| make_post_full(1, 0.7, 0.8, 50, 10)) // high AI + high hiring
            .collect();
        let result = compute_ai_affinity(&contact, &posts);
        assert!(matches!(result.verdict, Verdict::AiRelated),
            "Recruiter posting AI jobs should be AiRelated, p={:.3}", result.ai_probability);
        assert_eq!(result.hiring_ai_count, 10);
    }

    #[test]
    fn recruiter_posting_non_ai_jobs_is_not_ai() {
        // Recruiter posting generic hiring content (high hiring, low AI)
        let contact = make_contact(1, Some("Technical Recruiter"), Some("Acme"));
        let posts: Vec<StoredPost> = (0..10)
            .map(|_| make_post_full(1, 0.1, 0.8, 50, 10)) // low AI, high hiring
            .collect();
        let result = compute_ai_affinity(&contact, &posts);
        assert!(matches!(result.verdict, Verdict::NotAi),
            "Recruiter posting non-AI jobs should be NotAi, p={:.3}", result.ai_probability);
        assert_eq!(result.hiring_ai_count, 0);
    }

    // ── Edge cases ──

    #[test]
    fn negative_reactions_no_nan() {
        let contact = make_contact(1, Some("Engineer"), None);
        let mut post = make_post(1, 0.8, -5, -3);
        post.reactions_count = -5;
        post.comments_count = -3;
        let result = compute_ai_affinity(&contact, &[post]);
        assert!(!result.ai_probability.is_nan(), "NaN from negative reactions");
        assert!(!result.ai_probability.is_infinite(), "Inf from negative reactions");
    }

    #[test]
    fn zero_engagement_no_nan() {
        // Use "ML Engineer" which matches AI keywords for 0.70 prior
        let contact = make_contact(1, Some("ML Engineer"), None);
        let posts = vec![make_post(1, 0.9, 0, 0)];
        let result = compute_ai_affinity(&contact, &posts);
        assert!(!result.ai_probability.is_nan());
        assert!(!result.ai_probability.is_infinite());
        assert!(result.ai_probability >= AI_THRESHOLD, "p={:.3}", result.ai_probability);
    }

    #[test]
    fn result_fields_populated() {
        let contact = make_contact(42, Some("ML Lead"), Some("Acme Corp"));
        let result = compute_ai_affinity(&contact, &[]);
        assert_eq!(result.contact_id, 42);
        assert_eq!(result.name, "Test User");
        assert_eq!(result.position, "ML Lead");
        assert_eq!(result.company, "Acme Corp");
    }

    #[test]
    fn sort_with_nan_does_not_panic() {
        // Verify total_cmp handles NaN without panicking (no unwrap)
        let mut vals = [0.5f32, f32::NAN, 0.3, 0.8];
        vals.sort_by(|a, b| b.total_cmp(a));
        // total_cmp sorts NaN to a deterministic position — just verify no panic
    }
}

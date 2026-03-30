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
struct AffinityResult {
    contact_id: i32,
    name: String,
    position: String,
    company: String,
    ai_probability: f32,
    prior_from_title: f32,
    ai_post_count: usize,
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
    let mut max_ai_score = 0.0f32;
    let mut weighted_ai_sum = 0.0f32;
    let mut weight_total = 0.0f32;

    for p in posts {
        let ai_score = p.intent_ai_ml;
        if ai_score > max_ai_score {
            max_ai_score = ai_score;
        }

        // Engagement weight
        let w = (1.0 + p.reactions_count as f32 + p.comments_count as f32).ln().max(1.0);
        weight_total += w;

        if ai_score > INTENT_THRESHOLD {
            ai_post_count += 1;
            // Only AI posts contribute positive evidence
            weighted_ai_sum += ai_score * w;
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

        // Post score: ratio-based with boost for high max score
        let post_score = ai_ratio + 0.15 * max_ai_score;

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

    // Batch update: contacts with NULL/empty tags get fresh array,
    // contacts with existing tags get "to-be-deleted" appended.
    // Single UPDATE using CASE expression for both scenarios.
    let updated = client
        .execute(
            "UPDATE contacts
             SET tags = CASE
               WHEN tags IS NULL OR tags = '' OR tags = '[]'
               THEN '[\"to-be-deleted\"]'
               ELSE (
                 SELECT jsonb_agg(elem)::text
                 FROM (
                   SELECT elem FROM jsonb_array_elements(tags::jsonb) AS elem
                   UNION ALL
                   SELECT '\"to-be-deleted\"'::jsonb
                 ) sub
               )
             END,
             updated_at = now()::text
             WHERE id = ANY($1)",
            &[&needs_tag],
        )
        .await
        .context("Failed to batch update tags")?;

    Ok((updated as usize, already_tagged))
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

    // 2. Fetch contacts from Neon
    let contacts = neon::fetch_contacts_with_linkedin().await?;
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
    results.sort_by(|a, b| b.ai_probability.partial_cmp(&a.ai_probability).unwrap());

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

    // 5. Connect to Neon and batch-tag non-AI contacts
    let client = neon::connect_neon().await?;
    println!();
    println!("Connected to Neon PostgreSQL");

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

    println!();
    println!("Tags Applied:");
    println!(
        "  to-be-deleted:   {:>4}  ({} new, {} already tagged)",
        not_ai_count, newly_tagged, already_tagged,
    );

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
                "  {}. {} ({} @ {})  p={:.2}  posts={}  ai_posts={}",
                i + 1,
                r.name,
                r.position,
                r.company,
                r.ai_probability,
                r.total_posts,
                r.ai_post_count,
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
                "  {}. {} ({} @ {})  p={:.2}  posts={}  ai_posts={}",
                i + 1,
                r.name,
                r.position,
                r.company,
                r.ai_probability,
                r.total_posts,
                r.ai_post_count,
            );
        }
    }

    println!();
    println!("═══ Complete ═══");

    Ok(())
}

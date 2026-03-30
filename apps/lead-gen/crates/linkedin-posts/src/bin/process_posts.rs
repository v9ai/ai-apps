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
const MIN_POSTS_FOR_VERDICT: usize = 3;

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
enum Verdict {
    AiRelated,
    NotAi,
    Insufficient,
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

// ── Bayesian AI Affinity ────────────────────────────────────────────────────

fn compute_ai_affinity(contact: &Contact, posts: &[StoredPost]) -> AffinityResult {
    let position = contact.position.as_deref().unwrap_or("");
    let company = contact.company.as_deref().unwrap_or("");
    let name = format!("{} {}", contact.first_name, contact.last_name);

    // 1. Prior from title
    let prior = if title_has_ai_signal(position) {
        0.70
    } else if title_has_engineering_signal(position) {
        0.30
    } else {
        0.15
    };

    let mut log_odds = (prior / (1.0f32 - prior)).ln();

    // 2. Evidence from posts
    let mut ai_post_count = 0usize;
    let mut max_ai_score = 0.0f32;
    let mut weighted_sum = 0.0f32;
    let mut weight_total = 0.0f32;

    for p in posts {
        let ai_score = p.intent_ai_ml;
        if ai_score > max_ai_score {
            max_ai_score = ai_score;
        }
        if ai_score > INTENT_THRESHOLD {
            ai_post_count += 1;
        }

        // Engagement weight: log(1 + reactions + comments), min 1.0
        let engagement_weight = (1.0 + p.reactions_count as f32 + p.comments_count as f32).ln().max(1.0);
        weighted_sum += ai_score * engagement_weight;
        weight_total += engagement_weight;

        // Log-likelihood ratio contribution (clamped to avoid extreme values)
        let clamped = ai_score.clamp(0.05, 0.95);
        let llr = (clamped / (1.0 - clamped)).ln();
        let contribution = (engagement_weight / 3.0) * llr.clamp(-3.0, 3.0);
        log_odds += contribution;
    }

    let weighted_avg_ai = if weight_total > 0.0 {
        weighted_sum / weight_total
    } else {
        0.0
    };

    // 3. Posterior
    let ai_probability = sigmoid(log_odds);

    // 4. Verdict
    let verdict = if ai_probability >= AI_THRESHOLD {
        Verdict::AiRelated
    } else if posts.len() >= MIN_POSTS_FOR_VERDICT {
        Verdict::NotAi
    } else if title_has_ai_signal(position) {
        // Few posts but AI title — give benefit of the doubt
        Verdict::AiRelated
    } else if title_has_engineering_signal(position) && posts.is_empty() {
        // Engineering title, no posts scraped yet — insufficient
        Verdict::Insufficient
    } else if posts.is_empty() {
        Verdict::Insufficient
    } else {
        // 1-2 posts, no AI title signal — not enough evidence
        Verdict::Insufficient
    };

    AffinityResult {
        contact_id: contact.id,
        name,
        position: position.to_string(),
        company: company.to_string(),
        ai_probability,
        prior_from_title: prior,
        ai_post_count,
        total_posts: posts.len(),
        max_ai_score,
        weighted_avg_ai,
        verdict,
    }
}

#[inline]
fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

// ── Neon tag update ─────────────────────────────────────────────────────────

async fn tag_contact_for_deletion(
    client: &tokio_postgres::Client,
    contact_id: i32,
) -> Result<bool> {
    let row = client
        .query_one("SELECT tags FROM contacts WHERE id = $1", &[&contact_id])
        .await
        .context("Failed to read contact tags")?;

    let tags_raw: Option<String> = row.get(0);
    let mut tags: Vec<String> = tags_raw
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    if tags.iter().any(|t| t == "to-be-deleted") {
        return Ok(false); // already tagged
    }

    tags.push("to-be-deleted".to_string());
    let tags_json = serde_json::to_string(&tags)?;

    client
        .execute(
            "UPDATE contacts SET tags = $1, updated_at = now()::text WHERE id = $2",
            &[&tags_json, &contact_id],
        )
        .await
        .context("Failed to update contact tags")?;

    Ok(true)
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
    let insufficient_count = results.iter().filter(|r| matches!(r.verdict, Verdict::Insufficient)).count();
    let total = results.len();

    println!();
    println!("Contact Results:");
    println!(
        "  AI-Related:      {:>4}  ({:.1}%)",
        ai_count,
        if total > 0 { ai_count as f32 / total as f32 * 100.0 } else { 0.0 }
    );
    println!(
        "  Not AI:          {:>4}  ({:.1}%)",
        not_ai_count,
        if total > 0 { not_ai_count as f32 / total as f32 * 100.0 } else { 0.0 }
    );
    println!(
        "  Insufficient:    {:>4}  ({:.1}%)  [skipped — < {} posts, no title signal]",
        insufficient_count,
        if total > 0 { insufficient_count as f32 / total as f32 * 100.0 } else { 0.0 },
        MIN_POSTS_FOR_VERDICT,
    );

    // 5. Connect to Neon and tag non-AI contacts
    let client = neon::connect_neon().await?;
    println!();
    println!("Connected to Neon PostgreSQL");

    let mut newly_tagged = 0usize;
    let mut already_tagged = 0usize;

    for result in &results {
        if matches!(result.verdict, Verdict::NotAi) {
            match tag_contact_for_deletion(&client, result.contact_id).await {
                Ok(true) => {
                    newly_tagged += 1;
                    tracing::info!(
                        "Tagged contact {} ({}) as to-be-deleted (p={:.3})",
                        result.contact_id,
                        result.name,
                        result.ai_probability,
                    );
                }
                Ok(false) => {
                    already_tagged += 1;
                }
                Err(e) => {
                    tracing::warn!(
                        "Failed to tag contact {}: {}",
                        result.contact_id,
                        e
                    );
                }
            }
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

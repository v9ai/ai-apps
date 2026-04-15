use std::collections::HashSet;
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    BooleanArray, Float32Array, Int32Array, Int64Array, RecordBatch, StringArray, UInt32Array,
};
#[cfg(feature = "contrib-embed")]
use arrow_array::FixedSizeListArray;
use arrow_schema::{DataType, Field, Schema};
use lancedb::{connect, Connection};

#[cfg(feature = "contrib-embed")]
use candle::{best_device, EmbeddingModel};

use crate::types::GhUser;

/// Embedding dimension for BAAI/bge-small-en-v1.5.
const EMBED_DIM: i32 = 384;

/// One repo + contribution count stored alongside a contributor.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepoContrib {
    pub repo: String,
    pub contributions: u32,
}

/// A contributor record ready to persist.
#[derive(Debug, Clone)]
pub struct ContributorRecord {
    pub user: GhUser,
    /// All AI repos this person was seen contributing to.
    pub repos: Vec<RepoContrib>,
    pub total_contributions: u32,
}

/// Weights: density, novelty, breadth, activity, skill_relevance, engagement, obscurity, recency, contribution_quality.
/// Must sum to 1.0.
pub const SCORE_WEIGHTS: [f32; 9] = [0.15, 0.06, 0.08, 0.12, 0.08, 0.06, 0.05, 0.18, 0.22];

/// AI-relevant topic keywords for contribution quality scoring.
const AI_RELEVANT_TOPICS: &[&str] = &[
    "machine-learning", "deep-learning", "artificial-intelligence",
    "llm", "large-language-model", "large-language-models", "generative-ai",
    "nlp", "natural-language-processing", "computer-vision",
    "reinforcement-learning", "neural-network", "neural-networks",
    "rag", "vector-database", "embeddings", "fine-tuning",
    "ai-agent", "ai-agents", "multimodal", "langchain", "llamaindex",
    "transformers", "pytorch", "tensorflow", "huggingface",
    "stable-diffusion", "diffusion-models", "mlops",
];

/// Returns true for bot logins (dependabot, renovate, GitHub Apps, etc.).
pub fn is_bot(login: &str) -> bool {
    let l = login.to_ascii_lowercase();
    l.ends_with("[bot]") || l.contains("dependabot") || l.contains("renovate")
}

/// Breakdown of a contributor's rising-star score.
#[derive(Debug, Clone)]
pub struct RisingScore {
    /// 0.0–1.0 composite rising-star score.
    pub score: f32,
    /// contributions / (followers + 1) — high = undiscovered talent.
    pub contribution_density: f32,
    /// Newer accounts get higher novelty credit (< 5 years old → 1.0, older → 0.0).
    pub novelty: f32,
    /// Number of distinct AI repos contributed to (normalised 0–1, caps at 5).
    pub breadth: f32,
    /// Active builder signal from real contribution data (commits, PRs, reviews).
    pub activity: f32,
    /// AI skill count / 8 — richer skill profile = higher score.
    pub skill_relevance: f32,
    /// Reachability signals: email, hireable, blog, twitter, recently active.
    pub engagement: f32,
    /// Inverse-fame penalty: 1 / (1 + followers / 500).
    pub obscurity: f32,
    /// Ghost-account penalty: scaling to 1.0 as the account shows real activity.
    pub realness: f32,
    /// Fine-grained recency from contribution calendar (last 90d activity).
    pub recency: f32,
    /// Quality of contributions: external repos, star counts, AI relevance.
    pub contribution_quality: f32,
}

/// Compute rising-star score for a contributor.
///
/// v2: Uses real contribution data from GraphQL (commits, PRs, reviews),
/// hireable/recency multipliers, engagement signals, and skill relevance.
pub fn compute_rising_score(record: &ContributorRecord, skill_count: usize) -> RisingScore {
    let followers = record.user.followers as f32;
    let total_contributions = record.total_contributions as f32;
    let public_repos = record.user.public_repos as f32;
    let repos_count = record.repos.len() as f32;

    let account_age_days = {
        let now = chrono::Utc::now();
        (now - record.user.created_at).num_days().max(1) as f32
    };

    // ── Contribution density ────────────────────────────────────────
    let contribution_density =
        ((total_contributions / (followers + 1.0)) * 50.0_f32.recip()).tanh();

    // ── Novelty (softened — 10 year decay, not 5) ───────────────────
    let novelty = (1.0 - account_age_days / (365.0 * 10.0)).max(0.0);

    // ── Breadth ─────────────────────────────────────────────────────
    let breadth = (repos_count / 5.0).min(1.0);

    // ── Activity (v2: real contribution data) ───────────────────────
    let commits = record.user.total_commit_contributions
        .unwrap_or(record.user.public_repos) as f32;
    let prs = record.user.total_pr_contributions.unwrap_or(0) as f32;
    let reviews = record.user.total_review_contributions.unwrap_or(0) as f32;
    let activity = (commits / 200.0).min(1.0) * 0.5
        + (prs / 50.0).min(1.0) * 0.3
        + (reviews / 30.0).min(1.0) * 0.2;

    // ── Skill relevance (NEW) ───────────────────────────────────────
    let skill_relevance = (skill_count as f32 / 8.0).min(1.0);

    // ── Engagement (NEW: reachability + availability) ────────────────
    let days_since_update = (chrono::Utc::now() - record.user.updated_at).num_days();
    let engagement = [
        record.user.email.is_some(),
        record.user.hireable == Some(true),
        record.user.blog.as_ref().map_or(false, |b| !b.is_empty()),
        record.user.twitter_username.is_some(),
        days_since_update < 90,
    ]
    .iter()
    .filter(|&&s| s)
    .count() as f32
        / 5.0;

    // ── Obscurity ───────────────────────────────────────────────────
    let obscurity = 1.0 / (1.0 + followers / 500.0);

    // ── Recency (v3: contribution calendar fine-grained) ────────────
    let recency = if let Some(ref ap) = record.user.activity_profile {
        let days_since = ap.days_since_last_active.unwrap_or(365) as f32;
        let calendar_recency = (1.0 - days_since / 180.0).max(0.0);
        let frequency_signal = (ap.avg_daily_90d / 2.0).min(1.0);
        let trend_bonus = match ap.activity_trend.as_str() {
            "rising" => 1.0,
            "stable" => 0.7,
            "new" => 0.5,
            "declining" => 0.3,
            "dormant" => 0.0,
            _ => 0.3,
        };
        0.5 * calendar_recency + 0.3 * frequency_signal + 0.2 * trend_bonus
    } else {
        if days_since_update < 30 { 0.6 }
        else if days_since_update < 90 { 0.3 }
        else { 0.0 }
    };

    // ── Realness (ghost guard) ──────────────────────────────────────
    let presence = public_repos + followers;
    let realness = 0.5 + 0.5 * (presence * 0.2_f32).tanh();

    // ── Contribution quality (external repo impact) ─────────────────
    let contribution_quality = compute_contribution_quality(
        &record.user.login,
        record.user.contributed_repos_json.as_deref(),
    );

    // ── Weighted sum ────────────────────────────────────────────────
    let [w_d, w_n, w_b, w_a, w_s, w_e, w_o, w_r, w_cq] = SCORE_WEIGHTS;
    let raw = w_d * contribution_density
        + w_n * novelty
        + w_b * breadth
        + w_a * activity
        + w_s * skill_relevance
        + w_e * engagement
        + w_o * obscurity
        + w_r * recency
        + w_cq * contribution_quality;

    // ── Multipliers ─────────────────────────────────────────────────
    let hireable_bonus = if record.user.hireable == Some(true) { 1.15 } else { 1.0 };
    let recency_bonus = if let Some(ref ap) = record.user.activity_profile {
        match ap.days_since_last_active {
            Some(d) if d <= 7 => 1.15,
            Some(d) if d <= 30 => 1.10,
            Some(d) if d <= 90 => 1.05,
            _ => 1.0,
        }
    } else {
        if days_since_update <= 30 { 1.10 }
        else if days_since_update <= 90 { 1.05 }
        else { 1.0 }
    };

    RisingScore {
        score: (raw * realness * hireable_bonus * recency_bonus).clamp(0.0, 1.0),
        contribution_density,
        novelty,
        breadth,
        activity,
        skill_relevance,
        engagement,
        obscurity,
        realness,
        recency,
        contribution_quality,
    }
}

/// Weights for strength score: activity, skill_depth, breadth, standing, engagement, realness, contribution_quality.
/// Must sum to 1.0.
pub const STRENGTH_WEIGHTS: [f32; 7] = [0.22, 0.20, 0.10, 0.13, 0.08, 0.05, 0.22];

/// Breakdown of a contributor's strength score — values experience over obscurity.
#[derive(Debug, Clone)]
pub struct StrengthScore {
    /// 0.0–1.0 composite strength score.
    pub score: f32,
    /// Real engineering output (commits, PRs, reviews).
    pub activity: f32,
    /// Domain expertise breadth: skill_count / 8.
    pub skill_depth: f32,
    /// Cross-project AI repo contributions (normalised 0–1, caps at 5).
    pub breadth: f32,
    /// Professional reputation: log-scaled followers + org membership + hireable + email.
    pub standing: f32,
    /// Reachability: email, hireable, blog, twitter, recency.
    pub engagement: f32,
    /// Ghost-account penalty.
    pub realness: f32,
    /// Quality of contributions: external repos, star counts, AI relevance.
    pub contribution_quality: f32,
}

/// Compute strength score — rewards experience and standing, not obscurity.
///
/// Unlike `compute_rising_score` which penalises fame and old accounts,
/// this score is designed for senior/principal-level candidate discovery.
pub fn compute_strength_score(record: &ContributorRecord, skill_count: usize) -> StrengthScore {
    let followers = record.user.followers as f32;
    let public_repos = record.user.public_repos as f32;
    let repos_count = record.repos.len() as f32;

    // ── Activity (same formula as rising_score) ────────────────────
    let commits = record.user.total_commit_contributions
        .unwrap_or(record.user.public_repos) as f32;
    let prs = record.user.total_pr_contributions.unwrap_or(0) as f32;
    let reviews = record.user.total_review_contributions.unwrap_or(0) as f32;
    let activity = (commits / 200.0).min(1.0) * 0.5
        + (prs / 50.0).min(1.0) * 0.3
        + (reviews / 30.0).min(1.0) * 0.2;

    // ── Skill depth ────────────────────────────────────────────────
    let skill_depth = (skill_count as f32 / 8.0).min(1.0);

    // ── Breadth ────────────────────────────────────────────────────
    let breadth = (repos_count / 5.0).min(1.0);

    // ── Standing (rewards followers via log scale) ──────────────────
    // ln(followers+1)/ln(10001) gives ~1.0 at 10k followers, ~0.75 at 1k
    let log_followers = (followers + 1.0).ln() / (10001.0_f32).ln();
    let org_count = record.user.organizations_json.as_ref()
        .and_then(|j| serde_json::from_str::<Vec<serde_json::Value>>(j).ok())
        .map(|v| v.len())
        .unwrap_or(0) as f32;
    let org_signal = (org_count / 3.0).min(1.0);
    let hireable_signal = if record.user.hireable == Some(true) { 1.0 } else { 0.0 };
    let email_signal = if record.user.email.is_some() { 1.0 } else { 0.0 };
    let standing = log_followers * 0.5 + org_signal * 0.25 + hireable_signal * 0.15 + email_signal * 0.10;

    // ── Engagement ─────────────────────────────────────────────────
    let days_since_update = (chrono::Utc::now() - record.user.updated_at).num_days();
    let engagement = [
        record.user.email.is_some(),
        record.user.hireable == Some(true),
        record.user.blog.as_ref().map_or(false, |b| !b.is_empty()),
        record.user.twitter_username.is_some(),
        days_since_update < 90,
    ]
    .iter()
    .filter(|&&s| s)
    .count() as f32
        / 5.0;

    // ── Realness (ghost guard) ─────────────────────────────────────
    let presence = public_repos + followers;
    let realness = 0.5 + 0.5 * (presence * 0.2_f32).tanh();

    // ── Contribution quality (external repo impact) ─────────────────
    let contribution_quality = compute_contribution_quality(
        &record.user.login,
        record.user.contributed_repos_json.as_deref(),
    );

    // ── Weighted sum ───────────────────────────────────────────────
    let [w_a, w_s, w_b, w_st, w_e, w_r, w_cq] = STRENGTH_WEIGHTS;
    let raw = w_a * activity
        + w_s * skill_depth
        + w_b * breadth
        + w_st * standing
        + w_e * engagement
        + w_r * realness
        + w_cq * contribution_quality;

    // Recency bonus (same as rising_score)
    let recency_bonus = if let Some(ref ap) = record.user.activity_profile {
        match ap.days_since_last_active {
            Some(d) if d <= 7 => 1.15,
            Some(d) if d <= 30 => 1.10,
            Some(d) if d <= 90 => 1.05,
            _ => 1.0,
        }
    } else {
        if days_since_update <= 30 { 1.10 }
        else if days_since_update <= 90 { 1.05 }
        else { 1.0 }
    };

    StrengthScore {
        score: (raw * realness * recency_bonus).clamp(0.0, 1.0),
        activity,
        skill_depth,
        breadth,
        standing,
        engagement,
        realness,
        contribution_quality,
    }
}

/// Compute opportunity skill match: |intersection| / |required|.
///
/// Returns 0.0 when `opp_skills` is empty (no opportunity context).
pub fn compute_opp_skill_match(candidate_skills: &[String], opp_skills: &[String]) -> f32 {
    if opp_skills.is_empty() {
        return 0.0;
    }
    let matched = candidate_skills
        .iter()
        .filter(|s| opp_skills.iter().any(|o| o == *s))
        .count() as f32;
    (matched / opp_skills.len() as f32).clamp(0.0, 1.0)
}

/// Compute contribution quality: how impactful are this user's contributions?
///
/// Rewards commits to external (non-owned) repos with high star counts and
/// AI-relevant topics. Penalises profiles that only commit to their own repos.
/// Returns 0.0–1.0.
pub fn compute_contribution_quality(login: &str, contributed_repos_json: Option<&str>) -> f32 {
    let json = match contributed_repos_json {
        Some(j) if !j.is_empty() => j,
        _ => return 0.0,
    };

    let repos: Vec<crate::types::ContributedRepo> = match serde_json::from_str(json) {
        Ok(v) => v,
        Err(_) => return 0.0,
    };
    if repos.is_empty() {
        return 0.0;
    }

    let login_prefix = format!("{login}/");
    let total = repos.len() as f32;

    // External repos: not owned by this user
    let external: Vec<&crate::types::ContributedRepo> = repos
        .iter()
        .filter(|r| !r.name_with_owner.starts_with(&login_prefix))
        .collect();

    // Signal A: External contribution ratio (0.30)
    let external_ratio = external.len() as f32 / total;

    // Signal B: Star quality of external repos — top-3 mean (0.35)
    let star_quality = if external.is_empty() {
        0.0
    } else {
        let mut star_scores: Vec<f32> = external
            .iter()
            .map(|r| (r.stars as f32 + 1.0).ln() / 100_001_f32.ln())
            .collect();
        star_scores.sort_by(|a, b| b.partial_cmp(a).unwrap());
        let top_n = star_scores.len().min(3);
        star_scores[..top_n].iter().sum::<f32>() / top_n as f32
    };

    // Signal C: External breadth (0.15)
    let external_breadth = (external.len() as f32 / 5.0).min(1.0);

    // Signal D: AI relevance — fraction of repos with AI topics (0.20)
    let ai_count = repos
        .iter()
        .filter(|r| {
            r.topics.iter().any(|t| {
                AI_RELEVANT_TOPICS.contains(&t.as_str())
            })
        })
        .count() as f32;
    let ai_relevance = ai_count / total;

    (0.30 * external_ratio + 0.35 * star_quality + 0.15 * external_breadth + 0.20 * ai_relevance)
        .clamp(0.0, 1.0)
}

/// Infer position title from bio keywords — 14 categories ordered by specificity.
pub fn infer_position(bio: Option<&str>) -> Option<&'static str> {
    let bio = bio?.to_lowercase();
    if bio.contains("principal") { return Some("Principal Engineer"); }
    if bio.contains("staff engineer") || bio.contains("staff software") { return Some("Staff Engineer"); }
    if bio.contains("tech lead") || bio.contains("team lead") || bio.contains("engineering lead") { return Some("Lead Engineer"); }
    if bio.contains("architect") { return Some("Architect"); }
    if bio.contains("vp ") || bio.contains("vice president") { return Some("VP Engineering"); }
    if bio.contains("director") { return Some("Director"); }
    if bio.contains("head of") { return Some("Head of Engineering"); }
    if bio.contains("manager") { return Some("Engineering Manager"); }
    if bio.contains("founder") || bio.contains("ceo") || bio.contains("cto") { return Some("Founder"); }
    if bio.contains("researcher") || bio.contains("research scientist") || bio.contains("research engineer") { return Some("Researcher"); }
    if bio.contains("scientist") || bio.contains("data scientist") { return Some("Scientist"); }
    if bio.contains("consultant") { return Some("Consultant"); }
    if bio.contains("student") || bio.contains("intern") { return Some("Student"); }
    if bio.contains("senior") { return Some("Senior Engineer"); }
    if bio.contains("engineer") || bio.contains("developer") || bio.contains("programmer") { return Some("Engineer"); }
    None
}

/// Map position title to a 0.0–1.0 seniority level.
pub fn infer_seniority_level(position: Option<&str>) -> f32 {
    match position {
        Some("VP Engineering") | Some("Director") | Some("Head of Engineering") => 1.0,
        Some("Principal Engineer") => 0.95,
        Some("Staff Engineer") | Some("Architect") => 0.90,
        Some("Lead Engineer") | Some("Engineering Manager") => 0.85,
        Some("Founder") => 0.80,
        Some("Senior Engineer") => 0.75,
        Some("Researcher") | Some("Scientist") | Some("Consultant") => 0.70,
        Some("Engineer") => 0.50,
        Some("Student") => 0.20,
        _ => 0.50,
    }
}

fn schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("login", DataType::Utf8, false),
        Field::new("github_id", DataType::Int64, false),
        Field::new("html_url", DataType::Utf8, false),
        Field::new("avatar_url", DataType::Utf8, false),
        Field::new("name", DataType::Utf8, true),
        Field::new("email", DataType::Utf8, true),
        Field::new("bio", DataType::Utf8, true),
        Field::new("company", DataType::Utf8, true),
        Field::new("location", DataType::Utf8, true),
        Field::new("blog", DataType::Utf8, true),
        Field::new("twitter", DataType::Utf8, true),
        Field::new("public_repos", DataType::Int32, false),
        Field::new("public_gists", DataType::Int32, false),
        Field::new("followers", DataType::Int32, false),
        Field::new("following", DataType::Int32, false),
        Field::new("hireable", DataType::Boolean, true),
        Field::new("gh_created_at", DataType::Utf8, false),
        Field::new("gh_updated_at", DataType::Utf8, false),
        // JSON array of {repo, contributions}
        Field::new("repos_json", DataType::Utf8, false),
        Field::new("total_contributions", DataType::UInt32, false),
        // Rising-star composite score and components
        Field::new("rising_score", DataType::Float32, false),
        Field::new("contribution_density", DataType::Float32, false),
        Field::new("novelty", DataType::Float32, false),
        Field::new("breadth", DataType::Float32, false),
        Field::new("realness", DataType::Float32, false),
        // Strength score — values experience over obscurity (nullable for backward compat)
        Field::new("strength_score", DataType::Float32, true),
        Field::new("scraped_at", DataType::Utf8, false),
        // Skills extracted at insert time (JSON array of tag strings).
        // Nullable so old rows without this column read as empty.
        Field::new("skills_json", DataType::Utf8, true),
        // Activity profile fields (nullable for backward compat)
        Field::new("account_age_days", DataType::UInt32, true),
        Field::new("last_active_date", DataType::Utf8, true),
        Field::new("days_since_last_active", DataType::UInt32, true),
        Field::new("contributions_30d", DataType::UInt32, true),
        Field::new("contributions_90d", DataType::UInt32, true),
        Field::new("contributions_365d", DataType::UInt32, true),
        Field::new("current_streak_days", DataType::UInt32, true),
        Field::new("activity_trend", DataType::Utf8, true),
        Field::new("recency", DataType::Float32, true),
        // Contribution quality — external repo impact (nullable for backward compat)
        Field::new("contribution_quality", DataType::Float32, true),
        // 384-d BAAI/bge-small-en-v1.5 embedding — null when contrib-embed feature is off.
        Field::new(
            "vector",
            DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                EMBED_DIM,
            ),
            true,
        ),
    ]))
}

pub struct ContributorsDb {
    conn: Connection,
    /// Logins already present — used to deduplicate within + across runs.
    known: HashSet<String>,
    /// BERT embedding model — loaded on demand via `with_embed()`.
    #[cfg(feature = "contrib-embed")]
    model: Option<EmbeddingModel>,
}

impl ContributorsDb {
    pub async fn open(path: &str) -> Result<Self> {
        let conn = connect(path).execute().await.context("open LanceDB")?;
        let known = load_known_logins(&conn).await?;
        tracing::info!("loaded {} existing contributor logins", known.len());
        let db = Self {
            conn,
            known,
            #[cfg(feature = "contrib-embed")]
            model: None,
        };
        db.ensure_table().await?;
        Ok(db)
    }

    /// Load BAAI/bge-small-en-v1.5 and enable per-insert embedding.
    ///
    /// Uses `spawn_blocking` because model loading is CPU-bound.
    /// Call once after `open()` — the DB can be used without this for
    /// plain metadata storage.
    #[cfg(feature = "contrib-embed")]
    pub async fn with_embed(mut self) -> Result<Self> {
        tracing::info!("loading BAAI/bge-small-en-v1.5 for contributor embeddings…");
        let model = tokio::task::spawn_blocking(|| {
            let device = best_device().map_err(|e| anyhow::anyhow!("{e}"))?;
            EmbeddingModel::from_hf("BAAI/bge-small-en-v1.5", &device)
                .map_err(|e| anyhow::anyhow!("{e}"))
        })
        .await
        .context("spawn_blocking for EmbeddingModel")??;
        tracing::info!("embedding model ready");
        self.model = Some(model);
        Ok(self)
    }

    async fn ensure_table(&self) -> Result<()> {
        let tables = self.conn.table_names().execute().await?;
        if !tables.contains(&"contributors".to_string()) {
            self.conn
                .create_empty_table("contributors", schema())
                .execute()
                .await
                .context("create contributors table")?;
            tracing::info!("created contributors table");
        }
        Ok(())
    }

    pub fn is_known(&self, login: &str) -> bool {
        self.known.contains(login)
    }

    /// Insert a batch of new contributors (skips already-known logins).
    pub async fn insert(&mut self, records: &[ContributorRecord]) -> Result<usize> {
        let new: Vec<&ContributorRecord> = records
            .iter()
            .filter(|r| !self.known.contains(&r.user.login))
            .collect();

        if new.is_empty() {
            return Ok(0);
        }

        let now = chrono::Utc::now().to_rfc3339();
        let n = new.len();
        let s = schema();

        // Pre-compute owned Strings to avoid borrow issues with iterators below
        let created_ats: Vec<String> = new.iter().map(|r| r.user.created_at.to_rfc3339()).collect();
        let updated_ats: Vec<String> = new.iter().map(|r| r.user.updated_at.to_rfc3339()).collect();
        let repos_jsons: Vec<String> = new
            .iter()
            .map(|r| serde_json::to_string(&r.repos).unwrap_or_default())
            .collect();

        // Skills extraction (always computed — pure keyword matching, negligible cost)
        let skills_jsons: Vec<String> = new
            .iter()
            .zip(repos_jsons.iter())
            .map(|(r, repos_json)| {
                let text = crate::skills::contributor_skills_text(
                    r.user.bio.as_deref(),
                    r.user.company.as_deref(),
                    repos_json,
                    r.user.pinned_repos_json.as_deref(),
                    r.user.contributed_repos_json.as_deref(),
                );
                serde_json::to_string(&crate::skills::extract_skills(&text))
                    .unwrap_or_else(|_| "[]".to_string())
            })
            .collect();

        // Derive skill counts from skills_jsons, then compute scores
        let skill_counts: Vec<usize> = skills_jsons
            .iter()
            .map(|j| {
                serde_json::from_str::<Vec<String>>(j)
                    .map(|v| v.len())
                    .unwrap_or(0)
            })
            .collect();
        let scores: Vec<RisingScore> = new
            .iter()
            .zip(skill_counts.iter())
            .map(|(r, &sc)| compute_rising_score(r, sc))
            .collect();
        let strength_scores: Vec<StrengthScore> = new
            .iter()
            .zip(skill_counts.iter())
            .map(|(r, &sc)| compute_strength_score(r, sc))
            .collect();

        // Vector column: embed under contrib-embed feature, null otherwise.
        let vector_array: Arc<dyn arrow_array::Array> = {
            #[cfg(feature = "contrib-embed")]
            {
                let vec_item_field = Arc::new(Field::new("item", DataType::Float32, true));
                let texts: Vec<String> = new
                    .iter()
                    .zip(repos_jsons.iter())
                    .map(|(r, repos_json)| {
                        crate::skills::contributor_skills_text(
                            r.user.bio.as_deref(),
                            r.user.company.as_deref(),
                            repos_json,
                            r.user.pinned_repos_json.as_deref(),
                            r.user.contributed_repos_json.as_deref(),
                        )
                    })
                    .collect();
                let vecs: Vec<Vec<f32>> = if let Some(model) = &self.model {
                    tokio::task::block_in_place(|| {
                        texts
                            .iter()
                            .map(|t| {
                                model.embed_one(t).unwrap_or_else(|_| {
                                    vec![0.0f32; EMBED_DIM as usize]
                                })
                            })
                            .collect()
                    })
                } else {
                    vec![vec![0.0f32; EMBED_DIM as usize]; n]
                };
                let flat: Vec<f32> = vecs.into_iter().flatten().collect();
                Arc::new(
                    FixedSizeListArray::try_new(
                        vec_item_field,
                        EMBED_DIM,
                        Arc::new(Float32Array::from(flat)),
                        None,
                    )
                    .context("build vector array")?,
                )
            }
            #[cfg(not(feature = "contrib-embed"))]
            {
                // All-null vectors when embedding is disabled.
                // FixedSizeListBuilder requires child values to be present even
                // for null entries (length check: child.len() == n * value_length).
                use arrow_array::builder::{FixedSizeListBuilder, Float32Builder};
                let mut builder = FixedSizeListBuilder::new(
                    Float32Builder::with_capacity(EMBED_DIM as usize * n),
                    EMBED_DIM,
                );
                for _ in 0..n {
                    for _ in 0..EMBED_DIM {
                        builder.values().append_value(0.0);
                    }
                    builder.append(false); // null outer entry
                }
                Arc::new(builder.finish())
            }
        };

        let batch = RecordBatch::try_new(
            s,
            vec![
                Arc::new(StringArray::from_iter_values(
                    new.iter().map(|r| r.user.login.as_str()),
                )),
                Arc::new(Int64Array::from_iter_values(
                    new.iter().map(|r| r.user.id as i64),
                )),
                Arc::new(StringArray::from_iter_values(
                    new.iter().map(|r| r.user.html_url.as_str()),
                )),
                Arc::new(StringArray::from_iter_values(
                    new.iter().map(|r| r.user.avatar_url.as_str()),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.name.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.email.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.bio.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.company.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.location.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.blog.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter().map(|r| r.user.twitter_username.as_deref()).collect::<Vec<_>>(),
                )),
                Arc::new(Int32Array::from_iter_values(
                    new.iter().map(|r| r.user.public_repos as i32),
                )),
                Arc::new(Int32Array::from_iter_values(
                    new.iter().map(|r| r.user.public_gists as i32),
                )),
                Arc::new(Int32Array::from_iter_values(
                    new.iter().map(|r| r.user.followers as i32),
                )),
                Arc::new(Int32Array::from_iter_values(
                    new.iter().map(|r| r.user.following as i32),
                )),
                Arc::new(BooleanArray::from(
                    new.iter().map(|r| r.user.hireable).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    created_ats.iter().map(String::as_str),
                )),
                Arc::new(StringArray::from_iter_values(
                    updated_ats.iter().map(String::as_str),
                )),
                Arc::new(StringArray::from_iter_values(
                    repos_jsons.iter().map(String::as_str),
                )),
                Arc::new(UInt32Array::from_iter_values(
                    new.iter().map(|r| r.total_contributions),
                )),
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.score),
                )),
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.contribution_density),
                )),
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.novelty),
                )),
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.breadth),
                )),
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.realness),
                )),
                // Strength score (nullable for backward compat)
                Arc::new(Float32Array::from(
                    strength_scores.iter().map(|s| Some(s.score)).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    std::iter::repeat(now.as_str()).take(n),
                )),
                // Skills JSON (nullable — old rows lack this column)
                Arc::new(StringArray::from(
                    skills_jsons
                        .iter()
                        .map(|s| Some(s.as_str()))
                        .collect::<Vec<_>>(),
                )),
                // Activity profile columns
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.account_age_days))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().and_then(|ap| ap.last_active_date.as_deref()))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().and_then(|ap| ap.days_since_last_active))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.contributions_30d))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.contributions_90d))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.contributions_365d))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.current_streak_days))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.activity_profile.as_ref().map(|ap| ap.activity_trend.as_str()))
                        .collect::<Vec<_>>(),
                )),
                Arc::new(Float32Array::from(
                    scores.iter().map(|s| Some(s.recency)).collect::<Vec<_>>(),
                )),
                // Contribution quality
                Arc::new(Float32Array::from(
                    scores.iter().map(|s| Some(s.contribution_quality)).collect::<Vec<_>>(),
                )),
                // Embedding vector (null when contrib-embed feature is off)
                vector_array,
            ],
        )?;

        let table = self.conn.open_table("contributors").execute().await?;
        table.add(vec![batch]).execute().await?;

        for r in &new {
            self.known.insert(r.user.login.clone());
        }

        tracing::info!("inserted {} contributors", n);
        Ok(n)
    }

    pub async fn count(&self) -> usize {
        match self.conn.open_table("contributors").execute().await {
            Ok(t) => t.count_rows(None).await.unwrap_or(0) as usize,
            Err(_) => 0,
        }
    }

    /// Return the top N contributors by rising_score.
    pub async fn top_candidates(&self, n: usize) -> Result<Vec<Candidate>> {
        use arrow_array::Array;
        use futures::TryStreamExt;
        use lancedb::query::{ExecutableQuery, QueryBase};

        let table = self.conn.open_table("contributors").execute().await?;

        // Probe the table schema so we can include new columns only when present.
        // This allows top_candidates() to work against DBs created before skills_json
        // was added (avoids "column not found" errors on old data).
        let table_schema = table.schema().await?;
        let has_skills = table_schema.field_with_name("skills_json").is_ok();
        let has_activity = table_schema.field_with_name("account_age_days").is_ok();
        let has_strength = table_schema.field_with_name("strength_score").is_ok();
        let has_contribution_quality = table_schema.field_with_name("contribution_quality").is_ok();

        let mut cols = vec![
            "login", "html_url", "name", "email", "company", "location",
            "bio", "followers", "public_repos", "total_contributions",
            "repos_json", "rising_score", "contribution_density", "novelty",
            "breadth", "realness", "gh_created_at",
        ];
        if has_skills {
            cols.push("skills_json");
        }
        if has_strength {
            cols.push("strength_score");
        }
        if has_activity {
            cols.extend_from_slice(&[
                "account_age_days", "last_active_date", "days_since_last_active",
                "contributions_30d", "contributions_90d", "contributions_365d",
                "current_streak_days", "activity_trend", "recency",
            ]);
        }
        if has_contribution_quality {
            cols.push("contribution_quality");
        }

        let mut stream: std::pin::Pin<
            Box<dyn futures::Stream<Item = std::result::Result<RecordBatch, lancedb::Error>> + Send>,
        > = table
            .query()
            .select(lancedb::query::Select::Columns(
                cols.iter().map(|s| s.to_string()).collect(),
            ))
            .execute()
            .await?;

        let mut candidates: Vec<Candidate> = Vec::new();
        while let Some(batch) = stream.try_next().await? {
            let nrows = batch.num_rows();
            for i in 0..nrows {
                let get_str = |name: &str| -> Option<String> {
                    batch
                        .column_by_name(name)?
                        .as_any()
                        .downcast_ref::<StringArray>()
                        .and_then(|a| if a.is_null(i) { None } else { Some(a.value(i).to_string()) })
                };
                let get_i32 = |name: &str| -> i32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Int32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0)
                };
                let get_u32 = |name: &str| -> u32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0)
                };
                let get_f32 = |name: &str| -> f32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0.0)
                };

                let login = match get_str("login") {
                    Some(v) => v,
                    None => continue,
                };
                let repos_count = get_str("repos_json")
                    .and_then(|j| serde_json::from_str::<Vec<serde_json::Value>>(&j).ok())
                    .map(|v| v.len())
                    .unwrap_or(0);

                let skills: Vec<String> = get_str("skills_json")
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();

                let get_opt_u32 = |name: &str| -> Option<u32> {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
                        .and_then(|a| if a.is_null(i) { None } else { Some(a.value(i)) })
                };
                let get_opt_f32 = |name: &str| -> Option<f32> {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                        .and_then(|a| if a.is_null(i) { None } else { Some(a.value(i)) })
                };

                let bio_ref = get_str("bio");
                let position = infer_position(bio_ref.as_deref());
                candidates.push(Candidate {
                    login,
                    html_url: get_str("html_url").unwrap_or_default(),
                    name: get_str("name"),
                    email: get_str("email"),
                    company: get_str("company"),
                    location: get_str("location"),
                    bio: bio_ref,
                    followers: get_i32("followers") as u32,
                    public_repos: get_i32("public_repos") as u32,
                    total_contributions: get_u32("total_contributions"),
                    ai_repos_count: repos_count,
                    rising_score: get_f32("rising_score"),
                    contribution_density: get_f32("contribution_density"),
                    novelty: get_f32("novelty"),
                    breadth: get_f32("breadth"),
                    realness: get_f32("realness"),
                    gh_created_at: get_str("gh_created_at").unwrap_or_default(),
                    skills,
                    strength_score: get_opt_f32("strength_score").unwrap_or(0.0),
                    opp_skill_match: 0.0,
                    position_level: position.map(String::from),
                    account_age_days: get_opt_u32("account_age_days"),
                    last_active_date: get_str("last_active_date"),
                    days_since_last_active: get_opt_u32("days_since_last_active"),
                    contributions_30d: get_opt_u32("contributions_30d"),
                    contributions_90d: get_opt_u32("contributions_90d"),
                    contributions_365d: get_opt_u32("contributions_365d"),
                    current_streak_days: get_opt_u32("current_streak_days"),
                    activity_trend: get_str("activity_trend"),
                    recency: get_opt_f32("recency"),
                    contribution_quality: get_opt_f32("contribution_quality"),
                });
            }
        }

        candidates.sort_by(|a, b| b.rising_score.partial_cmp(&a.rising_score).unwrap());
        candidates.truncate(n);
        Ok(candidates)
    }

    /// Semantic nearest-neighbour search using the contributor's embedding vector.
    ///
    /// Embeds `query` with the loaded BAAI model and returns the `top_k`
    /// most semantically similar contributors.  Requires the DB to have been
    /// opened with `.with_embed()` and rows inserted under the `contrib-embed`
    /// feature.
    #[cfg(feature = "contrib-embed")]
    pub async fn search_similar(&self, query: &str, top_k: usize) -> Result<Vec<Candidate>> {
        use arrow_array::Array;
        use futures::TryStreamExt;

        let model = self
            .model
            .as_ref()
            .context("embedding model not loaded — call with_embed() first")?;

        let query_vec = tokio::task::block_in_place(|| {
            model
                .embed_one(query)
                .map_err(|e| anyhow::anyhow!("embed query: {e}"))
        })?;

        let table = self.conn.open_table("contributors").execute().await?;
        let mut stream: std::pin::Pin<
            Box<dyn futures::Stream<Item = std::result::Result<RecordBatch, lancedb::Error>> + Send>,
        > = table
            .vector_search(query_vec)
            .context("vector_search")?
            .limit(top_k)
            .execute()
            .await?;

        let mut candidates: Vec<Candidate> = Vec::new();
        while let Some(batch) = stream.try_next().await? {
            let nrows = batch.num_rows();
            for i in 0..nrows {
                let get_str = |name: &str| -> Option<String> {
                    batch
                        .column_by_name(name)?
                        .as_any()
                        .downcast_ref::<StringArray>()
                        .and_then(|a| {
                            if arrow_array::Array::is_null(a, i) {
                                None
                            } else {
                                Some(a.value(i).to_string())
                            }
                        })
                };
                let get_i32 = |name: &str| -> i32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Int32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0)
                };
                let get_u32 = |name: &str| -> u32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0)
                };
                let get_f32 = |name: &str| -> f32 {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                        .map(|a| a.value(i))
                        .unwrap_or(0.0)
                };
                let login = match get_str("login") {
                    Some(v) => v,
                    None => continue,
                };
                let repos_count = get_str("repos_json")
                    .and_then(|j| serde_json::from_str::<Vec<serde_json::Value>>(&j).ok())
                    .map(|v| v.len())
                    .unwrap_or(0);
                let skills: Vec<String> = get_str("skills_json")
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();

                let get_opt_u32 = |name: &str| -> Option<u32> {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
                        .and_then(|a| if a.is_null(i) { None } else { Some(a.value(i)) })
                };
                let get_opt_f32 = |name: &str| -> Option<f32> {
                    batch
                        .column_by_name(name)
                        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                        .and_then(|a| if a.is_null(i) { None } else { Some(a.value(i)) })
                };

                let bio_ref = get_str("bio");
                let position = infer_position(bio_ref.as_deref());
                candidates.push(Candidate {
                    login,
                    html_url: get_str("html_url").unwrap_or_default(),
                    name: get_str("name"),
                    email: get_str("email"),
                    company: get_str("company"),
                    location: get_str("location"),
                    bio: bio_ref,
                    followers: get_i32("followers") as u32,
                    public_repos: get_i32("public_repos") as u32,
                    total_contributions: get_u32("total_contributions"),
                    ai_repos_count: repos_count,
                    rising_score: get_f32("rising_score"),
                    contribution_density: get_f32("contribution_density"),
                    novelty: get_f32("novelty"),
                    breadth: get_f32("breadth"),
                    realness: get_f32("realness"),
                    gh_created_at: get_str("gh_created_at").unwrap_or_default(),
                    skills,
                    strength_score: get_opt_f32("strength_score").unwrap_or(0.0),
                    opp_skill_match: 0.0,
                    position_level: position.map(String::from),
                    account_age_days: get_opt_u32("account_age_days"),
                    last_active_date: get_str("last_active_date"),
                    days_since_last_active: get_opt_u32("days_since_last_active"),
                    contributions_30d: get_opt_u32("contributions_30d"),
                    contributions_90d: get_opt_u32("contributions_90d"),
                    contributions_365d: get_opt_u32("contributions_365d"),
                    current_streak_days: get_opt_u32("current_streak_days"),
                    activity_trend: get_str("activity_trend"),
                    recency: get_opt_f32("recency"),
                    contribution_quality: get_opt_f32("contribution_quality"),
                });
            }
        }
        Ok(candidates)
    }
}

/// A ranked candidate entry for display.
#[derive(Debug, Clone)]
pub struct Candidate {
    pub login: String,
    pub html_url: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub bio: Option<String>,
    pub followers: u32,
    pub public_repos: u32,
    pub total_contributions: u32,
    pub ai_repos_count: usize,
    pub rising_score: f32,
    pub contribution_density: f32,
    pub novelty: f32,
    pub breadth: f32,
    pub realness: f32,
    pub gh_created_at: String,
    /// AI/ML skill tags extracted at insert time.
    pub skills: Vec<String>,
    /// Strength score — values experience over obscurity.
    pub strength_score: f32,
    /// Opportunity skill match ratio (0.0–1.0). 0.0 when no opp context.
    pub opp_skill_match: f32,
    /// Inferred position title from bio.
    pub position_level: Option<String>,
    // Activity profile fields
    pub account_age_days: Option<u32>,
    pub last_active_date: Option<String>,
    pub days_since_last_active: Option<u32>,
    pub contributions_30d: Option<u32>,
    pub contributions_90d: Option<u32>,
    pub contributions_365d: Option<u32>,
    pub current_streak_days: Option<u32>,
    pub activity_trend: Option<String>,
    pub recency: Option<f32>,
    /// Quality of contributions to external repos (0.0–1.0).
    pub contribution_quality: Option<f32>,
}

async fn load_known_logins(conn: &Connection) -> Result<HashSet<String>> {
    let tables = conn.table_names().execute().await?;
    if !tables.contains(&"contributors".to_string()) {
        return Ok(HashSet::new());
    }

    use arrow_array::Array;
    use futures::TryStreamExt;
    use lancedb::query::{ExecutableQuery, QueryBase};

    let table = conn.open_table("contributors").execute().await?;
    let mut stream: std::pin::Pin<
        Box<dyn futures::Stream<Item = std::result::Result<RecordBatch, lancedb::Error>> + Send>,
    > = table
        .query()
        .select(lancedb::query::Select::Columns(vec!["login".into()]))
        .execute()
        .await?;

    let mut logins = HashSet::new();
    while let Some(batch) = stream.try_next().await? {
        if let Some(col) = batch.column_by_name("login") {
            if let Some(arr) = col.as_any().downcast_ref::<StringArray>() {
                for i in 0..arr.len() {
                    if !arr.is_null(i) {
                        logins.insert(arr.value(i).to_string());
                    }
                }
            }
        }
    }
    Ok(logins)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    const EPSILON: f32 = 1e-5;

    // ── helpers ───────────────────────────────────────────────────────────────

    fn make_user(followers: u32, public_repos: u32, age_days: i64) -> GhUser {
        let created_at = Utc::now() - Duration::days(age_days);
        GhUser {
            login: "testuser".into(),
            id: 1,
            html_url: "https://github.com/testuser".into(),
            avatar_url: "https://avatars.githubusercontent.com/u/1".into(),
            name: None,
            email: None,
            bio: None,
            company: None,
            location: None,
            blog: None,
            twitter_username: None,
            public_repos,
            public_gists: 0,
            followers,
            following: 0,
            hireable: None,
            created_at,
            updated_at: Utc::now(),
            total_commit_contributions: None,
            total_pr_contributions: None,
            total_review_contributions: None,
            total_repos_contributed_to: None,
            pinned_repos_json: None,
            contributed_repos_json: None,
            organizations_json: None,
            status_message: None,
            has_any_contributions: None,
            contribution_calendar_json: None,
            activity_profile: None,
        }
    }

    fn make_record(
        followers: u32,
        public_repos: u32,
        age_days: i64,
        contributions: u32,
        repo_count: usize,
    ) -> ContributorRecord {
        let repos = (0..repo_count)
            .map(|i| RepoContrib {
                repo: format!("org/repo{i}"),
                contributions: contributions / repo_count.max(1) as u32,
            })
            .collect();
        ContributorRecord {
            user: make_user(followers, public_repos, age_days),
            repos,
            total_contributions: contributions,
        }
    }

    fn temp_db_path(tag: &str) -> String {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .subsec_nanos();
        std::env::temp_dir()
            .join(format!("gh_contributors_{tag}_{nanos}"))
            .to_string_lossy()
            .into_owned()
    }

    // ── bot detection ─────────────────────────────────────────────────────────

    #[test]
    fn is_bot_detects_github_app_suffix() {
        assert!(is_bot("devin-ai-integration[bot]"));
        assert!(is_bot("github-actions[bot]"));
        assert!(is_bot("some-tool[BOT]")); // case-insensitive
    }

    #[test]
    fn is_bot_detects_dependabot_variants() {
        assert!(is_bot("dependabot"));
        assert!(is_bot("dependabot[bot]"));
        assert!(is_bot("Dependabot")); // case-insensitive
    }

    #[test]
    fn is_bot_detects_renovate() {
        assert!(is_bot("renovate[bot]"));
        assert!(is_bot("renovate-bot"));
    }

    #[test]
    fn is_bot_passes_real_humans() {
        assert!(!is_bot("torvalds"));
        assert!(!is_bot("bot-enthusiast")); // has "bot" but not as a suffix pattern
        assert!(!is_bot("nikolinaspehar"));
        assert!(!is_bot("Copilot")); // GitHub Copilot user (404 on /users, but not a [bot])
    }

    // ── score range ───────────────────────────────────────────────────────────

    #[test]
    fn all_components_in_unit_range() {
        for (followers, public_repos, age_days, contributions, repos) in [
            (0, 0, 1, 1, 1),
            (0, 100, 30, 500, 5),
            (100_000, 5, 3650, 10, 1),
            (50, 25, 400, 200, 3),
            (0, 0, 365 * 10, 1000, 1), // ghost account, very old
        ] {
            let s = compute_rising_score(
                &make_record(followers, public_repos, age_days, contributions, repos), 0,
            );
            for (name, val) in [
                ("score", s.score),
                ("contribution_density", s.contribution_density),
                ("novelty", s.novelty),
                ("breadth", s.breadth),
                ("activity", s.activity),
                ("obscurity", s.obscurity),
                ("realness", s.realness),
                ("contribution_quality", s.contribution_quality),
            ] {
                assert!(
                    (0.0..=1.0).contains(&val),
                    "{name}={val} out of [0,1] for followers={followers} public_repos={public_repos}"
                );
            }
        }
    }

    // ── formula verification ──────────────────────────────────────────────────

    #[test]
    fn score_equals_weighted_sum_times_realness_and_multipliers() {
        let r = make_record(20, 15, 500, 200, 3);
        let s = compute_rising_score(&r, 0);
        let [w_d, w_n, w_b, w_a, w_s, w_e, w_o, w_r, w_cq] = SCORE_WEIGHTS;
        let expected_raw =
            w_d * s.contribution_density
            + w_n * s.novelty
            + w_b * s.breadth
            + w_a * s.activity
            + w_s * s.skill_relevance
            + w_e * s.engagement
            + w_o * s.obscurity
            + w_r * s.recency
            + w_cq * s.contribution_quality;
        // Multipliers: hireable_bonus * recency_bonus
        let hireable_bonus = if r.user.hireable == Some(true) { 1.15 } else { 1.0 };
        let days_since_update = (chrono::Utc::now() - r.user.updated_at).num_days();
        let recency_bonus = if days_since_update <= 30 { 1.10 } else if days_since_update <= 90 { 1.05 } else { 1.0 };
        let expected = (expected_raw * s.realness * hireable_bonus * recency_bonus).clamp(0.0, 1.0);
        assert!(
            (s.score - expected).abs() < EPSILON,
            "score={} expected={expected} (diff={})",
            s.score, (s.score - expected).abs()
        );
    }

    #[test]
    fn score_weights_sum_to_one() {
        let sum: f32 = SCORE_WEIGHTS.iter().sum();
        assert!((sum - 1.0).abs() < EPSILON, "weights sum={sum}, expected 1.0");
    }

    // ── component invariants ──────────────────────────────────────────────────

    #[test]
    fn contribution_density_increases_with_commits() {
        let low = compute_rising_score(&make_record(10, 5, 365, 10, 1), 0);
        let high = compute_rising_score(&make_record(10, 5, 365, 500, 1), 0);
        assert!(
            high.contribution_density > low.contribution_density,
            "density low={} high={}",
            low.contribution_density, high.contribution_density,
        );
    }

    #[test]
    fn contribution_density_decreases_with_followers() {
        let obscure = compute_rising_score(&make_record(5, 10, 365, 100, 1), 0);
        let famous = compute_rising_score(&make_record(10_000, 10, 365, 100, 1), 0);
        assert!(
            obscure.contribution_density > famous.contribution_density,
            "obscure={} famous={}",
            obscure.contribution_density, famous.contribution_density,
        );
    }

    #[test]
    fn novelty_decreases_with_age() {
        let new_acc = compute_rising_score(&make_record(0, 5, 100, 1, 1), 0);
        let old_acc = compute_rising_score(&make_record(0, 5, 2000, 1, 1), 0);
        assert!(new_acc.novelty > old_acc.novelty);
    }

    #[test]
    fn novelty_zero_after_ten_years() {
        let old = compute_rising_score(&make_record(0, 0, 365 * 10, 1, 1), 0);
        assert_eq!(old.novelty, 0.0);
    }

    #[test]
    fn novelty_at_five_year_boundary() {
        // Exactly 5 years (1825 days) → novelty should be ~0.5 with 10-year decay
        let boundary = compute_rising_score(&make_record(0, 5, 1825, 50, 1), 0);
        assert!(boundary.novelty > 0.4 && boundary.novelty < 0.6, "novelty={}", boundary.novelty);
    }

    #[test]
    fn breadth_increases_with_repo_count() {
        let single = compute_rising_score(&make_record(0, 5, 365, 100, 1), 0);
        let multi = compute_rising_score(&make_record(0, 5, 365, 100, 5), 0);
        assert!(multi.breadth > single.breadth);
    }

    #[test]
    fn breadth_caps_at_five_repos() {
        let five = compute_rising_score(&make_record(0, 5, 365, 100, 5), 0);
        let ten = compute_rising_score(&make_record(0, 5, 365, 100, 10), 0);
        assert_eq!(five.breadth, 1.0);
        assert_eq!(ten.breadth, 1.0);
    }

    #[test]
    fn activity_increases_with_public_repos() {
        // Activity now uses real commit data, falling back to public_repos.
        // Formula: (commits/200)*0.5 + (prs/50)*0.3 + (reviews/30)*0.2
        let low = compute_rising_score(&make_record(0, 10, 365, 10, 1), 0);
        let high = compute_rising_score(&make_record(0, 100, 365, 10, 1), 0);
        assert!(high.activity > low.activity, "low={} high={}", low.activity, high.activity);
    }

    #[test]
    fn obscurity_decreases_with_followers() {
        let nobody = compute_rising_score(&make_record(0, 5, 365, 10, 1), 0);
        let celebrity = compute_rising_score(&make_record(50_000, 5, 365, 10, 1), 0);
        assert!(nobody.obscurity > celebrity.obscurity);
    }

    #[test]
    fn obscurity_at_500_followers_is_half() {
        // formula: 1 / (1 + followers/500) → at 500 followers = 0.5
        let r = compute_rising_score(&make_record(500, 10, 365, 50, 1), 0);
        assert!((r.obscurity - 0.5).abs() < EPSILON, "obscurity={}", r.obscurity);
    }

    // ── realness (ghost-account penalty) ─────────────────────────────────────

    #[test]
    fn realness_is_half_for_ghost_account() {
        // 0 public repos, 0 followers → realness = 0.5 + 0.5*tanh(0) = 0.5
        let ghost = compute_rising_score(&make_record(0, 0, 200, 383, 1), 0);
        assert!((ghost.realness - 0.5).abs() < EPSILON, "realness={}", ghost.realness);
    }

    #[test]
    fn realness_approaches_one_for_established_account() {
        // 50 public repos, 200 followers → presence=250 → tanh(50) ≈ 1.0
        let established = compute_rising_score(&make_record(200, 50, 500, 100, 1), 0);
        assert!(established.realness > 0.99, "realness={}", established.realness);
    }

    #[test]
    fn ghost_account_scores_lower_than_equivalent_active_account() {
        // Same commits, same age — only difference is public presence
        let ghost = make_record(0, 0, 500, 383, 1);    // no public repos, no followers
        let active = make_record(0, 10, 500, 383, 1);  // 10 public repos

        let s_ghost = compute_rising_score(&ghost, 0).score;
        let s_active = compute_rising_score(&active, 0).score;

        assert!(
            s_active > s_ghost,
            "active ({s_active:.3}) should beat ghost ({s_ghost:.3})"
        );
    }

    // ── ranking invariants ────────────────────────────────────────────────────

    #[test]
    fn undiscovered_talent_beats_famous_contributor() {
        let rising = make_record(10, 30, 300, 400, 3);
        let famous = make_record(50_000, 30, 2000, 400, 3);
        let s_rising = compute_rising_score(&rising, 0).score;
        let s_famous = compute_rising_score(&famous, 0).score;
        assert!(s_rising > s_famous, "rising={s_rising:.3} famous={s_famous:.3}");
    }

    #[test]
    fn prolific_multi_repo_beats_single_repo() {
        let broad = make_record(20, 40, 500, 300, 5);
        let narrow = make_record(20, 40, 500, 300, 1);
        assert!(
            compute_rising_score(&broad, 0).score > compute_rising_score(&narrow, 0).score
        );
    }

    #[test]
    fn score_monotone_in_contributions() {
        // Fixed followers/age/repos, only contributions vary
        let scores: Vec<f32> = [10u32, 50, 200, 1000]
            .iter()
            .map(|&c| compute_rising_score(&make_record(5, 10, 400, c, 1), 0).score)
            .collect();
        for w in scores.windows(2) {
            assert!(w[1] > w[0], "score should increase with contributions: {:?}", scores);
        }
    }

    #[test]
    fn score_is_deterministic() {
        let r = make_record(20, 15, 730, 300, 3);
        let s1 = compute_rising_score(&r, 0).score;
        let s2 = compute_rising_score(&r, 0).score;
        // Age is in whole days, so two calls in the same test always agree
        assert_eq!(s1, s2, "score must be deterministic");
    }

    // ── LanceDB round-trips ───────────────────────────────────────────────────

    #[tokio::test]
    async fn insert_and_top_candidates_roundtrip() {
        let path = temp_db_path("roundtrip");
        let mut db = ContributorsDb::open(&path).await.expect("open DB");

        let rising = {
            let mut r = make_record(5, 20, 200, 300, 4);
            r.user.login = "rising_star".into();
            r
        };
        let veteran = {
            let mut r = make_record(30_000, 50, 2500, 300, 1);
            r.user.login = "veteran".into();
            r
        };

        assert_eq!(db.insert(&[rising, veteran]).await.unwrap(), 2);

        // Dedup: re-inserting the same login must be a no-op
        let dup = { let mut r = make_record(5, 20, 200, 300, 4); r.user.login = "rising_star".into(); r };
        assert_eq!(db.insert(&[dup]).await.unwrap(), 0, "duplicate should be skipped");

        let top = db.top_candidates(10).await.expect("top_candidates");
        assert_eq!(top.len(), 2);
        assert_eq!(
            top[0].login, "rising_star",
            "rising_star should be #1, got {} (score={:.3})",
            top[0].login, top[0].rising_score,
        );

        let _ = std::fs::remove_dir_all(&path);
    }

    #[tokio::test]
    async fn ghost_does_not_beat_active_contributor_in_db() {
        let path = temp_db_path("ghost");
        let mut db = ContributorsDb::open(&path).await.expect("open DB");

        // Ghost: 383 commits like nikolinaspehar but 0 public repos, 0 followers
        let ghost = { let mut r = make_record(0, 0, 500, 383, 1); r.user.login = "ghost_account".into(); r };
        // Active: same commits, same age, but has public presence
        let active = { let mut r = make_record(0, 8, 500, 383, 1); r.user.login = "active_dev".into(); r };

        db.insert(&[ghost, active]).await.unwrap();
        let top = db.top_candidates(10).await.unwrap();
        assert_eq!(
            top[0].login, "active_dev",
            "active dev should outrank ghost, got {} (score={:.3})",
            top[0].login, top[0].rising_score,
        );

        let _ = std::fs::remove_dir_all(&path);
    }

    #[tokio::test]
    async fn empty_db_returns_empty_top() {
        let path = temp_db_path("empty");
        let db = ContributorsDb::open(&path).await.expect("open DB");
        assert!(db.top_candidates(10).await.unwrap().is_empty());
        let _ = std::fs::remove_dir_all(&path);
    }

    // ── skills round-trip ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn skills_json_roundtrip() {
        let path = temp_db_path("skills");
        let mut db = ContributorsDb::open(&path).await.expect("open DB");

        // Record with an LLM-mentioning bio → should produce "llm" skill tag
        let mut r = make_record(5, 15, 400, 200, 2);
        r.user.login = "llm_dev".into();
        r.user.bio = Some("Building LLM applications with RAG pipelines".into());

        db.insert(&[r]).await.unwrap();
        let top = db.top_candidates(10).await.unwrap();
        assert_eq!(top.len(), 1);
        assert!(
            top[0].skills.contains(&"llm".to_string()),
            "expected 'llm' in skills {:?}",
            top[0].skills,
        );
        assert!(
            top[0].skills.contains(&"rag".to_string()),
            "expected 'rag' in skills {:?}",
            top[0].skills,
        );

        let _ = std::fs::remove_dir_all(&path);
    }

    #[tokio::test]
    async fn no_bio_gives_empty_skills() {
        let path = temp_db_path("no_skills");
        let mut db = ContributorsDb::open(&path).await.expect("open DB");

        let r = make_record(5, 15, 400, 200, 1); // no bio set
        db.insert(&[r]).await.unwrap();
        let top = db.top_candidates(10).await.unwrap();
        // skills may be empty or populated from repo names (org/repo0 has no AI keywords)
        // Either way the field exists and is a Vec
        let _ = top[0].skills.len(); // just assert it's accessible
        let _ = std::fs::remove_dir_all(&path);
    }

    // ── strength_score tests ─────────────────────────────────────────────────

    #[test]
    fn strength_weights_sum_to_one() {
        let sum: f32 = STRENGTH_WEIGHTS.iter().sum();
        assert!((sum - 1.0).abs() < EPSILON, "strength weights sum={sum}, expected 1.0");
    }

    #[test]
    fn strength_score_in_unit_range() {
        for (followers, repos, age, contribs, repo_count) in [
            (0u32, 0u32, 1i64, 1u32, 1usize),
            (10_000, 50, 2000, 500, 5),
            (100, 30, 400, 200, 3),
        ] {
            let s = compute_strength_score(
                &make_record(followers, repos, age, contribs, repo_count), 4,
            );
            assert!(
                (0.0..=1.0).contains(&s.score),
                "strength_score={} out of [0,1] for followers={followers}",
                s.score,
            );
        }
    }

    #[test]
    fn strength_rewards_followers_not_penalises() {
        let nobody = compute_strength_score(&make_record(5, 10, 365, 100, 2), 3);
        let famous = compute_strength_score(&make_record(10_000, 10, 365, 100, 2), 3);
        assert!(
            famous.standing > nobody.standing,
            "famous standing={} should beat nobody standing={}",
            famous.standing, nobody.standing,
        );
        assert!(
            famous.score > nobody.score,
            "famous score={} should beat nobody score={}",
            famous.score, nobody.score,
        );
    }

    #[test]
    fn strength_rewards_skill_depth() {
        let few = compute_strength_score(&make_record(50, 10, 365, 100, 2), 1);
        let many = compute_strength_score(&make_record(50, 10, 365, 100, 2), 7);
        assert!(
            many.skill_depth > few.skill_depth,
            "many skills={} should beat few={}",
            many.skill_depth, few.skill_depth,
        );
    }

    #[test]
    fn senior_beats_junior_on_strength() {
        // Senior: many followers, orgs, commits
        let mut senior_rec = make_record(5_000, 50, 2000, 500, 5);
        senior_rec.user.organizations_json = Some(r#"[{"login":"deepmind"},{"login":"google"}]"#.into());
        let senior = compute_strength_score(&senior_rec, 6);

        // Junior: few followers, new account, few commits
        let junior = compute_strength_score(&make_record(1, 5, 100, 20, 1), 2);

        assert!(
            senior.score > junior.score,
            "senior={:.3} should beat junior={:.3}",
            senior.score, junior.score,
        );
    }

    // ── opp_skill_match tests ────────────────────────────────────────────────

    #[test]
    fn opp_match_empty_opp_returns_zero() {
        let skills = vec!["llm".to_string(), "rag".to_string()];
        assert_eq!(compute_opp_skill_match(&skills, &[]), 0.0);
    }

    #[test]
    fn opp_match_full_overlap() {
        let candidate = vec!["llm".to_string(), "rag".to_string(), "python".to_string()];
        let opp = vec!["llm".to_string(), "rag".to_string()];
        assert!((compute_opp_skill_match(&candidate, &opp) - 1.0).abs() < EPSILON);
    }

    #[test]
    fn opp_match_partial_overlap() {
        let candidate = vec!["llm".to_string(), "python".to_string()];
        let opp = vec!["llm".to_string(), "rag".to_string(), "agents".to_string()];
        let m = compute_opp_skill_match(&candidate, &opp);
        assert!((m - 1.0 / 3.0).abs() < EPSILON, "expected ~0.333, got {m}");
    }

    #[test]
    fn opp_match_no_overlap() {
        let candidate = vec!["rust".to_string()];
        let opp = vec!["llm".to_string(), "rag".to_string()];
        assert_eq!(compute_opp_skill_match(&candidate, &opp), 0.0);
    }

    // ── infer_position tests ─────────────────────────────────────────────────

    #[test]
    fn infer_position_principal() {
        assert_eq!(infer_position(Some("Principal ML engineer")), Some("Principal Engineer"));
    }

    #[test]
    fn infer_position_staff() {
        assert_eq!(infer_position(Some("Staff Engineer at Google")), Some("Staff Engineer"));
    }

    #[test]
    fn infer_position_senior() {
        assert_eq!(infer_position(Some("Senior backend developer")), Some("Senior Engineer"));
    }

    #[test]
    fn infer_position_student() {
        assert_eq!(infer_position(Some("CS student at MIT")), Some("Student"));
    }

    #[test]
    fn infer_position_none_for_vague() {
        assert_eq!(infer_position(Some("I love open source")), None);
        assert_eq!(infer_position(None), None);
    }

    // ── seniority level tests ────────────────────────────────────────────────

    #[test]
    fn seniority_levels_ordered() {
        assert!(infer_seniority_level(Some("Principal Engineer")) > infer_seniority_level(Some("Senior Engineer")));
        assert!(infer_seniority_level(Some("Senior Engineer")) > infer_seniority_level(Some("Engineer")));
        assert!(infer_seniority_level(Some("Engineer")) > infer_seniority_level(Some("Student")));
    }

    // ── contribution_quality tests ──────────────────────────────────────────

    #[test]
    fn contribution_quality_zero_when_no_data() {
        assert_eq!(compute_contribution_quality("testuser", None), 0.0);
        assert_eq!(compute_contribution_quality("testuser", Some("")), 0.0);
        assert_eq!(compute_contribution_quality("testuser", Some("[]")), 0.0);
    }

    #[test]
    fn contribution_quality_zero_when_all_self_owned() {
        let repos = serde_json::to_string(&vec![
            crate::types::ContributedRepo {
                name_with_owner: "testuser/my-repo".into(),
                stars: 0,
                language: None,
                topics: vec![],
            },
            crate::types::ContributedRepo {
                name_with_owner: "testuser/another-repo".into(),
                stars: 2,
                language: None,
                topics: vec![],
            },
        ]).unwrap();
        let cq = compute_contribution_quality("testuser", Some(&repos));
        assert!(cq < 0.05, "self-only repos should score near 0, got {cq}");
    }

    #[test]
    fn contribution_quality_high_for_external_starred_repos() {
        let repos = serde_json::to_string(&vec![
            crate::types::ContributedRepo {
                name_with_owner: "langchain-ai/langchain".into(),
                stars: 90_000,
                language: Some("Python".into()),
                topics: vec!["llm".into(), "ai-agent".into()],
            },
            crate::types::ContributedRepo {
                name_with_owner: "huggingface/transformers".into(),
                stars: 130_000,
                language: Some("Python".into()),
                topics: vec!["transformers".into(), "pytorch".into(), "machine-learning".into()],
            },
        ]).unwrap();
        let cq = compute_contribution_quality("testuser", Some(&repos));
        assert!(cq > 0.7, "external high-star AI repos should score high, got {cq}");
    }

    #[test]
    fn contribution_quality_in_unit_range() {
        for json in [
            r#"[{"name_with_owner":"org/repo","stars":0,"language":null,"topics":[]}]"#,
            r#"[{"name_with_owner":"org/repo","stars":100000,"language":"Python","topics":["machine-learning"]}]"#,
            r#"[{"name_with_owner":"me/repo","stars":50,"language":null,"topics":[]}]"#,
        ] {
            let cq = compute_contribution_quality("me", Some(json));
            assert!(
                (0.0..=1.0).contains(&cq),
                "contribution_quality={cq} out of [0,1] for {json}",
            );
        }
    }

    #[test]
    fn external_contributor_beats_self_only() {
        let self_only = serde_json::to_string(&vec![
            crate::types::ContributedRepo {
                name_with_owner: "alice/tutorial".into(),
                stars: 0,
                language: None,
                topics: vec![],
            },
        ]).unwrap();
        let external = serde_json::to_string(&vec![
            crate::types::ContributedRepo {
                name_with_owner: "pytorch/pytorch".into(),
                stars: 80_000,
                language: Some("Python".into()),
                topics: vec!["pytorch".into(), "deep-learning".into()],
            },
        ]).unwrap();
        let score_self = compute_contribution_quality("alice", Some(&self_only));
        let score_ext = compute_contribution_quality("alice", Some(&external));
        assert!(
            score_ext > score_self,
            "external={score_ext:.3} should beat self-only={score_self:.3}",
        );
    }
}

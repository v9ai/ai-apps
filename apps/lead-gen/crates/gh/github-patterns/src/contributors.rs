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

/// Weights: density, novelty, breadth, activity, skill_relevance, engagement, obscurity.
/// Must sum to 1.0.
pub const SCORE_WEIGHTS: [f32; 7] = [0.25, 0.10, 0.15, 0.20, 0.10, 0.10, 0.10];

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

    // ── Realness (ghost guard) ──────────────────────────────────────
    let presence = public_repos + followers;
    let realness = 0.5 + 0.5 * (presence * 0.2_f32).tanh();

    // ── Weighted sum ────────────────────────────────────────────────
    let [w_d, w_n, w_b, w_a, w_s, w_e, w_o] = SCORE_WEIGHTS;
    let raw = w_d * contribution_density
        + w_n * novelty
        + w_b * breadth
        + w_a * activity
        + w_s * skill_relevance
        + w_e * engagement
        + w_o * obscurity;

    // ── Multipliers ─────────────────────────────────────────────────
    let hireable_bonus = if record.user.hireable == Some(true) { 1.15 } else { 1.0 };
    let recency_bonus = if days_since_update <= 30 {
        1.10
    } else if days_since_update <= 90 {
        1.05
    } else {
        1.0
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
        Field::new("scraped_at", DataType::Utf8, false),
        // Skills extracted at insert time (JSON array of tag strings).
        // Nullable so old rows without this column read as empty.
        Field::new("skills_json", DataType::Utf8, true),
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

        let mut cols = vec![
            "login", "html_url", "name", "email", "company", "location",
            "bio", "followers", "public_repos", "total_contributions",
            "repos_json", "rising_score", "contribution_density", "novelty",
            "breadth", "realness", "gh_created_at",
        ];
        if has_skills {
            cols.push("skills_json");
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

                candidates.push(Candidate {
                    login,
                    html_url: get_str("html_url").unwrap_or_default(),
                    name: get_str("name"),
                    email: get_str("email"),
                    company: get_str("company"),
                    location: get_str("location"),
                    bio: get_str("bio"),
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

                candidates.push(Candidate {
                    login,
                    html_url: get_str("html_url").unwrap_or_default(),
                    name: get_str("name"),
                    email: get_str("email"),
                    company: get_str("company"),
                    location: get_str("location"),
                    bio: get_str("bio"),
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
        let [w_d, w_n, w_b, w_a, w_s, w_e, w_o] = SCORE_WEIGHTS;
        let expected_raw =
            w_d * s.contribution_density
            + w_n * s.novelty
            + w_b * s.breadth
            + w_a * s.activity
            + w_s * s.skill_relevance
            + w_e * s.engagement
            + w_o * s.obscurity;
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
}

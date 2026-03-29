use std::collections::HashSet;
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    BooleanArray, Float32Array, Int32Array, Int64Array, RecordBatch, StringArray, UInt32Array,
};
use arrow_schema::{DataType, Field, Schema};
use lancedb::{connect, Connection};

use crate::types::GhUser;

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
    /// Active builder signal: public repos (normalised, caps at 50).
    pub activity: f32,
    /// Inverse-fame penalty: 1 / (1 + followers / 500).
    pub obscurity: f32,
}

/// Compute rising-star score for a contributor.
///
/// Formula rewards: low followers + high commits + new account + multi-repo breadth.
pub fn compute_rising_score(record: &ContributorRecord) -> RisingScore {
    let followers = record.user.followers as f32;
    let total_contributions = record.total_contributions as f32;
    let public_repos = record.user.public_repos as f32;
    let repos_count = record.repos.len() as f32;

    let account_age_days = {
        let now = chrono::Utc::now();
        (now - record.user.created_at).num_days().max(1) as f32
    };

    // High contributions relative to current fame
    let contribution_density = (total_contributions / (followers + 1.0)).tanh() * 50.0_f32.recip();
    let contribution_density = contribution_density.min(1.0);

    // Newer = more "rising" potential (linear decay over 5 years)
    let novelty = (1.0 - account_age_days / (365.0 * 5.0)).max(0.0);

    // Breadth: contributing to multiple AI repos (cap at 5)
    let breadth = (repos_count / 5.0).min(1.0);

    // Builder signal: public repos capped at 50
    let activity = (public_repos / 50.0).min(1.0);

    // Obscurity bonus: less famous = more "rising"
    let obscurity = 1.0 / (1.0 + followers / 500.0);

    let score = 0.35 * contribution_density
        + 0.25 * novelty
        + 0.20 * breadth
        + 0.10 * activity
        + 0.10 * obscurity;

    RisingScore {
        score: score.clamp(0.0, 1.0),
        contribution_density,
        novelty,
        breadth,
        activity,
        obscurity,
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
        Field::new("scraped_at", DataType::Utf8, false),
    ]))
}

pub struct ContributorsDb {
    conn: Connection,
    /// Logins already present — used to deduplicate within + across runs.
    known: HashSet<String>,
}

impl ContributorsDb {
    pub async fn open(path: &str) -> Result<Self> {
        let conn = connect(path).execute().await.context("open LanceDB")?;
        let known = load_known_logins(&conn).await?;
        tracing::info!("loaded {} existing contributor logins", known.len());
        let db = Self { conn, known };
        db.ensure_table().await?;
        Ok(db)
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

        let scores: Vec<RisingScore> = new.iter().map(|r| compute_rising_score(r)).collect();
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
                Arc::new(StringArray::from_iter_values(
                    std::iter::repeat(now.as_str()).take(n),
                )),
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
    pub async fn top_rising(&self, n: usize) -> Result<Vec<RisingStar>> {
        use arrow_array::Array;
        use futures::TryStreamExt;
        use lancedb::query::{ExecutableQuery, QueryBase};

        let table = self.conn.open_table("contributors").execute().await?;
        let cols = vec![
            "login", "html_url", "name", "email", "company", "location",
            "bio", "followers", "public_repos", "total_contributions",
            "repos_json", "rising_score", "contribution_density", "novelty",
            "breadth", "gh_created_at",
        ];
        let mut stream: std::pin::Pin<
            Box<dyn futures::Stream<Item = std::result::Result<RecordBatch, lancedb::Error>> + Send>,
        > = table
            .query()
            .select(lancedb::query::Select::Columns(
                cols.iter().map(|s| s.to_string()).collect(),
            ))
            .execute()
            .await?;

        let mut stars: Vec<RisingStar> = Vec::new();
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

                stars.push(RisingStar {
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
                    gh_created_at: get_str("gh_created_at").unwrap_or_default(),
                });
            }
        }

        stars.sort_by(|a, b| b.rising_score.partial_cmp(&a.rising_score).unwrap());
        stars.truncate(n);
        Ok(stars)
    }
}

/// A ranked rising-star entry for display.
#[derive(Debug, Clone)]
pub struct RisingStar {
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
    pub gh_created_at: String,
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

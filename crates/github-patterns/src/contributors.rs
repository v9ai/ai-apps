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

/// Weights for each score component: (density, novelty, breadth, activity, obscurity).
/// Must sum to 1.0.
pub const SCORE_WEIGHTS: (f32, f32, f32, f32, f32) = (0.35, 0.25, 0.20, 0.10, 0.10);

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
    /// Active builder signal: public repos (normalised, caps at 50).
    pub activity: f32,
    /// Inverse-fame penalty: 1 / (1 + followers / 500).
    pub obscurity: f32,
    /// Ghost-account penalty: 0.0 when public_repos == 0 && followers == 0,
    /// scaling to 1.0 as the account shows real activity.
    pub realness: f32,
}

/// Compute rising-star score for a contributor.
///
/// Formula rewards: low followers + high commits + new account + multi-repo breadth.
/// Ghost accounts (0 public repos, 0 followers) are penalised via `realness`.
pub fn compute_rising_score(record: &ContributorRecord) -> RisingScore {
    let followers = record.user.followers as f32;
    let total_contributions = record.total_contributions as f32;
    let public_repos = record.user.public_repos as f32;
    let repos_count = record.repos.len() as f32;

    let account_age_days = {
        let now = chrono::Utc::now();
        (now - record.user.created_at).num_days().max(1) as f32
    };

    // High contributions relative to current fame.
    // Normalise the raw ratio by 50 before tanh so the result lives in 0..1
    // across realistic ranges (50 commits / 0 followers → ~0.76).
    let contribution_density =
        ((total_contributions / (followers + 1.0)) * 50.0_f32.recip()).tanh();

    // Newer = more "rising" potential (linear decay over 5 years)
    let novelty = (1.0 - account_age_days / (365.0 * 5.0)).max(0.0);

    // Breadth: contributing to multiple AI repos (cap at 5)
    let breadth = (repos_count / 5.0).min(1.0);

    // Builder signal: public repos capped at 50
    let activity = (public_repos / 50.0).min(1.0);

    // Obscurity bonus: less famous = more "rising"
    let obscurity = 1.0 / (1.0 + followers / 500.0);

    // Ghost-account guard: require at least some public presence.
    // tanh(0) = 0, tanh(large) → 1; reaches 0.76 at public_repos+followers=1.
    let realness = ((public_repos + followers) * 0.1_f32.recip().recip()).tanh();

    let (w_d, w_n, w_b, w_a, w_o) = SCORE_WEIGHTS;
    let raw = w_d * contribution_density
        + w_n * novelty
        + w_b * breadth
        + w_a * activity
        + w_o * obscurity;

    RisingScore {
        score: (raw * realness).clamp(0.0, 1.0),
        contribution_density,
        novelty,
        breadth,
        activity,
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
                Arc::new(Float32Array::from_iter_values(
                    scores.iter().map(|s| s.realness),
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
            "breadth", "realness", "gh_created_at",
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
                    realness: get_f32("realness"),
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
    pub realness: f32,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

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

    // ── score range ───────────────────────────────────────────────────────────

    #[test]
    fn score_in_unit_range() {
        for (followers, public_repos, age_days, contributions, repos) in [
            (0, 0, 1, 1, 1),
            (0, 100, 30, 500, 5),
            (100_000, 5, 3650, 10, 1),
            (50, 25, 400, 200, 3),
        ] {
            let s = compute_rising_score(&make_record(followers, public_repos, age_days, contributions, repos));
            assert!(
                (0.0..=1.0).contains(&s.score),
                "score={} out of range for followers={followers} age_days={age_days}",
                s.score
            );
            assert!((0.0..=1.0).contains(&s.contribution_density));
            assert!((0.0..=1.0).contains(&s.novelty));
            assert!((0.0..=1.0).contains(&s.breadth));
            assert!((0.0..=1.0).contains(&s.activity));
            assert!((0.0..=1.0).contains(&s.obscurity));
        }
    }

    // ── component invariants ──────────────────────────────────────────────────

    #[test]
    fn contribution_density_increases_with_commits() {
        // Same followers, more contributions → higher density
        let low = compute_rising_score(&make_record(10, 5, 365, 10, 1));
        let high = compute_rising_score(&make_record(10, 5, 365, 500, 1));
        assert!(
            high.contribution_density > low.contribution_density,
            "expected density to rise with contributions: {} vs {}",
            low.contribution_density,
            high.contribution_density,
        );
    }

    #[test]
    fn contribution_density_decreases_with_followers() {
        // Same contributions, more followers → lower density
        let obscure = compute_rising_score(&make_record(5, 10, 365, 100, 1));
        let famous = compute_rising_score(&make_record(10_000, 10, 365, 100, 1));
        assert!(
            obscure.contribution_density > famous.contribution_density,
            "obscure={} should beat famous={}",
            obscure.contribution_density,
            famous.contribution_density,
        );
    }

    #[test]
    fn novelty_decreases_with_age() {
        let new_acc = compute_rising_score(&make_record(0, 0, 100, 1, 1));
        let old_acc = compute_rising_score(&make_record(0, 0, 2000, 1, 1));
        assert!(
            new_acc.novelty > old_acc.novelty,
            "newer account should have higher novelty: {} vs {}",
            new_acc.novelty,
            old_acc.novelty,
        );
    }

    #[test]
    fn novelty_zero_for_very_old_accounts() {
        // Account created 10 years ago → novelty should be 0
        let old = compute_rising_score(&make_record(0, 0, 365 * 10, 1, 1));
        assert_eq!(old.novelty, 0.0, "novelty should be 0 after 5+ years");
    }

    #[test]
    fn breadth_increases_with_repo_count() {
        let single = compute_rising_score(&make_record(0, 5, 365, 100, 1));
        let multi = compute_rising_score(&make_record(0, 5, 365, 100, 5));
        assert!(
            multi.breadth > single.breadth,
            "multi-repo should have higher breadth: {} vs {}",
            single.breadth,
            multi.breadth,
        );
    }

    #[test]
    fn breadth_caps_at_five_repos() {
        let five = compute_rising_score(&make_record(0, 5, 365, 100, 5));
        let ten = compute_rising_score(&make_record(0, 5, 365, 100, 10));
        assert_eq!(five.breadth, ten.breadth, "breadth should cap at 5 repos");
        assert_eq!(five.breadth, 1.0);
    }

    #[test]
    fn obscurity_decreases_with_followers() {
        let nobody = compute_rising_score(&make_record(0, 5, 365, 10, 1));
        let celebrity = compute_rising_score(&make_record(50_000, 5, 365, 10, 1));
        assert!(
            nobody.obscurity > celebrity.obscurity,
            "unknown person should score higher obscurity: {} vs {}",
            nobody.obscurity,
            celebrity.obscurity,
        );
    }

    // ── ranking invariants ────────────────────────────────────────────────────

    #[test]
    fn undiscovered_talent_beats_famous_contributor() {
        // High commits, low followers, new account
        let rising = make_record(10, 30, 300, 400, 3);
        // Same commits but huge follower count and old account
        let famous = make_record(50_000, 30, 2000, 400, 3);

        let s_rising = compute_rising_score(&rising).score;
        let s_famous = compute_rising_score(&famous).score;

        assert!(
            s_rising > s_famous,
            "rising star (score={s_rising:.3}) should beat famous (score={s_famous:.3})"
        );
    }

    #[test]
    fn prolific_multi_repo_beats_one_repo_same_followers() {
        let broad = make_record(20, 40, 500, 300, 5);
        let narrow = make_record(20, 40, 500, 300, 1);

        let s_broad = compute_rising_score(&broad).score;
        let s_narrow = compute_rising_score(&narrow).score;

        assert!(
            s_broad > s_narrow,
            "broad contributor (score={s_broad:.3}) should beat narrow (score={s_narrow:.3})"
        );
    }

    // ── LanceDB round-trip ────────────────────────────────────────────────────

    #[tokio::test]
    async fn insert_and_top_rising_roundtrip() {
        let dir = std::env::temp_dir().join(format!(
            "gh_contributors_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .subsec_nanos()
        ));

        let mut db = ContributorsDb::open(dir.to_str().unwrap())
            .await
            .expect("open DB");

        // Insert two records with different rising potential
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

        let inserted = db.insert(&[rising, veteran]).await.expect("insert");
        assert_eq!(inserted, 2);

        // Dedup: re-inserting the same logins should be a no-op
        let dup = {
            let mut r = make_record(5, 20, 200, 300, 4);
            r.user.login = "rising_star".into();
            r
        };
        let reinserted = db.insert(&[dup]).await.expect("insert dup");
        assert_eq!(reinserted, 0, "duplicate should be skipped");

        // Top rising: rising_star should rank above veteran
        let top = db.top_rising(10).await.expect("top_rising");
        assert_eq!(top.len(), 2);
        assert_eq!(
            top[0].login, "rising_star",
            "rising_star should be ranked first, got {} (score={:.3})",
            top[0].login,
            top[0].rising_score,
        );

        // Clean up
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn empty_db_returns_empty_top() {
        let dir = std::env::temp_dir().join(format!(
            "gh_contributors_empty_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .subsec_nanos()
        ));

        let db = ContributorsDb::open(dir.to_str().unwrap())
            .await
            .expect("open DB");
        let top = db.top_rising(10).await.expect("top_rising on empty DB");
        assert!(top.is_empty());

        let _ = std::fs::remove_dir_all(&dir);
    }
}

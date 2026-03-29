use std::collections::HashSet;
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    BooleanArray, Int32Array, Int64Array, RecordBatch, StringArray, UInt32Array,
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
        let conn = connect(path)
            .execute()
            .await
            .context("open LanceDB")?;

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

        let now = chrono::Utc::now().to_rfc3339();
        let n = new.len();
        let s = schema();

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
                    new.iter()
                        .map(|r| r.user.name.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.email.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.bio.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.company.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.location.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.blog.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    new.iter()
                        .map(|r| r.user.twitter_username.as_deref())
                        .collect::<Vec<_>>(),
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
                    new.iter()
                        .map(|r| r.user.hireable)
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    new.iter()
                        .map(|r| r.user.created_at.to_rfc3339())
                        .collect::<Vec<String>>()
                        .iter()
                        .map(String::as_str)
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    new.iter()
                        .map(|r| r.user.updated_at.to_rfc3339())
                        .collect::<Vec<String>>()
                        .iter()
                        .map(String::as_str)
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    new.iter()
                        .map(|r| serde_json::to_string(&r.repos).unwrap_or_default())
                        .collect::<Vec<String>>()
                        .iter()
                        .map(String::as_str)
                        .collect::<Vec<_>>(),
                )),
                Arc::new(UInt32Array::from_iter_values(
                    new.iter().map(|r| r.total_contributions),
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
}

async fn load_known_logins(conn: &Connection) -> Result<HashSet<String>> {
    let tables = conn.table_names().execute().await?;
    if !tables.contains(&"contributors".to_string()) {
        return Ok(HashSet::new());
    }

    let table = conn.open_table("contributors").execute().await?;
    let mut stream = table
        .query()
        .select(lancedb::query::Select::Columns(vec!["login".into()]))
        .execute()
        .await?;

    use futures::TryStreamExt;
    let mut logins = HashSet::new();
    while let Some(batch) = stream.try_next().await? {
        let col = batch
            .column_by_name("login")
            .and_then(|c| c.as_any().downcast_ref::<arrow_array::StringArray>());
        if let Some(arr) = col {
            for i in 0..arr.len() {
                if !arr.is_null(i) {
                    logins.insert(arr.value(i).to_string());
                }
            }
        }
    }
    Ok(logins)
}

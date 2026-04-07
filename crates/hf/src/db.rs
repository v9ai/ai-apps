use std::path::Path;

use rusqlite::{params, Connection};

use crate::error::Error;
use crate::types::{RepoInfo, RepoType};

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS hf_repos (
    repo_id       TEXT NOT NULL,
    repo_type     TEXT NOT NULL,
    sha           TEXT,
    last_modified TEXT,
    tags          TEXT,
    downloads     INTEGER,
    likes         INTEGER,
    library       TEXT,
    pipeline_tag  TEXT,
    extra         TEXT,
    synced_at     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (repo_id, repo_type)
);

CREATE INDEX IF NOT EXISTS idx_hf_repos_downloads
    ON hf_repos(repo_type, downloads DESC);

CREATE INDEX IF NOT EXISTS idx_hf_repos_likes
    ON hf_repos(repo_type, likes DESC);

CREATE INDEX IF NOT EXISTS idx_hf_repos_synced
    ON hf_repos(synced_at DESC);
";

const UPSERT: &str = "
INSERT INTO hf_repos (repo_id, repo_type, sha, last_modified, tags, downloads, likes, library, pipeline_tag, extra, synced_at)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
ON CONFLICT(repo_id, repo_type) DO UPDATE SET
    sha = excluded.sha,
    last_modified = excluded.last_modified,
    tags = excluded.tags,
    downloads = excluded.downloads,
    likes = excluded.likes,
    library = excluded.library,
    pipeline_tag = excluded.pipeline_tag,
    extra = excluded.extra,
    synced_at = excluded.synced_at
";

/// SQLite storage for HuggingFace repo metadata.
pub struct HfDb {
    conn: Connection,
}

impl HfDb {
    /// Open (or create) the database at the given path.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, Error> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
        conn.execute_batch(SCHEMA)?;
        Ok(Self { conn })
    }

    /// Open an in-memory database (useful for tests).
    pub fn open_in_memory() -> Result<Self, Error> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(SCHEMA)?;
        Ok(Self { conn })
    }

    /// Upsert a batch of repos in a single transaction. Returns the count inserted/updated.
    pub fn upsert_repos(&self, repos: &[RepoInfo], repo_type: RepoType) -> Result<usize, Error> {
        let tx = self.conn.unchecked_transaction()?;
        let mut stmt = tx.prepare_cached(UPSERT)?;
        let type_str = repo_type.as_str();
        let mut count = 0;

        for info in repos {
            let repo_id = info.repo_id.as_deref().or(info.id.as_deref()).unwrap_or("");
            if repo_id.is_empty() {
                continue;
            }
            let tags_json = info.tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default());
            let extra_str = if info.extra.is_null() {
                None
            } else {
                Some(info.extra.to_string())
            };

            stmt.execute(params![
                repo_id,
                type_str,
                info.sha,
                info.last_modified,
                tags_json,
                info.downloads.map(|d| d as i64),
                info.likes.map(|l| l as i64),
                info.library,
                info.pipeline_tag,
                extra_str,
            ])?;
            count += 1;
        }

        drop(stmt);
        tx.commit()?;
        Ok(count)
    }

    /// Query top repos by type, ordered by downloads descending.
    pub fn top_repos(&self, repo_type: RepoType, limit: usize) -> Result<Vec<RepoInfo>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT repo_id, sha, last_modified, tags, downloads, likes, library, pipeline_tag, extra
             FROM hf_repos WHERE repo_type = ?1
             ORDER BY downloads DESC LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![repo_type.as_str(), limit as i64], |row| {
            let tags_raw: Option<String> = row.get(3)?;
            let extra_raw: Option<String> = row.get(8)?;

            Ok(RepoInfo {
                id: None,
                repo_id: row.get(0)?,
                sha: row.get(1)?,
                last_modified: row.get(2)?,
                tags: tags_raw.and_then(|s| serde_json::from_str(&s).ok()),
                downloads: row.get::<_, Option<i64>>(4)?.map(|d| d as u64),
                likes: row.get::<_, Option<i64>>(5)?.map(|l| l as u64),
                library: row.get(6)?,
                pipeline_tag: row.get(7)?,
                extra: extra_raw
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or(serde_json::Value::Null),
            })
        })?;

        rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
    }

    /// Count repos of a given type.
    pub fn count(&self, repo_type: RepoType) -> Result<usize, Error> {
        let n: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM hf_repos WHERE repo_type = ?1",
            params![repo_type.as_str()],
            |row| row.get(0),
        )?;
        Ok(n as usize)
    }

    /// Direct access to the connection for custom queries.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upsert_and_query() {
        let db = HfDb::open_in_memory().unwrap();

        let repos = vec![
            RepoInfo {
                id: None,
                repo_id: Some("meta-llama/Llama-3-8B".into()),
                sha: None,
                last_modified: None,
                tags: Some(vec!["transformers".into(), "llama".into()]),
                downloads: Some(5_000_000),
                likes: Some(12_000),
                library: Some("transformers".into()),
                pipeline_tag: Some("text-generation".into()),
                extra: serde_json::Value::Null,
            },
            RepoInfo {
                id: None,
                repo_id: Some("openai/whisper-large-v3".into()),
                sha: None,
                last_modified: None,
                tags: Some(vec!["transformers".into(), "whisper".into()]),
                downloads: Some(3_000_000),
                likes: Some(8_000),
                library: Some("transformers".into()),
                pipeline_tag: Some("automatic-speech-recognition".into()),
                extra: serde_json::Value::Null,
            },
        ];

        let count = db.upsert_repos(&repos, RepoType::Model).unwrap();
        assert_eq!(count, 2);
        assert_eq!(db.count(RepoType::Model).unwrap(), 2);
        assert_eq!(db.count(RepoType::Dataset).unwrap(), 0);

        let top = db.top_repos(RepoType::Model, 10).unwrap();
        assert_eq!(top.len(), 2);
        assert_eq!(top[0].repo_id.as_deref(), Some("meta-llama/Llama-3-8B"));
        assert_eq!(top[0].downloads, Some(5_000_000));

        // Upsert again with updated downloads — should overwrite
        let updated = vec![RepoInfo {
            id: None,
            repo_id: Some("meta-llama/Llama-3-8B".into()),
            sha: None,
            last_modified: None,
            tags: None,
            downloads: Some(6_000_000),
            likes: Some(15_000),
            library: Some("transformers".into()),
            pipeline_tag: Some("text-generation".into()),
            extra: serde_json::Value::Null,
        }];
        db.upsert_repos(&updated, RepoType::Model).unwrap();
        assert_eq!(db.count(RepoType::Model).unwrap(), 2); // still 2, not 3
        let top = db.top_repos(RepoType::Model, 1).unwrap();
        assert_eq!(top[0].downloads, Some(6_000_000));
    }
}

use std::path::Path;

use rusqlite::{params, Connection};

use crate::error::Error;
use crate::types::{OrgSummary, RepoInfo, RepoType};

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS hf_repos (
    repo_id       TEXT NOT NULL,
    repo_type     TEXT NOT NULL,  -- 'model', 'dataset', 'space'
    author        TEXT,
    sha           TEXT,
    last_modified TEXT,
    created_at    TEXT,
    tags          TEXT,           -- JSON array
    downloads     INTEGER,
    likes         INTEGER,
    library       TEXT,
    pipeline_tag  TEXT,
    private       INTEGER,       -- 0/1
    gated         TEXT,           -- false | true | 'manual' | 'auto'
    disabled      INTEGER,
    description   TEXT,
    sdk           TEXT,           -- spaces only: gradio, streamlit, docker, static
    siblings      TEXT,           -- JSON array of {rfilename, size?}
    card_data     TEXT,           -- JSON blob of parsed YAML frontmatter
    extra         TEXT,           -- JSON blob for everything else
    synced_at     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (repo_id, repo_type)
);

CREATE INDEX IF NOT EXISTS idx_hf_repos_downloads
    ON hf_repos(repo_type, downloads DESC);

CREATE INDEX IF NOT EXISTS idx_hf_repos_likes
    ON hf_repos(repo_type, likes DESC);

CREATE INDEX IF NOT EXISTS idx_hf_repos_synced
    ON hf_repos(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_hf_repos_author
    ON hf_repos(author);

CREATE INDEX IF NOT EXISTS idx_hf_repos_library
    ON hf_repos(repo_type, library);

CREATE INDEX IF NOT EXISTS idx_hf_repos_pipeline
    ON hf_repos(repo_type, pipeline_tag);

CREATE INDEX IF NOT EXISTS idx_hf_repos_created
    ON hf_repos(repo_type, created_at DESC);
";

// Migration: add columns that didn't exist in the original schema
const MIGRATE: &str = "
ALTER TABLE hf_repos ADD COLUMN author TEXT;
ALTER TABLE hf_repos ADD COLUMN created_at TEXT;
ALTER TABLE hf_repos ADD COLUMN private INTEGER;
ALTER TABLE hf_repos ADD COLUMN gated TEXT;
ALTER TABLE hf_repos ADD COLUMN disabled INTEGER;
ALTER TABLE hf_repos ADD COLUMN description TEXT;
ALTER TABLE hf_repos ADD COLUMN sdk TEXT;
ALTER TABLE hf_repos ADD COLUMN siblings TEXT;
ALTER TABLE hf_repos ADD COLUMN card_data TEXT;
";

const UPSERT: &str = "
INSERT INTO hf_repos (
    repo_id, repo_type, author, sha, last_modified, created_at,
    tags, downloads, likes, library, pipeline_tag,
    private, gated, disabled, description, sdk,
    siblings, card_data, extra, synced_at
)
VALUES (
    ?1, ?2, ?3, ?4, ?5, ?6,
    ?7, ?8, ?9, ?10, ?11,
    ?12, ?13, ?14, ?15, ?16,
    ?17, ?18, ?19, datetime('now')
)
ON CONFLICT(repo_id, repo_type) DO UPDATE SET
    author = excluded.author,
    sha = excluded.sha,
    last_modified = excluded.last_modified,
    created_at = excluded.created_at,
    tags = excluded.tags,
    downloads = excluded.downloads,
    likes = excluded.likes,
    library = excluded.library,
    pipeline_tag = excluded.pipeline_tag,
    private = excluded.private,
    gated = excluded.gated,
    disabled = excluded.disabled,
    description = excluded.description,
    sdk = excluded.sdk,
    siblings = excluded.siblings,
    card_data = excluded.card_data,
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
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-64000;")?;
        conn.execute_batch(SCHEMA)?;
        // Migrate old databases — ignore errors (columns already exist)
        for line in MIGRATE.lines() {
            let line = line.trim();
            if line.starts_with("ALTER") {
                let _ = conn.execute_batch(line);
            }
        }
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
            let siblings_json = info.siblings.as_ref().map(|s| serde_json::to_string(s).unwrap_or_default());
            let card_data_json = info.card_data.as_ref().map(|c| c.to_string());
            let gated_str = info.gated.as_ref().map(|g| g.to_string());
            let extra_str = if info.extra.is_null() { None } else { Some(info.extra.to_string()) };

            stmt.execute(params![
                repo_id,                                    // 1
                type_str,                                   // 2
                info.author,                                // 3
                info.sha,                                   // 4
                info.last_modified,                         // 5
                info.created_at,                            // 6
                tags_json,                                  // 7
                info.downloads.map(|d| d as i64),           // 8
                info.likes.map(|l| l as i64),               // 9
                info.library,                               // 10
                info.pipeline_tag,                          // 11
                info.private.map(|p| p as i32),             // 12
                gated_str,                                  // 13
                info.disabled.map(|d| d as i32),            // 14
                info.description,                           // 15
                info.sdk,                                   // 16
                siblings_json,                              // 17
                card_data_json,                             // 18
                extra_str,                                  // 19
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
            "SELECT repo_id, author, sha, last_modified, created_at, tags,
                    downloads, likes, library, pipeline_tag, private, gated,
                    disabled, description, sdk, siblings, card_data, extra
             FROM hf_repos WHERE repo_type = ?1
             ORDER BY downloads DESC LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![repo_type.as_str(), limit as i64], row_to_repo_info)?;
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

    /// Total count across all types.
    pub fn total_count(&self) -> Result<usize, Error> {
        let n: i64 = self.conn.query_row("SELECT COUNT(*) FROM hf_repos", [], |row| row.get(0))?;
        Ok(n as usize)
    }

    /// Database file size in bytes (0 for in-memory).
    pub fn file_size(&self) -> Result<u64, Error> {
        let page_count: i64 = self.conn.query_row("PRAGMA page_count", [], |r| r.get(0))?;
        let page_size: i64 = self.conn.query_row("PRAGMA page_size", [], |r| r.get(0))?;
        Ok((page_count * page_size) as u64)
    }

    /// Direct access to the connection for custom queries.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    // ── Organization-level queries ─────────────────────────────────

    /// Find all repos by a specific author/org.
    pub fn repos_by_author(&self, author: &str) -> Result<Vec<RepoInfo>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT repo_id, author, sha, last_modified, created_at, tags,
                    downloads, likes, library, pipeline_tag, private, gated,
                    disabled, description, sdk, siblings, card_data, extra
             FROM hf_repos WHERE author = ?1
             ORDER BY downloads DESC",
        )?;
        let rows = stmt.query_map(params![author], row_to_repo_info)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
    }

    /// Search repos by text in repo_id or description.
    pub fn search_repos(
        &self,
        query: &str,
        repo_type: Option<RepoType>,
    ) -> Result<Vec<RepoInfo>, Error> {
        let like_pattern = format!("%{query}%");

        if let Some(rt) = repo_type {
            let mut stmt = self.conn.prepare(
                "SELECT repo_id, author, sha, last_modified, created_at, tags,
                        downloads, likes, library, pipeline_tag, private, gated,
                        disabled, description, sdk, siblings, card_data, extra
                 FROM hf_repos
                 WHERE repo_type = ?1 AND (repo_id LIKE ?2 OR description LIKE ?2)
                 ORDER BY downloads DESC
                 LIMIT 100",
            )?;
            let rows = stmt.query_map(params![rt.as_str(), like_pattern], row_to_repo_info)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT repo_id, author, sha, last_modified, created_at, tags,
                        downloads, likes, library, pipeline_tag, private, gated,
                        disabled, description, sdk, siblings, card_data, extra
                 FROM hf_repos
                 WHERE repo_id LIKE ?1 OR description LIKE ?1
                 ORDER BY downloads DESC
                 LIMIT 100",
            )?;
            let rows = stmt.query_map(params![like_pattern], row_to_repo_info)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
        }
    }

    /// Get aggregate stats for an org.
    pub fn org_summary(&self, author: &str) -> Result<OrgSummary, Error> {
        let model_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM hf_repos WHERE author = ?1 AND repo_type = 'model'",
            params![author],
            |r| r.get(0),
        )?;
        let dataset_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM hf_repos WHERE author = ?1 AND repo_type = 'dataset'",
            params![author],
            |r| r.get(0),
        )?;
        let space_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM hf_repos WHERE author = ?1 AND repo_type = 'space'",
            params![author],
            |r| r.get(0),
        )?;

        let (total_downloads, total_likes): (i64, i64) = self.conn.query_row(
            "SELECT COALESCE(SUM(downloads), 0), COALESCE(SUM(likes), 0) FROM hf_repos WHERE author = ?1",
            params![author],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT library FROM hf_repos WHERE author = ?1 AND library IS NOT NULL ORDER BY library",
        )?;
        let libraries: Vec<String> = stmt
            .query_map(params![author], |r| r.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT pipeline_tag FROM hf_repos WHERE author = ?1 AND pipeline_tag IS NOT NULL ORDER BY pipeline_tag",
        )?;
        let pipeline_tags: Vec<String> = stmt
            .query_map(params![author], |r| r.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(OrgSummary {
            author: author.to_owned(),
            model_count: model_count as usize,
            dataset_count: dataset_count as usize,
            space_count: space_count as usize,
            total_downloads: total_downloads as u64,
            total_likes: total_likes as u64,
            libraries,
            pipeline_tags,
        })
    }

    /// List distinct authors sorted by repo count, with download totals.
    pub fn top_authors(
        &self,
        repo_type: RepoType,
        limit: usize,
    ) -> Result<Vec<(String, usize, u64)>, Error> {
        let mut stmt = self.conn.prepare(
            "SELECT author, COUNT(*) as cnt, COALESCE(SUM(downloads), 0) as dl
             FROM hf_repos
             WHERE repo_type = ?1 AND author IS NOT NULL
             GROUP BY author
             ORDER BY cnt DESC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![repo_type.as_str(), limit as i64], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, i64>(1)? as usize,
                r.get::<_, i64>(2)? as u64,
            ))
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Error::from)
    }
}

fn row_to_repo_info(row: &rusqlite::Row) -> rusqlite::Result<RepoInfo> {
    let tags_raw: Option<String> = row.get(5)?;
    let gated_raw: Option<String> = row.get(11)?;
    let siblings_raw: Option<String> = row.get(15)?;
    let card_data_raw: Option<String> = row.get(16)?;
    let extra_raw: Option<String> = row.get(17)?;

    Ok(RepoInfo {
        id: None,
        repo_id: row.get(0)?,
        model_id: None,
        author: row.get(1)?,
        sha: row.get(2)?,
        last_modified: row.get(3)?,
        created_at: row.get(4)?,
        tags: tags_raw.and_then(|s| serde_json::from_str(&s).ok()),
        downloads: row.get::<_, Option<i64>>(6)?.map(|d| d as u64),
        likes: row.get::<_, Option<i64>>(7)?.map(|l| l as u64),
        library: row.get(8)?,
        pipeline_tag: row.get(9)?,
        private: row.get::<_, Option<i32>>(10)?.map(|p| p != 0),
        gated: gated_raw.and_then(|s| serde_json::from_str(&s).ok()),
        disabled: row.get::<_, Option<i32>>(12)?.map(|d| d != 0),
        description: row.get(13)?,
        sdk: row.get(14)?,
        siblings: siblings_raw.and_then(|s| serde_json::from_str(&s).ok()),
        card_data: card_data_raw.and_then(|s| serde_json::from_str(&s).ok()),
        extra: extra_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::Value::Null),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_repo(repo_id: &str, downloads: u64, likes: u64) -> RepoInfo {
        RepoInfo {
            id: None,
            repo_id: Some(repo_id.into()),
            model_id: None,
            author: Some(repo_id.split('/').next().unwrap_or("").into()),
            sha: None,
            last_modified: None,
            created_at: None,
            tags: Some(vec!["transformers".into()]),
            downloads: Some(downloads),
            likes: Some(likes),
            library: Some("transformers".into()),
            pipeline_tag: Some("text-generation".into()),
            private: Some(false),
            gated: None,
            disabled: None,
            description: None,
            sdk: None,
            siblings: None,
            card_data: None,
            extra: serde_json::Value::Null,
        }
    }

    #[test]
    fn upsert_and_query() {
        let db = HfDb::open_in_memory().unwrap();

        let repos = vec![
            test_repo("meta-llama/Llama-3-8B", 5_000_000, 12_000),
            test_repo("openai/whisper-large-v3", 3_000_000, 8_000),
        ];

        let count = db.upsert_repos(&repos, RepoType::Model).unwrap();
        assert_eq!(count, 2);
        assert_eq!(db.count(RepoType::Model).unwrap(), 2);
        assert_eq!(db.count(RepoType::Dataset).unwrap(), 0);

        let top = db.top_repos(RepoType::Model, 10).unwrap();
        assert_eq!(top.len(), 2);
        assert_eq!(top[0].repo_id.as_deref(), Some("meta-llama/Llama-3-8B"));
        assert_eq!(top[0].downloads, Some(5_000_000));
        assert_eq!(top[0].author.as_deref(), Some("meta-llama"));

        // Upsert again with updated downloads — should overwrite
        let updated = vec![test_repo("meta-llama/Llama-3-8B", 6_000_000, 15_000)];
        db.upsert_repos(&updated, RepoType::Model).unwrap();
        assert_eq!(db.count(RepoType::Model).unwrap(), 2);
        let top = db.top_repos(RepoType::Model, 1).unwrap();
        assert_eq!(top[0].downloads, Some(6_000_000));
    }

    #[test]
    fn total_count_and_file_size() {
        let db = HfDb::open_in_memory().unwrap();
        assert_eq!(db.total_count().unwrap(), 0);

        let repos = vec![test_repo("org/model-a", 100, 10)];
        db.upsert_repos(&repos, RepoType::Model).unwrap();
        db.upsert_repos(&repos, RepoType::Dataset).unwrap();
        assert_eq!(db.total_count().unwrap(), 2);
        assert!(db.file_size().unwrap() > 0);
    }
}

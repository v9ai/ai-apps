use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::cdx::CdxRecord;

pub async fn connect(database_url: &str) -> Result<PgPool> {
    PgPoolOptions::new()
        .max_connections(8)
        .connect(database_url)
        .await
        .context("connecting to Neon PostgreSQL")
}

/// Write last_seen Common Crawl metadata for a company identified by canonical_domain.
/// Does nothing if no row matches the domain.
pub async fn update_last_seen(pool: &PgPool, domain: &str, record: &CdxRecord) -> Result<u64> {
    let rows = sqlx::query(
        r#"UPDATE companies
           SET last_seen_crawl_id          = $1,
               last_seen_capture_timestamp = $2,
               last_seen_source_url        = $3,
               updated_at                  = now()::text
           WHERE canonical_domain = $4 OR key = $4"#,
    )
    .bind(&record.crawl_id)
    .bind(&record.timestamp)
    .bind(&record.url)
    .bind(domain)
    .execute(pool)
    .await
    .context("update last_seen")?
    .rows_affected();

    Ok(rows)
}

/// Fetch all canonical_domains that have no last_seen_crawl_id yet.
pub async fn domains_without_crawl(pool: &PgPool, limit: i64) -> Result<Vec<String>> {
    let rows: Vec<(String,)> = sqlx::query_as(
        r#"SELECT COALESCE(canonical_domain, key)
           FROM companies
           WHERE last_seen_crawl_id IS NULL
             AND (canonical_domain IS NOT NULL OR key IS NOT NULL)
             AND blocked = false
           ORDER BY updated_at DESC
           LIMIT $1"#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .context("querying domains without crawl")?;

    Ok(rows.into_iter().map(|(d,)| d).collect())
}

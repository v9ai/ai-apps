use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::cdx::CdxRecord;
use crate::extract::{PageContent, Person};

pub async fn connect(database_url: &str) -> Result<PgPool> {
    PgPoolOptions::new()
        .max_connections(8)
        .connect(database_url)
        .await
        .context("connecting to Neon PostgreSQL")
}

/// Look up a company's integer primary key by canonical_domain or key.
pub async fn company_id_by_domain(pool: &PgPool, domain: &str) -> Result<Option<i32>> {
    let row: Option<(i32,)> = sqlx::query_as(
        "SELECT id FROM companies WHERE canonical_domain = $1 OR key = $1 LIMIT 1",
    )
    .bind(domain)
    .fetch_optional(pool)
    .await
    .context("company_id_by_domain")?;
    Ok(row.map(|(id,)| id))
}

/// Update `last_seen_*` fields on the companies row.
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

/// Write a snapshot row for one fetched WARC page.
/// Skips if a snapshot with the same content_hash already exists for this company.
pub async fn upsert_snapshot(
    pool: &PgPool,
    company_id: i32,
    record: &CdxRecord,
    content: &PageContent,
) -> Result<Option<i32>> {
    // Check dedup by content hash
    let existing: Option<(i32,)> = sqlx::query_as(
        "SELECT id FROM company_snapshots WHERE company_id = $1 AND content_hash = $2 LIMIT 1",
    )
    .bind(company_id)
    .bind(&content.content_hash)
    .fetch_optional(pool)
    .await?;

    if existing.is_some() {
        // Already processed — signal caller to skip fact/contact extraction for this page
        return Ok(None);
    }

    let text_sample: String = content.text.chars().take(500).collect();
    let id: i32 = sqlx::query_scalar(
        r#"INSERT INTO company_snapshots
             (company_id, source_url, crawl_id, capture_timestamp, fetched_at,
              http_status, mime, content_hash, text_sample,
              source_type, method, extractor_version,
              warc_filename, warc_offset, warc_length)
           VALUES ($1,$2,$3,$4, now()::text,
                   200,'text/html',$5,$6,
                   'COMMONCRAWL','HEURISTIC','common-crawl-rs/0.1',
                   $7,$8,$9)
           RETURNING id"#,
    )
    .bind(company_id)
    .bind(&record.url)
    .bind(&record.crawl_id)
    .bind(&record.timestamp)
    .bind(&content.content_hash)
    .bind(&text_sample)
    .bind(&record.filename)
    .bind(record.offset as i64)
    .bind(record.length as i64)
    .fetch_one(pool)
    .await
    .context("insert company_snapshot")?;

    Ok(Some(id))
}

/// Write a company_facts row for a discovered field (e.g. "description", "email").
pub async fn upsert_fact(
    pool: &PgPool,
    company_id: i32,
    field: &str,
    value_text: &str,
    record: &CdxRecord,
    confidence: f32,
) -> Result<()> {
    // Skip if identical (field + value_text) already recorded for this company+source
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM company_facts WHERE company_id=$1 AND field=$2 AND value_text=$3 AND source_url=$4)",
    )
    .bind(company_id).bind(field).bind(value_text).bind(&record.url)
    .fetch_one(pool).await.unwrap_or(false);
    if exists { return Ok(()); }

    sqlx::query(
        r#"INSERT INTO company_facts
             (company_id, field, value_text, confidence,
              source_type, source_url, crawl_id, capture_timestamp,
              observed_at, method, extractor_version,
              warc_filename, warc_offset, warc_length)
           VALUES ($1,$2,$3,$4,
                   'COMMONCRAWL',$5,$6,$7,
                   now()::text,'HEURISTIC','common-crawl-rs/0.1',
                   $8,$9,$10)"#,
    )
    .bind(company_id)
    .bind(field)
    .bind(value_text)
    .bind(confidence)
    .bind(&record.url)
    .bind(&record.crawl_id)
    .bind(&record.timestamp)
    .bind(&record.filename)
    .bind(record.offset as i64)
    .bind(record.length as i64)
    .execute(pool)
    .await
    .context("insert company_fact")?;
    Ok(())
}

/// Upsert a contact discovered from a WARC page.
/// Strategy: if email present, use ON CONFLICT(email) to merge into existing row.
/// If no email, check by company+first+last then insert.
pub async fn upsert_contact(pool: &PgPool, company_id: i32, person: &Person) -> Result<Option<i32>> {
    let (first, last) = split_name(&person.name);
    if first.is_empty() || last.is_empty() {
        return Ok(None);
    }

    // When we have an email, use ON CONFLICT(email) — enriches existing row
    if let Some(ref email) = person.email {
        if !email.is_empty() {
            let id: i32 = sqlx::query_scalar(
                r#"INSERT INTO contacts (first_name, last_name, position, email, company_id, tags)
                   VALUES ($1, $2, $3, $4, $5, '["source:common-crawl"]')
                   ON CONFLICT (email) DO UPDATE SET
                     position   = COALESCE(EXCLUDED.position, contacts.position),
                     company_id = COALESCE(EXCLUDED.company_id, contacts.company_id),
                     first_name = CASE WHEN contacts.first_name = '' THEN EXCLUDED.first_name ELSE contacts.first_name END,
                     last_name  = CASE WHEN contacts.last_name  = '' THEN EXCLUDED.last_name  ELSE contacts.last_name  END
                   RETURNING id"#,
            )
            .bind(&first)
            .bind(&last)
            .bind(&person.title)
            .bind(email)
            .bind(company_id)
            .fetch_one(pool)
            .await
            .context("upsert contact by email")?;
            return Ok(Some(id));
        }
    }

    // No email — check by company + full name first to avoid duplicates
    let existing: Option<(i32,)> = sqlx::query_as(
        "SELECT id FROM contacts WHERE company_id = $1 AND first_name ILIKE $2 AND last_name ILIKE $3 LIMIT 1",
    )
    .bind(company_id)
    .bind(&first)
    .bind(&last)
    .fetch_optional(pool)
    .await
    .context("check existing contact")?;

    if let Some((id,)) = existing {
        sqlx::query(
            "UPDATE contacts SET position = COALESCE($1, position) WHERE id = $2",
        )
        .bind(&person.title)
        .bind(id)
        .execute(pool)
        .await?;
        return Ok(Some(id));
    }

    let id: i32 = sqlx::query_scalar(
        r#"INSERT INTO contacts (first_name, last_name, position, email, company_id, tags)
           VALUES ($1, $2, $3, NULL, $4, '["source:common-crawl"]')
           RETURNING id"#,
    )
    .bind(&first)
    .bind(&last)
    .bind(&person.title)
    .bind(company_id)
    .fetch_one(pool)
    .await
    .context("insert contact")?;

    Ok(Some(id))
}

/// Domains in Neon that have no last_seen_crawl_id yet.
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
    .context("domains_without_crawl")?;
    Ok(rows.into_iter().map(|(d,)| d).collect())
}

fn split_name(full: &str) -> (String, String) {
    let parts: Vec<&str> = full.trim().splitn(2, ' ').collect();
    match parts.len() {
        2 => (parts[0].to_string(), parts[1].to_string()),
        1 => (parts[0].to_string(), String::new()),
        _ => (String::new(), String::new()),
    }
}

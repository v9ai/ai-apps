use std::collections::HashSet;

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

use crate::Consultancy;

pub async fn connect(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(8)
        .connect(database_url)
        .await
        .context("connecting to Neon PostgreSQL")?;
    Ok(pool)
}

pub async fn fetch_existing_keys(pool: &PgPool, keys: &[String]) -> Result<HashSet<String>> {
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT key FROM companies WHERE key = ANY($1)")
            .bind(keys)
            .fetch_all(pool)
            .await
            .context("fetching existing keys")?;
    Ok(rows.into_iter().map(|(k,)| k).collect())
}

pub async fn upsert_company(pool: &PgPool, c: &Consultancy) -> Result<i32> {
    let tags_json = serde_json::to_string(&vec!["consultancy:seed", "discovery:consultancies-rs"])?;
    let services_json = serde_json::to_string(&c.services)?;
    let industries_json = serde_json::to_string(&c.industries)?;
    let reasons_json = serde_json::to_string(&c.score_reasons)?;

    let id: i32 = sqlx::query_scalar(
        r#"INSERT INTO companies
             (key, name, website, canonical_domain, description, location, size,
              category, tags, services, industries,
              score, score_reasons, ai_tier,
              created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7,
                   'CONSULTANCY', $8, $9, $10,
                   $11, $12, $13,
                   now()::text, now()::text)
           ON CONFLICT (key) DO UPDATE SET
             name = EXCLUDED.name,
             website = COALESCE(EXCLUDED.website, companies.website),
             canonical_domain = EXCLUDED.canonical_domain,
             description = COALESCE(EXCLUDED.description, companies.description),
             location = COALESCE(EXCLUDED.location, companies.location),
             size = COALESCE(EXCLUDED.size, companies.size),
             category = 'CONSULTANCY',
             tags = EXCLUDED.tags,
             services = COALESCE(EXCLUDED.services, companies.services),
             industries = COALESCE(EXCLUDED.industries, companies.industries),
             score = EXCLUDED.score,
             score_reasons = EXCLUDED.score_reasons,
             ai_tier = EXCLUDED.ai_tier,
             updated_at = now()::text
           RETURNING id"#,
    )
    .bind(&c.key)
    .bind(&c.name)
    .bind(&c.website)
    .bind(&c.canonical_domain)
    .bind(&c.description)
    .bind(&c.location)
    .bind(&c.size)
    .bind(&tags_json)
    .bind(&services_json)
    .bind(&industries_json)
    .bind(c.score)
    .bind(&reasons_json)
    .bind(c.ai_tier)
    .fetch_one(pool)
    .await
    .with_context(|| format!("upserting company key={}", c.key))?;

    info!("upserted {} → id={id}", c.name);
    Ok(id)
}

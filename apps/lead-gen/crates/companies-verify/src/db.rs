/// Neon PostgreSQL access for the lead-gen companies table.
///
/// Reads all non-blocked companies that have a website, and writes back
/// the recruitment-verify verdict into `category` + `score_reasons`.

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::{FromRow, PgPool};

use crate::Verdict;

#[derive(Debug, Clone, FromRow)]
pub struct CompanyRow {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub website: String,
    pub category: String,
    pub description: Option<String>,
}

/// Connect to Neon PostgreSQL.
pub async fn connect(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(8)
        .connect(database_url)
        .await
        .context("connecting to Neon PostgreSQL")?;
    Ok(pool)
}

/// Fetch all non-blocked companies that have a website.
pub async fn fetch_companies(pool: &PgPool) -> Result<Vec<CompanyRow>> {
    let rows: Vec<CompanyRow> = sqlx::query_as(
        r#"
        SELECT
            id,
            key,
            name,
            website,
            category,
            description
        FROM companies
        WHERE blocked = false
          AND website IS NOT NULL
          AND website != ''
        ORDER BY id
        "#,
    )
    .fetch_all(pool)
    .await
    .context("fetching companies")?;

    Ok(rows)
}

/// Write the recruitment-verify verdict back to the DB.
pub async fn update_verdict(pool: &PgPool, company_id: i32, verdict: &Verdict) -> Result<()> {
    let reasons = serde_json::json!({
        "method": "recruitment-verify-v1",
        "is_recruitment": verdict.is_recruitment,
        "confidence": verdict.confidence,
        "top_matches": verdict.top_matches,
    });

    let new_category = if verdict.is_recruitment && verdict.confidence >= 0.6 {
        "STAFFING"
    } else if !verdict.is_recruitment && verdict.confidence >= 0.6 {
        "PRODUCT"
    } else {
        "UNKNOWN"
    };

    sqlx::query(
        r#"
        UPDATE companies
        SET category = $1,
            score = $2,
            score_reasons = $3,
            updated_at = now()::text
        WHERE id = $4
        "#,
    )
    .bind(new_category)
    .bind(verdict.confidence)
    .bind(reasons.to_string())
    .bind(company_id)
    .execute(pool)
    .await
    .with_context(|| format!("updating company id={company_id}"))?;

    Ok(())
}

/// Neon PostgreSQL access for the lead-gen companies table.
///
/// Reads all non-blocked companies and optionally deletes crypto companies
/// along with their contacts and related records.

use anyhow::{Context, Result};
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use sqlx::{FromRow, PgPool};
use tracing::info;

#[derive(Debug, Clone, FromRow)]
pub struct CompanyRow {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub industry: Option<String>,
    pub industries: Option<String>,
    pub tags: Option<String>,
    pub services: Option<String>,
}

/// Summary of what was removed for a single company.
#[derive(Debug, Clone, Serialize)]
pub struct DeleteResult {
    pub company_id: i32,
    pub contacts_deleted: i64,
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

/// Fetch all non-blocked companies.
pub async fn fetch_companies(pool: &PgPool) -> Result<Vec<CompanyRow>> {
    let rows: Vec<CompanyRow> = sqlx::query_as(
        r#"
        SELECT id, key, name, description, industry, industries, tags, services
        FROM companies
        WHERE blocked = false
        ORDER BY id
        "#,
    )
    .fetch_all(pool)
    .await
    .context("fetching companies")?;

    Ok(rows)
}

/// Build a classification text from the available DB fields.
///
/// Concatenates name + description + industry + tags + services into a single
/// string that mirrors the reference corpus format.
pub fn build_classification_text(c: &CompanyRow) -> String {
    let mut parts = vec![c.name.clone()];

    if let Some(ref d) = c.description {
        if !d.is_empty() {
            parts.push(d.clone());
        }
    }

    if let Some(ref i) = c.industry {
        if !i.is_empty() {
            parts.push(i.clone());
        }
    }

    if let Some(ref i) = c.industries {
        if let Ok(arr) = serde_json::from_str::<Vec<String>>(i) {
            if !arr.is_empty() {
                parts.push(arr.join(", "));
            }
        }
    }

    if let Some(ref t) = c.tags {
        if let Ok(arr) = serde_json::from_str::<Vec<String>>(t) {
            if !arr.is_empty() {
                parts.push(format!("[{}]", arr.join(", ")));
            }
        }
    }

    if let Some(ref s) = c.services {
        if let Ok(arr) = serde_json::from_str::<Vec<String>>(s) {
            if !arr.is_empty() {
                parts.push(format!("[{}]", arr.join(", ")));
            }
        }
    }

    let joined = parts.join(". ");
    // Truncate to 2000 chars to stay within model context
    if joined.len() > 2000 {
        joined[..2000].to_string()
    } else {
        joined
    }
}

/// Delete a company and its contacts in a single transaction.
///
/// 1. Deletes contacts (cascades to contact_emails, reply_drafts, messages)
/// 2. Deletes the company (cascades to company_facts, company_snapshots,
///    intent_signals, voyager_job_counts)
pub async fn delete_company(pool: &PgPool, company_id: i32) -> Result<DeleteResult> {
    let mut tx = pool.begin().await?;

    // Count contacts for reporting
    let (contacts_count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM contacts WHERE company_id = $1",
    )
    .bind(company_id)
    .fetch_one(&mut *tx)
    .await
    .context("counting contacts")?;

    // Delete contacts explicitly (FK is SET NULL, not CASCADE)
    sqlx::query("DELETE FROM contacts WHERE company_id = $1")
        .bind(company_id)
        .execute(&mut *tx)
        .await
        .context("deleting contacts")?;

    // Delete company (cascades to company_facts, company_snapshots, etc.)
    sqlx::query("DELETE FROM companies WHERE id = $1")
        .bind(company_id)
        .execute(&mut *tx)
        .await
        .context("deleting company")?;

    tx.commit().await?;

    info!(
        "Deleted company id={company_id} + {contacts_count} contacts"
    );

    Ok(DeleteResult {
        company_id,
        contacts_deleted: contacts_count,
    })
}

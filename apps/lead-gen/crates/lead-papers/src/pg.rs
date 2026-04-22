use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn connect(url: &str) -> Result<PgPool> {
    Ok(PgPoolOptions::new().max_connections(5).connect(url).await?)
}

#[allow(clippy::too_many_arguments)]
pub async fn promote_contact(
    pg: &PgPool,
    contact_id: i32,
    github_handle: Option<&str>,
    papers_json: &serde_json::Value,
    gh_match_score: f32,
    gh_match_status: &str,
    gh_match_arm: Option<&str>,
    gh_match_evidence_ref: Option<&str>,
) -> Result<u64> {
    let result = sqlx::query(
        r#"update contacts set
             github_handle         = coalesce($1, github_handle),
             papers                = $2,
             papers_enriched_at    = now()::text,
             gh_match_score        = $3,
             gh_match_status       = $4,
             gh_match_arm          = coalesce($5, gh_match_arm),
             gh_match_evidence_ref = coalesce($6, gh_match_evidence_ref),
             updated_at            = now()::text
           where id = $7"#,
    )
    .bind(github_handle)
    .bind(papers_json)
    .bind(gh_match_score)
    .bind(gh_match_status)
    .bind(gh_match_arm)
    .bind(gh_match_evidence_ref)
    .bind(contact_id)
    .execute(pg)
    .await?;
    Ok(result.rows_affected())
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ContactSeed {
    pub id: i32,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub company: Option<String>,
}

pub async fn list_contacts_needing_match(pg: &PgPool, limit: i64) -> Result<Vec<ContactSeed>> {
    let rows = sqlx::query_as::<_, ContactSeed>(
        r#"select id, first_name, last_name, email, company
           from contacts
           where coalesce(tags, '[]')::jsonb ? 'papers'
             and (github_handle is null or papers_enriched_at is null)
           order by id
           limit $1"#,
    )
    .bind(limit)
    .fetch_all(pg)
    .await?;
    Ok(rows)
}

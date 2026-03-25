use anyhow::Result;
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};

pub type Db = Pool<Sqlite>;

pub async fn init(path: &str) -> Result<Db> {
    let url = format!("sqlite:{}?mode=rwc", path);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;

    sqlx::query(include_str!("migrations/001_init.sql"))
        .execute(&pool)
        .await?;

    Ok(pool)
}

pub async fn upsert_company(db: &Db, company: &super::Company) -> Result<()> {
    sqlx::query(
        r#"INSERT INTO companies (id, name, domain, industry, employee_count,
           funding_stage, tech_stack, location, description, source)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
           ON CONFLICT(domain) DO UPDATE SET
             name = COALESCE(excluded.name, companies.name),
             industry = COALESCE(excluded.industry, companies.industry),
             employee_count = COALESCE(excluded.employee_count, companies.employee_count),
             funding_stage = COALESCE(excluded.funding_stage, companies.funding_stage),
             tech_stack = COALESCE(excluded.tech_stack, companies.tech_stack),
             location = COALESCE(excluded.location, companies.location),
             description = COALESCE(excluded.description, companies.description),
             updated_at = datetime('now')"#,
    )
    .bind(&company.id).bind(&company.name).bind(&company.domain)
    .bind(&company.industry).bind(&company.employee_count)
    .bind(&company.funding_stage).bind(&company.tech_stack)
    .bind(&company.location).bind(&company.description).bind(&company.source)
    .execute(db).await?;
    Ok(())
}

pub async fn get_company_by_domain(db: &Db, domain: &str) -> Result<Option<super::Company>> {
    let row = sqlx::query_as::<_, super::Company>(
        "SELECT * FROM companies WHERE domain = ?1",
    ).bind(domain).fetch_optional(db).await?;
    Ok(row)
}

pub async fn list_companies(db: &Db, limit: i64, offset: i64) -> Result<Vec<super::Company>> {
    let rows = sqlx::query_as::<_, super::Company>(
        "SELECT * FROM companies ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2",
    ).bind(limit).bind(offset).fetch_all(db).await?;
    Ok(rows)
}

pub async fn stale_companies(db: &Db, older_than_days: i64) -> Result<Vec<super::Company>> {
    let rows = sqlx::query_as::<_, super::Company>(
        "SELECT * FROM companies
         WHERE julianday('now') - julianday(updated_at) > ?1
         ORDER BY updated_at ASC LIMIT 100",
    ).bind(older_than_days).fetch_all(db).await?;
    Ok(rows)
}

pub async fn upsert_contact(db: &Db, contact: &super::Contact) -> Result<()> {
    sqlx::query(
        r#"INSERT INTO contacts (id, company_id, first_name, last_name, title,
           seniority, department, email, email_status, linkedin_url, phone, source)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
           ON CONFLICT(id) DO UPDATE SET
             title = COALESCE(excluded.title, contacts.title),
             seniority = COALESCE(excluded.seniority, contacts.seniority),
             department = COALESCE(excluded.department, contacts.department),
             email = COALESCE(excluded.email, contacts.email),
             linkedin_url = COALESCE(excluded.linkedin_url, contacts.linkedin_url),
             phone = COALESCE(excluded.phone, contacts.phone)"#,
    )
    .bind(&contact.id).bind(&contact.company_id)
    .bind(&contact.first_name).bind(&contact.last_name)
    .bind(&contact.title).bind(&contact.seniority)
    .bind(&contact.department).bind(&contact.email)
    .bind(&contact.email_status).bind(&contact.linkedin_url)
    .bind(&contact.phone).bind(&contact.source)
    .execute(db).await?;
    Ok(())
}

pub async fn contacts_by_company(db: &Db, company_id: &str) -> Result<Vec<super::Contact>> {
    let rows = sqlx::query_as::<_, super::Contact>(
        "SELECT * FROM contacts WHERE company_id = ?1",
    ).bind(company_id).fetch_all(db).await?;
    Ok(rows)
}

pub async fn contacts_needing_verification(db: &Db, limit: i64) -> Result<Vec<super::Contact>> {
    let rows = sqlx::query_as::<_, super::Contact>(
        "SELECT * FROM contacts WHERE email IS NOT NULL AND email_status = 'unknown' LIMIT ?1",
    ).bind(limit).fetch_all(db).await?;
    Ok(rows)
}

pub async fn update_email_status(db: &Db, contact_id: &str, status: &str) -> Result<()> {
    sqlx::query("UPDATE contacts SET email_status = ?1 WHERE id = ?2")
        .bind(status).bind(contact_id).execute(db).await?;
    Ok(())
}

pub async fn save_email_pattern(db: &Db, domain: &str, pattern: &str, confidence: f64, sample_count: i32) -> Result<()> {
    sqlx::query(
        "INSERT INTO email_patterns (domain, pattern, confidence, sample_count, verified_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(domain) DO UPDATE SET
           pattern = excluded.pattern, confidence = excluded.confidence,
           sample_count = excluded.sample_count, verified_at = datetime('now')",
    ).bind(domain).bind(pattern).bind(confidence).bind(sample_count)
    .execute(db).await?;
    Ok(())
}

pub async fn get_email_pattern(db: &Db, domain: &str) -> Result<Option<(String, f64)>> {
    let row: Option<(String, f64)> = sqlx::query_as(
        "SELECT pattern, confidence FROM email_patterns WHERE domain = ?1",
    ).bind(domain).fetch_optional(db).await?;
    Ok(row)
}

pub async fn save_lead_score(db: &Db, score: &super::LeadScore) -> Result<()> {
    sqlx::query(
        "INSERT INTO lead_scores (contact_id, icp_fit_score, intent_score,
         recency_score, composite_score, scored_at)
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
         ON CONFLICT(contact_id) DO UPDATE SET
           icp_fit_score = excluded.icp_fit_score, intent_score = excluded.intent_score,
           recency_score = excluded.recency_score, composite_score = excluded.composite_score,
           scored_at = datetime('now')",
    ).bind(&score.contact_id).bind(score.icp_fit_score)
    .bind(score.intent_score).bind(score.recency_score)
    .bind(score.composite_score).execute(db).await?;
    Ok(())
}

pub async fn top_leads(db: &Db, limit: i64) -> Result<Vec<super::ScoredLead>> {
    let rows = sqlx::query_as::<_, super::ScoredLead>(
        "SELECT c.id, c.first_name, c.last_name, c.title, c.email, c.email_status,
         co.name as company_name, co.domain, co.industry,
         ls.icp_fit_score, ls.composite_score
         FROM lead_scores ls
         JOIN contacts c ON c.id = ls.contact_id
         JOIN companies co ON co.id = c.company_id
         ORDER BY ls.composite_score DESC LIMIT ?1",
    ).bind(limit).fetch_all(db).await?;
    Ok(rows)
}

pub async fn get_cached_extraction(db: &Db, url: &str) -> Result<Option<String>> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT extracted_json FROM enrichment_cache WHERE url = ?1",
    ).bind(url).fetch_optional(db).await?;
    Ok(row.map(|r| r.0))
}

pub async fn cache_extraction(db: &Db, url: &str, json: &str, model: &str) -> Result<()> {
    sqlx::query(
        "INSERT INTO enrichment_cache (url, extracted_json, model_used)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(url) DO UPDATE SET
           extracted_json = excluded.extracted_json,
           model_used = excluded.model_used,
           fetched_at = datetime('now')",
    ).bind(url).bind(json).bind(model).execute(db).await?;
    Ok(())
}

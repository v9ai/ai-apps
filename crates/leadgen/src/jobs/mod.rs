use crate::{crawler, db, email, scoring, search};
use anyhow::Result;
use tracing::info;

pub async fn recrawl_stale(database: &db::Db, fetcher: &crawler::Fetcher, llm: &crate::llm::LlmClient,
    writer: &mut tantivy::IndexWriter, days: i64) -> Result<u32> {
    let stale = db::stale_companies(database, days).await?;
    let mut n = 0u32;
    for c in &stale {
        if let Some(ref d) = c.domain {
            if crawler::process_domain(d, fetcher, llm, database, writer).await.is_ok() { n += 1; }
        }
    }
    search::commit(writer)?;
    Ok(n)
}

pub async fn reverify_emails(database: &db::Db, mx: &email::mx::MxChecker, batch: i64) -> Result<u32> {
    let contacts = db::contacts_needing_verification(database, batch).await?;
    let mut n = 0u32;
    for c in &contacts {
        if let Some(ref addr) = c.email {
            let domain = addr.split('@').nth(1).unwrap_or("");
            let m = mx.check_domain(domain).await?;
            if !m.has_mx { db::update_email_status(database, &c.id, "invalid").await?; continue; }
            if let Some(host) = m.mx_hosts.first() {
                match email::verify::verify_smtp(addr, host).await {
                    Ok(email::verify::SmtpResult::Valid) => { db::update_email_status(database, &c.id, "verified").await?; n+=1; }
                    Ok(email::verify::SmtpResult::Invalid) => { db::update_email_status(database, &c.id, "invalid").await?; }
                    Ok(email::verify::SmtpResult::CatchAll) => { db::update_email_status(database, &c.id, "catch-all").await?; }
                    _ => {}
                }
            }
        }
    }
    Ok(n)
}

pub async fn score_all_leads(database: &db::Db, icp: &scoring::IcpProfile) -> Result<u32> {
    let companies = db::list_companies(database, 10000, 0).await?;
    let mut n = 0u32;
    for co in &companies {
        let contacts = db::contacts_by_company(database, &co.id).await?;
        for score in scoring::score_company_contacts(&contacts, co, icp) {
            db::save_lead_score(database, &score).await?; n += 1;
        }
    }
    info!(scored = n, "leads scored"); Ok(n)
}

pub async fn discover_missing_emails(database: &db::Db, mx: &email::mx::MxChecker) -> Result<u32> {
    let rows: Vec<(String,String,String,String)> = sqlx::query_as(
        "SELECT c.id, c.first_name, c.last_name, co.domain FROM contacts c
         JOIN companies co ON co.id = c.company_id WHERE c.email IS NULL AND co.domain IS NOT NULL LIMIT 100"
    ).fetch_all(database).await?;
    let mut n = 0u32;
    for (id, first, last, domain) in &rows {
        let guess = email::pattern::EmailPattern::FirstDotLast.generate(first, last, domain);
        let m = mx.check_domain(domain).await?;
        if m.has_mx { if let Some(host) = m.mx_hosts.first() {
            if let Ok(email::verify::SmtpResult::Valid) = email::verify::verify_smtp(&guess, host).await {
                sqlx::query("UPDATE contacts SET email=?1, email_status='verified' WHERE id=?2")
                    .bind(&guess).bind(id).execute(database).await?;
                n += 1;
            }
        }}
    }
    info!(discovered = n); Ok(n)
}

use anyhow::Result;
use once_cell::sync::Lazy;
use rayon::prelude::*;
use regex::Regex;
use std::collections::HashMap;
use tracing::info;

use nomad::d1::D1Client;

use crate::{AuditStats, BrokenReason, CompanyAuditResult, CompanyRow};

/// Matches hex hashes (16+ chars) or UUIDs — applied after stripping query params.
static HASH_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-f]{16,}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
        .unwrap()
});

/// Job board URL prefixes — website pointing here means no real company site.
const JOB_BOARD_PREFIXES: &[&str] = &[
    "https://job-boards.greenhouse.io",
    "https://boards.greenhouse.io",
    "https://jobs.ashbyhq.com",
    "https://jobs.lever.co",
];

/// Strip query string from a key for hash detection.
fn strip_query(key: &str) -> &str {
    key.split('?').next().unwrap_or(key)
}

/// Job count per company from the GROUP BY query.
#[derive(Debug, Clone, serde::Deserialize)]
struct JobCount {
    company_id: i64,
    cnt: i64,
}

/// Evaluate a single company against all 9 rules.
fn evaluate(company: &CompanyRow, job_count: i64) -> Vec<BrokenReason> {
    let mut reasons = Vec::new();

    let key = company.key.as_deref().unwrap_or("");
    let name = company.name.as_deref().unwrap_or("");
    let key_base = strip_query(key);

    // 1. HashKey — strip query params first, then match hex/UUID
    if !key_base.is_empty() && HASH_RE.is_match(key_base) {
        reasons.push(BrokenReason::HashKey);
    }

    // 2. GarbageKey — ?error=true, URL-encoded %XX in key
    if key.contains("?error=") || key.contains("%20") || key.contains("%25") {
        reasons.push(BrokenReason::GarbageKey);
    }

    // 3. EmptyName
    if name.trim().is_empty() {
        reasons.push(BrokenReason::EmptyName);
    }

    // 4. NameMatchesKey — name literally equals the slug (no human name ever set)
    //    Only flag when key looks non-human: contains ?, %XX, or is a hash
    if !name.is_empty()
        && !key.is_empty()
        && name == key
        && (key.contains('?') || key.contains('%') || HASH_RE.is_match(key_base))
    {
        reasons.push(BrokenReason::NameMatchesKey);
    }

    // 5. NoWebsite
    let website = company.website.as_deref().unwrap_or("").trim();
    if website.is_empty() {
        reasons.push(BrokenReason::NoWebsite);
    }

    // 6. JobBoardWebsite — website is just a job board URL, not a real company site
    if !website.is_empty() {
        let lower = website.to_lowercase();
        if JOB_BOARD_PREFIXES.iter().any(|p| lower.starts_with(p)) {
            reasons.push(BrokenReason::JobBoardWebsite);
        }
    }

    // 7. NoJobs
    if job_count == 0 {
        reasons.push(BrokenReason::NoJobs);
    }

    // 8. CategoryUnknown — only if also missing description/industry/tags
    let cat = company.category.as_deref().unwrap_or("");
    if cat == "UNKNOWN" {
        let desc_empty = company.description.as_deref().unwrap_or("").trim().is_empty();
        let industry_empty = company.industry.as_deref().unwrap_or("").trim().is_empty();
        let tags_empty = company.tags.as_deref().unwrap_or("").trim().is_empty()
            || company.tags.as_deref() == Some("[]");
        if desc_empty && industry_empty && tags_empty {
            reasons.push(BrokenReason::CategoryUnknown);
        }
    }

    // 9. NeverEnriched — no ashby_enriched_at AND no deep_analysis
    let no_ashby = company
        .ashby_enriched_at
        .as_deref()
        .unwrap_or("")
        .trim()
        .is_empty();
    let no_deep = company
        .deep_analysis
        .as_deref()
        .unwrap_or("")
        .trim()
        .is_empty();
    if no_ashby && no_deep {
        reasons.push(BrokenReason::NeverEnriched);
    }

    reasons
}

/// Run the full audit: fetch, evaluate, optionally apply.
pub async fn audit_companies(
    db: &D1Client,
    min_reasons: usize,
    apply: bool,
) -> Result<(AuditStats, Vec<CompanyAuditResult>)> {
    // 1. Count already-hidden
    let hidden_rows = db
        .query(
            "SELECT count(*) as cnt FROM companies WHERE is_hidden = 1",
            None,
        )
        .await?;
    let already_hidden = hidden_rows
        .first()
        .and_then(|r| r.get("cnt"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as usize;

    // 2. Fetch companies + job counts (two queries — batch not supported in direct API mode)
    let company_rows = db
        .query(
            "SELECT id, key, name, website, description, category, industry, tags, \
             score, score_reasons, ashby_enriched_at, deep_analysis, logo_url, linkedin_url \
             FROM companies WHERE is_hidden = 0 OR is_hidden IS NULL",
            None,
        )
        .await?;

    let job_count_rows = db
        .query(
            "SELECT company_id, count(*) as cnt FROM jobs GROUP BY company_id",
            None,
        )
        .await?;

    let companies: Vec<CompanyRow> = company_rows
        .into_iter()
        .map(|v| serde_json::from_value(v).unwrap_or_default())
        .collect();

    let job_counts: Vec<JobCount> = job_count_rows
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    let job_count_map: HashMap<i64, i64> = job_counts
        .into_iter()
        .map(|jc| (jc.company_id, jc.cnt))
        .collect();

    info!(
        "Fetched {} non-hidden companies, {} job count entries",
        companies.len(),
        job_count_map.len()
    );

    // 3. Parallel evaluate
    let audit_results: Vec<CompanyAuditResult> = companies
        .par_iter()
        .map(|c| {
            let jc = job_count_map.get(&c.id).copied().unwrap_or(0);
            let reasons = evaluate(c, jc);
            let is_broken = reasons.len() >= min_reasons;
            CompanyAuditResult {
                company_id: c.id,
                company_key: c.key.clone().unwrap_or_default(),
                company_name: c.name.clone().unwrap_or_default(),
                broken_score: reasons.len(),
                is_broken,
                reasons,
            }
        })
        .collect();

    // 4. Build stats
    let mut stats = AuditStats {
        total: companies.len() + already_hidden,
        already_hidden,
        audited: companies.len(),
        ..Default::default()
    };

    let broken: Vec<&CompanyAuditResult> = audit_results.iter().filter(|r| r.is_broken).collect();
    stats.broken = broken.len();
    stats.healthy = stats.audited - stats.broken;

    for result in &audit_results {
        for reason in &result.reasons {
            *stats.reason_counts.entry(reason.clone()).or_insert(0) += 1;
        }
    }

    // 5. Apply — hide broken companies in chunks of 50
    if apply && !broken.is_empty() {
        let broken_ids: Vec<i64> = broken.iter().map(|r| r.company_id).collect();

        for chunk in broken_ids.chunks(50) {
            let placeholders: Vec<&str> = chunk.iter().map(|_| "?").collect();
            let sql = format!(
                "UPDATE companies SET is_hidden = 1, updated_at = datetime('now') WHERE id IN ({})",
                placeholders.join(", ")
            );
            let params: Vec<serde_json::Value> =
                chunk.iter().map(|id| serde_json::json!(id)).collect();
            db.execute(&sql, Some(params)).await?;
        }

        stats.newly_hidden = broken.len();
        info!("Hidden {} broken companies", stats.newly_hidden);
    }

    Ok((stats, audit_results))
}

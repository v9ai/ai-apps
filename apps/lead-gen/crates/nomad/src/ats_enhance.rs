use anyhow::{Context, Result};
use regex::Regex;
use serde_json::{json, Value};
use tracing::info;

use crate::d1::D1Client;
use crate::status;

/// Parse a Greenhouse URL into (board_token, job_post_id).
fn parse_greenhouse_url(external_id: &str) -> Option<(String, String)> {
    let re = Regex::new(r"greenhouse\.io/([^/]+)/jobs/([^/?#]+)").unwrap();
    re.captures(external_id)
        .map(|c| (c[1].to_string(), c[2].to_string()))
}

/// Parse a Lever URL into (site, posting_id).
fn parse_lever_url(external_id: &str) -> Option<(String, String)> {
    let re = Regex::new(r"lever\.co/([^/]+)/([^/?#]+)").unwrap();
    re.captures(external_id)
        .map(|c| (c[1].to_string(), c[2].to_string()))
}

/// Parse an Ashby URL into (board_name, job_id).
fn parse_ashby_url(external_id: &str, company_key: Option<&str>) -> Option<(String, String)> {
    let re = Regex::new(r"ashbyhq\.com/([^/]+)/([^/?#]+)").unwrap();
    if let Some(c) = re.captures(external_id) {
        return Some((c[1].to_string(), c[2].to_string()));
    }
    // Bare UUID fallback
    if let Some(ck) = company_key {
        if !external_id.starts_with("http") && !ck.is_empty() {
            return Some((ck.to_string(), external_id.to_string()));
        }
    }
    None
}

/// Fetch job data from Greenhouse public API.
async fn fetch_greenhouse(
    http: &reqwest::Client,
    board_token: &str,
    job_post_id: &str,
) -> Result<Value> {
    let url = format!(
        "https://boards-api.greenhouse.io/v1/boards/{}/jobs/{}?questions=true",
        urlencoding::encode(board_token),
        urlencoding::encode(job_post_id),
    );
    let resp = http.get(&url).send().await?;
    if !resp.status().is_success() {
        anyhow::bail!("Greenhouse API error: {}", resp.status());
    }
    Ok(resp.json().await?)
}

/// Fetch job data from Lever public API (tries global then EU).
async fn fetch_lever(http: &reqwest::Client, site: &str, posting_id: &str) -> Result<Value> {
    for base in &[
        "https://api.lever.co/v0/postings",
        "https://api.eu.lever.co/v0/postings",
    ] {
        let url = format!(
            "{}/{}/{}",
            base,
            urlencoding::encode(site),
            urlencoding::encode(posting_id),
        );
        let resp = http.get(&url).send().await?;
        if resp.status().is_success() {
            return Ok(resp.json().await?);
        }
        if resp.status().as_u16() == 404 {
            continue;
        }
        anyhow::bail!("Lever API error: {}", resp.status());
    }
    anyhow::bail!("Lever posting {posting_id} not found on site {site}")
}

/// Fetch job data from Ashby public API.
async fn fetch_ashby(http: &reqwest::Client, board_name: &str, job_id: &str) -> Result<Value> {
    let url = format!(
        "https://api.ashbyhq.com/posting-api/job-board/{}/job/{}",
        urlencoding::encode(board_name),
        urlencoding::encode(job_id),
    );
    let resp = http.get(&url).send().await?;
    if !resp.status().is_success() {
        anyhow::bail!("Ashby API error: {}", resp.status());
    }
    Ok(resp.json().await?)
}

/// Build SET clause columns and values for a Greenhouse job update.
fn build_greenhouse_update(data: &Value) -> (Vec<String>, Vec<Value>) {
    let mut cols = Vec::new();
    let mut vals = Vec::new();

    for col in &[
        "absolute_url", "internal_job_id", "requisition_id", "company_name",
        "first_published", "language",
    ] {
        cols.push(col.to_string());
        vals.push(data.get(col).cloned().unwrap_or(Value::Null));
    }

    for col in &[
        "metadata", "departments", "offices", "questions",
        "location_questions", "compliance", "demographic_questions", "data_compliance",
    ] {
        cols.push(col.to_string());
        let v = data.get(col).cloned().unwrap_or(json!([]));
        vals.push(json!(v.to_string()));
    }

    if let Some(content) = data.get("content").and_then(|v| v.as_str()) {
        cols.push("description".to_string());
        vals.push(json!(content));
    }
    if let Some(name) = data.get("location").and_then(|v| v.get("name")).and_then(|v| v.as_str()) {
        cols.push("location".to_string());
        vals.push(json!(name));
    }

    (cols, vals)
}

/// Build SET clause columns and values for a Lever job update.
fn build_lever_update(data: &Value) -> (Vec<String>, Vec<Value>) {
    let mut cols = Vec::new();
    let mut vals = Vec::new();

    let mut add = |col: &str, val: Value| {
        cols.push(col.to_string());
        vals.push(val);
    };

    add("absolute_url", json!(data.get("hostedUrl").or_else(|| data.get("applyUrl")).and_then(|v| v.as_str())));
    add("company_name", json!(data.get("text").and_then(|v| v.as_str())));
    add("description", json!(data.get("description").or_else(|| data.get("descriptionPlain")).and_then(|v| v.as_str())));
    add("location", json!(data.get("categories").and_then(|c| c.get("location")).and_then(|v| v.as_str())));
    add("categories", json!(data.get("categories").map(|v| v.to_string())));
    add("workplace_type", json!(data.get("workplaceType").and_then(|v| v.as_str())));
    add("country", json!(data.get("country").and_then(|v| v.as_str())));

    (cols, vals)
}

/// Build SET clause columns and values for an Ashby job update.
fn build_ashby_update(data: &Value, board_name: &str) -> (Vec<String>, Vec<Value>) {
    let mut cols = Vec::new();
    let mut vals = Vec::new();

    let mut add = |col: &str, val: Value| {
        cols.push(col.to_string());
        vals.push(val);
    };

    add("absolute_url", json!(data.get("jobUrl").or_else(|| data.get("applyUrl")).and_then(|v| v.as_str())));
    add("company_name", json!(board_name));
    add("description", json!(data.get("descriptionHtml").or_else(|| data.get("descriptionPlain")).and_then(|v| v.as_str())));
    add("location", json!(data.get("locationName").or_else(|| data.get("location")).and_then(|v| v.as_str())));

    let is_remote = data.get("isRemote").and_then(|v| v.as_bool()).unwrap_or(false);
    add("workplace_type", json!(if is_remote { "remote" } else { "" }));

    let country = data
        .get("address")
        .and_then(|a| a.get("postalAddress"))
        .and_then(|p| p.get("addressCountry"))
        .and_then(|v| v.as_str());
    add("country", json!(country));

    add("ashby_is_remote", json!(if is_remote { 1 } else { 0 }));
    add("ashby_published_at", json!(data.get("publishedAt").and_then(|v| v.as_str())));
    add("first_published", json!(data.get("publishedAt").and_then(|v| v.as_str())));

    if let Some(sec) = data.get("secondaryLocations") {
        add("ashby_secondary_locations", json!(sec.to_string()));
    }
    if let Some(addr) = data.get("address") {
        add("ashby_address", json!(addr.to_string()));
    }

    (cols, vals)
}

/// Enhance a single job by fetching from its ATS API and updating D1.
pub async fn enhance_job(db: &D1Client, http: &reqwest::Client, job: &Value) -> Result<bool> {
    let kind = job
        .get("source_kind")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let external_id = job
        .get("external_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let company_key = job.get("company_key").and_then(|v| v.as_str());
    let job_id = job.get("id").and_then(|v| v.as_i64()).unwrap_or(0);

    let (cols, vals) = match kind {
        "greenhouse" => {
            let (bt, jp) =
                parse_greenhouse_url(external_id).context("Cannot parse Greenhouse URL")?;
            let data = fetch_greenhouse(http, &bt, &jp).await?;
            build_greenhouse_update(&data)
        }
        "lever" => {
            let (site, pid) = parse_lever_url(external_id).context("Cannot parse Lever URL")?;
            let data = fetch_lever(http, &site, &pid).await?;
            build_lever_update(&data)
        }
        "ashby" => {
            let (bn, jid) =
                parse_ashby_url(external_id, company_key).context("Cannot parse Ashby URL")?;
            let data = fetch_ashby(http, &bn, &jid).await?;
            build_ashby_update(&data, &bn)
        }
        _ => anyhow::bail!("Unsupported source_kind: {kind}"),
    };

    if !cols.is_empty() {
        let set_parts: Vec<String> = cols.iter().map(|c| format!("{c} = ?")).collect();
        let mut all_vals = vals;
        all_vals.push(json!(status::ENHANCED));
        all_vals.push(json!(job_id));
        let sql = format!(
            "UPDATE jobs SET {}, status = ?, updated_at = datetime('now') WHERE id = ?",
            set_parts.join(", ")
        );
        db.execute(&sql, Some(all_vals)).await?;
    }

    Ok(true)
}

/// Enhance a single job by ID: fetch from ATS API, update D1, return refreshed JobRow.
/// Enhancement failure is non-fatal — returns the existing row with a warning.
pub async fn enhance_single_by_id(db: &D1Client, job_id: i64) -> Result<crate::JobRow> {
    let http = reqwest::Client::new();

    // Fetch minimal row for ATS info
    let rows = db
        .query(
            "SELECT id, external_id, source_kind, company_key FROM jobs WHERE id = ? LIMIT 1",
            Some(vec![json!(job_id)]),
        )
        .await?;

    let row = rows
        .first()
        .context(format!("Job {job_id} not found"))?;

    let kind = row.get("source_kind").and_then(|v| v.as_str()).unwrap_or("");
    let is_ats = matches!(kind, "greenhouse" | "lever" | "ashby");

    if is_ats {
        match enhance_job(db, &http, row).await {
            Ok(_) => info!("Enhanced job {job_id} from {kind}"),
            Err(e) => {
                tracing::warn!("Enhancement failed for job {job_id}, proceeding with existing data: {e}");
                // Advance status so pipeline continues
                let _ = db
                    .execute(
                        "UPDATE jobs SET status = 'enhanced', updated_at = datetime('now') WHERE id = ?",
                        Some(vec![json!(job_id)]),
                    )
                    .await;
            }
        }
    } else {
        // Non-ATS: just advance status
        db.execute(
            "UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ? AND (status IS NULL OR status = ?)",
            Some(vec![json!(status::ENHANCED), json!(job_id), json!(status::NEW)]),
        )
        .await?;
    }

    // Re-fetch full row with updated data
    let jobs: Vec<crate::JobRow> = db
        .query_as(
            &format!("SELECT {} FROM jobs WHERE id = ? LIMIT 1", crate::CLASSIFY_SELECT),
            Some(vec![json!(job_id)]),
        )
        .await?;

    jobs.into_iter()
        .next()
        .context(format!("Job {job_id} not found after enhancement"))
}

/// Batch enhance all jobs at status='new'.
pub async fn enhance_batch(db: &D1Client, limit: u32) -> Result<EnhanceStats> {
    let http = reqwest::Client::new();

    // Promote non-ATS jobs directly
    db.execute(
        "UPDATE jobs SET status = ?, updated_at = datetime('now') \
         WHERE (status IS NULL OR status = ?) \
         AND source_kind NOT IN ('greenhouse', 'lever', 'ashby')",
        Some(vec![json!(status::ENHANCED), json!(status::NEW)]),
    )
    .await?;

    let rows = db
        .query(
            "SELECT id, external_id, source_kind, company_key FROM jobs \
             WHERE (status IS NULL OR status = ?) \
             AND source_kind IN ('greenhouse', 'lever', 'ashby') \
             ORDER BY created_at DESC LIMIT ?",
            Some(vec![json!(status::NEW), json!(limit)]),
        )
        .await?;

    info!("Found {} ATS jobs to enhance", rows.len());

    let mut stats = EnhanceStats::default();

    for row in &rows {
        let job_id = row.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
        match enhance_job(db, &http, row).await {
            Ok(_) => {
                stats.enhanced += 1;
                info!("Enhanced job {job_id}");
            }
            Err(e) => {
                tracing::error!("Error enhancing job {job_id}: {e}");
                stats.errors += 1;
                // Advance to enhanced anyway so pipeline continues
                let _ = db
                    .execute(
                        "UPDATE jobs SET status = 'enhanced', updated_at = datetime('now') WHERE id = ?",
                        Some(vec![json!(job_id)]),
                    )
                    .await;
            }
        }
        // Rate limit ATS API calls
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    Ok(stats)
}

#[derive(Debug, Default)]
pub struct EnhanceStats {
    pub enhanced: u32,
    pub errors: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_greenhouse_url() {
        let (bt, jp) = parse_greenhouse_url(
            "https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004",
        )
        .unwrap();
        assert_eq!(bt, "grafanalabs");
        assert_eq!(jp, "5802159004");
    }

    #[test]
    fn parses_lever_url() {
        let (site, pid) =
            parse_lever_url("https://jobs.lever.co/leverdemo/abc-123").unwrap();
        assert_eq!(site, "leverdemo");
        assert_eq!(pid, "abc-123");
    }

    #[test]
    fn parses_ashby_url() {
        let (bn, jid) =
            parse_ashby_url("https://jobs.ashbyhq.com/livekit/f152aa9f", None).unwrap();
        assert_eq!(bn, "livekit");
        assert_eq!(jid, "f152aa9f");
    }

    #[test]
    fn parses_ashby_bare_uuid() {
        let (bn, jid) = parse_ashby_url("f152aa9f-1234", Some("livekit")).unwrap();
        assert_eq!(bn, "livekit");
        assert_eq!(jid, "f152aa9f-1234");
    }
}

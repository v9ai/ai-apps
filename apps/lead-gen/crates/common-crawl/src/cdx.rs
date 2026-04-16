use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;

const CDX_BASE: &str = "https://index.commoncrawl.org";
const S3_BASE: &str = "https://data.commoncrawl.org";

/// How many recent CC indices to search before giving up.
const MAX_INDICES: usize = 3;

#[derive(Debug, Deserialize)]
struct CollInfo {
    id: String,
}

#[derive(Debug, Clone)]
pub struct CdxRecord {
    pub url: String,
    pub timestamp: String,
    pub crawl_id: String,
    pub filename: String,
    pub offset: u64,
    pub length: u64,
}

/// Returns the ids of the `n` most recent Common Crawl indices.
pub async fn recent_crawl_ids(client: &Client, n: usize) -> Result<Vec<String>> {
    let infos: Vec<CollInfo> = client
        .get(format!("{CDX_BASE}/collinfo.json"))
        .send()
        .await
        .context("fetching collinfo")?
        .json()
        .await
        .context("parsing collinfo")?;
    Ok(infos.into_iter().take(n).map(|c| c.id).collect())
}

/// Query CDX across the latest `MAX_INDICES` crawl indices.
/// Returns deduplicated records (by URL), preferring the most recent capture.
/// Filters to status-200 HTML pages that pass `is_interesting()`.
pub async fn query_domain_multi(
    client: &Client,
    domain: &str,
    per_index_limit: usize,
) -> Result<(String, Vec<CdxRecord>)> {
    let ids = recent_crawl_ids(client, MAX_INDICES).await?;
    let primary = ids.first().cloned().unwrap_or_default();

    let mut seen_urls = std::collections::HashSet::new();
    let mut all = Vec::new();

    for crawl_id in &ids {
        let batch = query_one_index(client, crawl_id, domain, per_index_limit).await;
        match batch {
            Ok(records) => {
                for r in records {
                    if seen_urls.insert(r.url.clone()) {
                        all.push(r);
                    }
                }
                if !all.is_empty() {
                    // Found results — no need to try older indices
                    break;
                }
            }
            Err(e) => tracing::warn!(crawl_id = %crawl_id, domain = %domain, error = %e, "CDX index query failed"),
        }
    }

    // Sort by descending timestamp (most recent first)
    all.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok((primary, all))
}

async fn query_one_index(
    client: &Client,
    crawl_id: &str,
    domain: &str,
    limit: usize,
) -> Result<Vec<CdxRecord>> {
    let endpoint = format!(
        "{CDX_BASE}/{crawl_id}-index\
         ?url={domain}/*\
         &matchType=domain\
         &output=json\
         &limit={limit}\
         &filter=status:200\
         &filter=mime:text/html",
    );
    let text = client
        .get(&endpoint)
        .send()
        .await
        .context("CDX query")?
        .text()
        .await
        .context("CDX response body")?;

    let mut records = Vec::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match parse_cdx_line(line, crawl_id) {
            Ok(rec) if is_interesting(&rec.url) => records.push(rec),
            Ok(_) => {}
            Err(e) => tracing::debug!(line, error = %e, "skipping CDX line"),
        }
    }
    Ok(records)
}

fn parse_cdx_line(line: &str, crawl_id: &str) -> Result<CdxRecord> {
    #[derive(Deserialize)]
    struct Raw {
        url: String,
        timestamp: String,
        filename: String,
        offset: serde_json::Value,
        length: serde_json::Value,
    }
    let raw: Raw = serde_json::from_str(line).context("JSON parse")?;
    Ok(CdxRecord {
        url: raw.url,
        timestamp: raw.timestamp,
        crawl_id: crawl_id.to_string(),
        filename: raw.filename,
        offset: coerce_u64(&raw.offset).context("offset")?,
        length: coerce_u64(&raw.length).context("length")?,
    })
}

fn coerce_u64(v: &serde_json::Value) -> Result<u64> {
    match v {
        serde_json::Value::Number(n) => n.as_u64().ok_or_else(|| anyhow::anyhow!("not u64")),
        serde_json::Value::String(s) => s.parse::<u64>().context("parse u64"),
        _ => Err(anyhow::anyhow!("unexpected type")),
    }
}

/// Fetch the HTML body of one WARC record from Common Crawl S3 using a byte-range request.
pub async fn fetch_warc_html(client: &Client, record: &CdxRecord) -> Result<String> {
    let range = format!("bytes={}-{}", record.offset, record.offset + record.length - 1);
    let bytes = client
        .get(format!("{S3_BASE}/{}", record.filename))
        .header("Range", range)
        .send()
        .await
        .context("WARC S3 fetch")?
        .bytes()
        .await
        .context("WARC body")?;

    parse_warc_html(&bytes)
}

fn parse_warc_html(compressed: &[u8]) -> Result<String> {
    use flate2::read::MultiGzDecoder;
    use std::io::Read;

    let mut decoder = MultiGzDecoder::new(compressed);
    let mut raw = Vec::new();
    decoder.read_to_end(&mut raw).context("gzip decompress")?;

    let text = String::from_utf8_lossy(&raw);
    let after_warc = skip_past_blank(&text)
        .ok_or_else(|| anyhow::anyhow!("no WARC header boundary"))?;
    let body = skip_past_blank(after_warc)
        .ok_or_else(|| anyhow::anyhow!("no HTTP header boundary"))?;

    Ok(body.to_string())
}

fn skip_past_blank(text: &str) -> Option<&str> {
    if let Some(pos) = text.find("\r\n\r\n") {
        return Some(&text[pos + 4..]);
    }
    if let Some(pos) = text.find("\n\n") {
        return Some(&text[pos + 2..]);
    }
    None
}

/// Fetch an HTML page directly via HTTP (for depth-1 discovery links not in CC).
pub async fn fetch_live_html(client: &Client, url: &str) -> anyhow::Result<String> {
    let text = client
        .get(url)
        .header("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
        .send()
        .await
        .context("live fetch")?
        .text()
        .await
        .context("live fetch body")?;
    Ok(text)
}

/// Construct a placeholder CdxRecord for a live-fetched page (no WARC entry).
pub fn synthetic_record(url: &str, crawl_id: &str) -> CdxRecord {
    CdxRecord {
        url: url.to_string(),
        timestamp: chrono::Utc::now().format("%Y%m%d%H%M%S").to_string(),
        crawl_id: crawl_id.to_string(),
        filename: String::new(),
        offset: 0,
        length: 0,
    }
}

/// Page type score (0.0–1.0). Higher = more likely to contain contacts.
pub fn page_score(url: &str) -> f32 {
    let path = url_path(url).to_lowercase();
    // Exact or prefix match against ranked tiers
    const TIER1: &[&str] = &["/team", "/our-team", "/the-team", "/meet-the-team", "/people", "/staff", "/leadership", "/management", "/about/team", "/about/people"];
    const TIER2: &[&str] = &["/about", "/about-us", "/about_us", "/who-we-are", "/company", "/company/about"];
    const TIER3: &[&str] = &["/contact", "/contact-us", "/careers", "/jobs", "/services", "/what-we-do", "/solutions"];

    for t in TIER1 { if path == *t || path.starts_with(&format!("{t}/")) { return 1.0; } }
    for t in TIER2 { if path == *t || path.starts_with(&format!("{t}/")) { return 0.7; } }
    for t in TIER3 { if path == *t || path.starts_with(&format!("{t}/")) { return 0.4; } }
    if path == "/" { return 0.3; }
    0.0
}

/// Subdomains that never contain company-info pages.
const NOISE_SUBDOMAINS: &[&str] = &[
    "careers.", "jobs.", "apply.", "talent.", "hire.",
    "blog.", "news.", "press.", "media.",
    "api.", "cdn.", "assets.", "static.", "img.", "images.",
    "help.", "support.", "docs.", "developers.", "dev.",
    "shop.", "store.", "ecommerce.",
    "mail.", "webmail.", "smtp.",
];

/// Query-string params that are pure tracking noise (page content is identical).
const TRACKING_PARAMS: &[&str] = &[
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "source", "fbclid", "gclid", "msclkid", "ref_src",
];

pub fn is_interesting(url: &str) -> bool {
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let host = after_scheme.split('/').next().unwrap_or("").to_lowercase();
    if NOISE_SUBDOMAINS.iter().any(|prefix| host.starts_with(prefix)) {
        return false;
    }
    // Reject URLs whose query string is entirely tracking params
    if let Some(qs) = url.find('?').map(|i| &url[i + 1..]) {
        let non_tracking = qs.split('&')
            .filter(|p| {
                let key = p.split('=').next().unwrap_or("");
                !TRACKING_PARAMS.contains(&key)
            })
            .count();
        if non_tracking == 0 && !qs.is_empty() {
            return false;
        }
    }
    page_score(url) > 0.0
}

pub fn url_path(url: &str) -> &str {
    url.split("://")
        .nth(1)
        .and_then(|s| s.find('/').map(|i| &s[i..]))
        .unwrap_or("/")
        .split('?')
        .next()
        .unwrap_or("/")
}

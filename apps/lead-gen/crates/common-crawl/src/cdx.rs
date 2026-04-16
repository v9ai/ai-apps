use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;

const CDX_BASE: &str = "https://index.commoncrawl.org";
const S3_BASE: &str = "https://data.commoncrawl.org";

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

/// Returns the id of the most recent Common Crawl index (e.g. "CC-MAIN-2025-13").
pub async fn latest_crawl_id(client: &Client) -> Result<String> {
    let infos: Vec<CollInfo> = client
        .get(format!("{CDX_BASE}/collinfo.json"))
        .send()
        .await
        .context("fetching collinfo")?
        .json()
        .await
        .context("parsing collinfo")?;
    infos
        .into_iter()
        .next()
        .map(|c| c.id)
        .ok_or_else(|| anyhow::anyhow!("collinfo returned empty list"))
}

/// Query the CDX API for up to `limit` HTML snapshots of `domain`.
/// Only status-200 records are returned.
pub async fn query_domain(
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
            Ok(rec) => records.push(rec),
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
    let offset = coerce_u64(&raw.offset).context("offset")?;
    let length = coerce_u64(&raw.length).context("length")?;
    Ok(CdxRecord {
        url: raw.url,
        timestamp: raw.timestamp,
        crawl_id: crawl_id.to_string(),
        filename: raw.filename,
        offset,
        length,
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

    // Find end of WARC headers, then end of HTTP headers.
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

/// True if the URL path is a high-value company page worth fetching.
pub fn is_interesting(url: &str) -> bool {
    let path = url
        .split("://")
        .nth(1)
        .and_then(|s| s.find('/').map(|i| &s[i..]))
        .unwrap_or("/")
        .split('?')
        .next()
        .unwrap_or("/")
        .to_lowercase();

    const KEEP: &[&str] = &[
        "/", "/about", "/about-us", "/about_us", "/who-we-are",
        "/team", "/our-team", "/the-team", "/meet-the-team",
        "/leadership", "/management", "/people", "/staff",
        "/contact", "/contact-us",
        "/services", "/what-we-do", "/solutions",
        "/careers", "/jobs",
    ];
    // Exact match or starts-with for multi-segment paths like /about/team
    KEEP.iter().any(|&keep| path == keep || path.starts_with(&format!("{keep}/")))
}

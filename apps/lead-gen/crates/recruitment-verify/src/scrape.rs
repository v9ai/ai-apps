/// Fetch a company website and extract visible text for embedding.
///
/// Mirrors the approach in `metal/src/kernel/html_extractor.rs` but simplified:
/// title + meta description + headings + main content, truncated to 2 000 chars.

use anyhow::{Context, Result};
use scraper::{Html, Selector};

const MAX_TEXT_CHARS: usize = 2_000;
const FETCH_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// Fetch raw HTML from a URL.
pub async fn fetch_html(client: &reqwest::Client, url: &str) -> Result<String> {
    let resp = client
        .get(url)
        .timeout(FETCH_TIMEOUT)
        .header("User-Agent", "Mozilla/5.0 (compatible; RecruitmentVerify/0.1)")
        .send()
        .await
        .with_context(|| format!("GET {url}"))?;

    let status = resp.status();
    if !status.is_success() {
        anyhow::bail!("HTTP {status} for {url}");
    }

    resp.text()
        .await
        .with_context(|| format!("reading body from {url}"))
}

/// Extract visible text from raw HTML: title, meta description, headings, main content.
pub fn extract_text(html: &str) -> String {
    let doc = Html::parse_document(html);
    let mut parts: Vec<String> = Vec::new();

    // Title
    if let Ok(sel) = Selector::parse("title") {
        if let Some(el) = doc.select(&sel).next() {
            let t = el.text().collect::<String>();
            let t = t.trim();
            if !t.is_empty() {
                parts.push(t.to_string());
            }
        }
    }

    // Meta description
    if let Ok(sel) = Selector::parse(r#"meta[name="description"]"#) {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let c = content.trim();
                if !c.is_empty() {
                    parts.push(c.to_string());
                }
            }
        }
    }

    // OG description
    if let Ok(sel) = Selector::parse(r#"meta[property="og:description"]"#) {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let c = content.trim();
                if !c.is_empty() {
                    parts.push(c.to_string());
                }
            }
        }
    }

    // Headings h1–h3
    for tag in &["h1", "h2", "h3"] {
        if let Ok(sel) = Selector::parse(tag) {
            for el in doc.select(&sel) {
                let t: String = el.text().collect();
                let t = t.trim();
                if !t.is_empty() {
                    parts.push(t.to_string());
                }
            }
        }
    }

    // Main / article body text
    let body_sel = Selector::parse("main, article, [role='main']")
        .or_else(|_| Selector::parse("body"))
        .expect("body selector");

    if let Some(el) = doc.select(&body_sel).next() {
        let text: String = el
            .text()
            .map(|t| t.trim())
            .filter(|t| !t.is_empty())
            .collect::<Vec<_>>()
            .join(" ");
        if !text.is_empty() {
            parts.push(text);
        }
    }

    let joined = parts.join(" | ");

    // Truncate to budget
    if joined.len() > MAX_TEXT_CHARS {
        joined[..MAX_TEXT_CHARS].to_string()
    } else {
        joined
    }
}

/// Fetch + extract in one call.
pub async fn fetch_and_extract(client: &reqwest::Client, url: &str) -> Result<String> {
    let html = fetch_html(client, url).await?;
    let text = extract_text(&html);
    if text.is_empty() {
        anyhow::bail!("no visible text extracted from {url}");
    }
    Ok(text)
}

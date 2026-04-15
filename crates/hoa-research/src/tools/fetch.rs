//! URL content fetcher — strips HTML to plain text.

use reqwest::Client;

const SKIP_DOMAINS: &[&str] = &[
    "twitter.com", "x.com", "linkedin.com", "youtube.com",
    "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
    "amazon.com", "goodreads.com",
];

/// Fetch a URL and return plain text (HTML stripped). Max 12k chars.
pub async fn fetch_url(url: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        if let Some(domain) = parsed.host_str() {
            let d = domain.to_lowercase();
            if SKIP_DOMAINS.iter().any(|skip| d.contains(skip)) {
                return format!("(skipped — blocked domain: {domain})");
            }
        }
    }

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (compatible; ResearchBot/1.0)")
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let resp = match client.get(url).send().await {
        Ok(r) => r,
        Err(e) => return format!("Fetch failed: {e}"),
    };

    if !resp.status().is_success() {
        return format!("(HTTP {})", resp.status());
    }

    let html = match resp.text().await {
        Ok(t) => t,
        Err(e) => return format!("Fetch failed: {e}"),
    };

    // Strip scripts, styles, tags
    let text = strip_html(&html);
    let truncated = &text[..text.len().min(12_000)];
    truncated.to_string()
}

fn strip_html(html: &str) -> String {
    // Remove script/style blocks
    let re_script = regex_lite::Regex::new(r"(?si)<script[^>]*>.*?</script>").unwrap();
    let re_style = regex_lite::Regex::new(r"(?si)<style[^>]*>.*?</style>").unwrap();
    let re_tag = regex_lite::Regex::new(r"<[^>]+>").unwrap();
    let re_ws = regex_lite::Regex::new(r"\s+").unwrap();

    let text = re_script.replace_all(html, " ");
    let text = re_style.replace_all(&text, " ");
    let text = re_tag.replace_all(&text, " ");
    let text = re_ws.replace_all(&text, " ");
    text.trim().to_string()
}

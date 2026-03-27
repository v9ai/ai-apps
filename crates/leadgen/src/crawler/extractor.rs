use regex::Regex;
use scraper::{Html, Selector};

pub struct PageContent {
    pub url: String,
    pub title: String,
    pub meta_description: String,
    pub body_text: String,
    pub emails_found: Vec<String>,
    pub links: Vec<String>,
}

pub fn extract(html: &str, url: &str) -> PageContent {
    let doc = Html::parse_document(html);
    let title = select_text(&doc, "title");
    let meta_description = select_attr(&doc, "meta[name='description']", "content")
        .unwrap_or_default();
    let body_text = extract_visible_text(&doc);
    let emails_found = extract_emails(html);
    let links = extract_links(&doc, url);

    PageContent { url: url.to_string(), title, meta_description, body_text, emails_found, links }
}

fn select_text(doc: &Html, selector: &str) -> String {
    Selector::parse(selector).ok()
        .and_then(|sel| doc.select(&sel).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default()
}

fn select_attr(doc: &Html, selector: &str, attr: &str) -> Option<String> {
    Selector::parse(selector).ok()
        .and_then(|sel| doc.select(&sel).next())
        .and_then(|el| el.value().attr(attr))
        .map(|s| s.to_string())
}

fn extract_visible_text(doc: &Html) -> String {
    let body_sel = match Selector::parse("body") { Ok(s) => s, Err(_) => return String::new() };
    let body = match doc.select(&body_sel).next() { Some(b) => b, None => return String::new() };

    let mut parts: Vec<String> = Vec::new();
    for node in body.text() {
        let trimmed = node.trim();
        if !trimmed.is_empty() { parts.push(trimmed.to_string()); }
    }

    let full = parts.join(" ");
    let re = Regex::new(r"\s+").unwrap();
    re.replace_all(&full, " ").trim().to_string()
}

fn extract_emails(html: &str) -> Vec<String> {
    let re = Regex::new(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}").unwrap();
    let mut emails: Vec<String> = re.find_iter(html).map(|m| m.as_str().to_lowercase()).collect();
    emails.sort();
    emails.dedup();
    emails.retain(|e| {
        !e.ends_with(".png") && !e.ends_with(".jpg") && !e.contains("example.com")
        && !e.contains("sentry.io") && !e.starts_with("noreply")
    });
    emails
}

fn extract_links(doc: &Html, base_url: &str) -> Vec<String> {
    let sel = match Selector::parse("a[href]") { Ok(s) => s, Err(_) => return vec![] };
    let base_domain = base_url.split("://").nth(1).and_then(|s| s.split('/').next()).unwrap_or("");

    doc.select(&sel)
        .filter_map(|el| el.value().attr("href"))
        .filter_map(|href| {
            if href.starts_with("http") { Some(href.to_string()) }
            else if href.starts_with('/') { Some(format!("https://{}{}", base_domain, href)) }
            else { None }
        })
        .filter(|url| url.contains(base_domain) || url.contains("linkedin.com"))
        .collect()
}

pub fn truncate_for_llm(text: &str, max_bytes: usize) -> String {
    if text.len() <= max_bytes { return text.to_string(); }
    // Find a valid char boundary at or before max_bytes
    let mut end = max_bytes;
    while end > 0 && !text.is_char_boundary(end) { end -= 1; }
    let truncated = &text[..end];
    if let Some(pos) = truncated.rfind(". ") { truncated[..=pos].to_string() }
    else { format!("{}...", truncated) }
}

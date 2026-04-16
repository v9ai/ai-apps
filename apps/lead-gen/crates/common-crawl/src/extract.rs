use scraper::{Html, Selector};

/// Minimal page extraction: title + visible text + email addresses.
#[derive(Debug, Default)]
pub struct PageContent {
    pub title: Option<String>,
    pub text: String,
    pub emails: Vec<String>,
}

pub fn extract(html: &str, source_url: &str) -> PageContent {
    let doc = Html::parse_document(html);
    let mut out = PageContent::default();

    // Title
    if let Ok(sel) = Selector::parse("title") {
        out.title = doc
            .select(&sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty());
    }

    // Strip script/style, collect body text
    let text_nodes: Vec<String> = doc
        .root_element()
        .text()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();
    out.text = text_nodes.join(" ");

    // Emails from mailto: links
    if let Ok(sel) = Selector::parse("a[href^='mailto:']") {
        for el in doc.select(&sel) {
            if let Some(href) = el.value().attr("href") {
                let email = href.trim_start_matches("mailto:").split('?').next().unwrap_or("").trim();
                if !email.is_empty() {
                    out.emails.push(email.to_lowercase());
                }
            }
        }
    }

    // Emails from text via simple regex-free scan
    out.emails.extend(scan_emails(&out.text));
    out.emails.extend(scan_emails(source_url));
    out.emails.sort();
    out.emails.dedup();

    out
}

fn scan_emails(text: &str) -> Vec<String> {
    let mut emails = Vec::new();
    for word in text.split_whitespace() {
        let word = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '.' && c != '-' && c != '+');
        if let Some(at) = word.find('@') {
            let local = &word[..at];
            let domain = &word[at + 1..];
            if !local.is_empty() && domain.contains('.') && domain.len() > 3 {
                emails.push(word.to_lowercase());
            }
        }
    }
    emails
}

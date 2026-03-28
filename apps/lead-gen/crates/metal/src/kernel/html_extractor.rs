//! DOM-aware HTML profile extraction using the `scraper` crate.
//!
//! Extracts structured signals (JSON-LD, meta tags, OG tags, headings,
//! main content) from raw HTML before any text flattening occurs.
//! Designed to feed into the sgai-qwen3-1.7b structured extraction model.

use scraper::{Html, Selector};

/// Structured profile extracted from a single HTML page.
#[derive(Debug, Clone, Default)]
pub struct HtmlProfile {
    /// Parsed JSON-LD from `<script type="application/ld+json">`.
    pub jsonld: Option<serde_json::Value>,
    /// `<meta name="description">` content.
    pub meta_description: Option<String>,
    /// `<meta property="og:title">` content.
    pub og_title: Option<String>,
    /// `<meta property="og:description">` content.
    pub og_description: Option<String>,
    /// `<link rel="canonical">` href.
    pub canonical_url: Option<String>,
    /// Text from `<h1>` and `<h2>` elements.
    pub headings: Vec<String>,
    /// Visible text from `<main>` or `<article>`, or best-guess body content.
    /// Smart-truncated to stay within token budget.
    pub main_content: String,
    /// Whether a careers/jobs section was detected.
    pub has_careers_section: bool,
    /// Whether a team/about section was detected.
    pub has_team_section: bool,
    /// Email addresses found in `mailto:` links and visible text.
    pub structured_emails: Vec<String>,
}

/// Maximum characters for main_content (roughly ~4096 tokens).
const MAX_CONTENT_CHARS: usize = 12_000;

/// Extract a structured profile from raw HTML.
pub fn extract_profile(html: &str) -> HtmlProfile {
    let document = Html::parse_document(html);
    let mut profile = HtmlProfile::default();

    extract_jsonld(&document, &mut profile);
    extract_meta_tags(&document, &mut profile);
    extract_canonical(&document, &mut profile);
    extract_headings(&document, &mut profile);
    extract_main_content(&document, &mut profile);
    extract_mailto_emails(&document, &mut profile);
    detect_sections(&document, &mut profile);

    profile
}

/// Format the profile as a markdown context string for LLM consumption.
pub fn profile_to_markdown(profile: &HtmlProfile) -> String {
    let mut parts = Vec::new();

    // JSON-LD first — richest structured data
    if let Some(ref jsonld) = profile.jsonld {
        if let Ok(pretty) = serde_json::to_string_pretty(jsonld) {
            parts.push(format!("## Structured Data (JSON-LD)\n```json\n{pretty}\n```"));
        }
    }

    // Meta / OG tags
    let mut meta_lines = Vec::new();
    if let Some(ref d) = profile.meta_description {
        meta_lines.push(format!("- **Description:** {d}"));
    }
    if let Some(ref t) = profile.og_title {
        meta_lines.push(format!("- **OG Title:** {t}"));
    }
    if let Some(ref d) = profile.og_description {
        meta_lines.push(format!("- **OG Description:** {d}"));
    }
    if let Some(ref u) = profile.canonical_url {
        meta_lines.push(format!("- **Canonical URL:** {u}"));
    }
    if !meta_lines.is_empty() {
        parts.push(format!("## Metadata\n{}", meta_lines.join("\n")));
    }

    // Headings
    if !profile.headings.is_empty() {
        let h = profile.headings.iter().map(|h| format!("- {h}")).collect::<Vec<_>>().join("\n");
        parts.push(format!("## Page Headings\n{h}"));
    }

    // Section signals
    let mut signals = Vec::new();
    if profile.has_careers_section {
        signals.push("Careers/Jobs page detected");
    }
    if profile.has_team_section {
        signals.push("Team/About page detected");
    }
    if !profile.structured_emails.is_empty() {
        signals.push("Contact emails found");
    }
    if !signals.is_empty() {
        parts.push(format!("## Signals\n{}", signals.join(", ")));
    }

    // Main content last — fills remaining budget
    if !profile.main_content.is_empty() {
        parts.push(format!("## Page Content\n{}", profile.main_content));
    }

    parts.join("\n\n")
}

// ── Extractors ──────────────────────────────────────────────────

fn extract_jsonld(doc: &Html, profile: &mut HtmlProfile) {
    let sel = Selector::parse(r#"script[type="application/ld+json"]"#).unwrap();
    for element in doc.select(&sel) {
        let text = element.text().collect::<String>();
        let trimmed = text.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
            // Prefer Organization/LocalBusiness types over generic WebSite
            if is_org_type(&val) || profile.jsonld.is_none() {
                profile.jsonld = Some(val);
                if is_org_type(profile.jsonld.as_ref().unwrap()) {
                    break; // Found org-type, stop searching
                }
            }
        }
    }
}

fn is_org_type(val: &serde_json::Value) -> bool {
    let type_str = val.get("@type").and_then(|v| v.as_str()).unwrap_or("");
    matches!(
        type_str,
        "Organization" | "Corporation" | "LocalBusiness" | "Company"
    )
}

fn extract_meta_tags(doc: &Html, profile: &mut HtmlProfile) {
    // <meta name="description" content="...">
    if let Some(el) = select_first(doc, r#"meta[name="description"]"#) {
        profile.meta_description = attr(&el, "content");
    }

    // <meta property="og:title" content="...">
    if let Some(el) = select_first(doc, r#"meta[property="og:title"]"#) {
        profile.og_title = attr(&el, "content");
    }

    // <meta property="og:description" content="...">
    if let Some(el) = select_first(doc, r#"meta[property="og:description"]"#) {
        profile.og_description = attr(&el, "content");
    }
}

fn extract_canonical(doc: &Html, profile: &mut HtmlProfile) {
    if let Some(el) = select_first(doc, r#"link[rel="canonical"]"#) {
        profile.canonical_url = attr(&el, "href");
    }
}

fn extract_headings(doc: &Html, profile: &mut HtmlProfile) {
    for tag in &["h1", "h2"] {
        let sel = Selector::parse(tag).unwrap();
        for el in doc.select(&sel) {
            let text = el.text().collect::<String>();
            let trimmed = collapse_whitespace(&text);
            if !trimmed.is_empty() && trimmed.len() < 200 {
                profile.headings.push(trimmed);
            }
        }
    }
}

fn extract_main_content(doc: &Html, profile: &mut HtmlProfile) {
    // Try <main>, then <article>, then <div role="main">, then <body>
    let selectors = ["main", "article", r#"div[role="main"]"#, "body"];

    for sel_str in &selectors {
        if let Some(el) = select_first(doc, sel_str) {
            let text = el.text().collect::<String>();
            let cleaned = collapse_whitespace(&text);
            if cleaned.len() > 50 {
                profile.main_content = smart_truncate(&cleaned, MAX_CONTENT_CHARS);
                return;
            }
        }
    }
}

fn extract_mailto_emails(doc: &Html, profile: &mut HtmlProfile) {
    let sel = Selector::parse("a[href]").unwrap();
    for el in doc.select(&sel) {
        if let Some(href) = el.value().attr("href") {
            let lower_href = href.to_lowercase();
            if !lower_href.starts_with("mailto:") {
                continue;
            }
            let email = &href[7..]; // skip "mailto:" (7 chars)
            // Strip query params (?subject=...)
            let email = email.split('?').next().unwrap_or(email);
            let email = email.trim().to_lowercase();
            if email.contains('@') && email.contains('.') && !profile.structured_emails.contains(&email) {
                profile.structured_emails.push(email);
            }
        }
    }
}

fn detect_sections(doc: &Html, profile: &mut HtmlProfile) {
    let career_keywords = ["careers", "jobs", "open positions", "we're hiring", "join us", "work with us"];
    let team_keywords = ["our team", "about us", "meet the team", "leadership", "who we are"];

    // Check headings
    for heading in &profile.headings {
        let lower = heading.to_lowercase();
        if career_keywords.iter().any(|k| lower.contains(k)) {
            profile.has_careers_section = true;
        }
        if team_keywords.iter().any(|k| lower.contains(k)) {
            profile.has_team_section = true;
        }
    }

    // Check nav links
    let sel = Selector::parse("a[href]").unwrap();
    for el in doc.select(&sel) {
        if let Some(href) = el.value().attr("href") {
            let lower = href.to_lowercase();
            if lower.contains("/careers") || lower.contains("/jobs") || lower.contains("/open-positions") {
                profile.has_careers_section = true;
            }
            if lower.contains("/team") || lower.contains("/about") {
                profile.has_team_section = true;
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────

fn select_first<'a>(doc: &'a Html, selector: &str) -> Option<scraper::ElementRef<'a>> {
    Selector::parse(selector).ok().and_then(|sel| doc.select(&sel).next())
}

fn attr(el: &scraper::ElementRef, name: &str) -> Option<String> {
    el.value().attr(name).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn collapse_whitespace(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut last_was_space = true;
    for ch in s.chars() {
        if ch.is_whitespace() {
            if !last_was_space {
                result.push(' ');
                last_was_space = true;
            }
        } else {
            result.push(ch);
            last_was_space = false;
        }
    }
    result.trim().to_string()
}

fn smart_truncate(s: &str, max_chars: usize) -> String {
    if s.len() <= max_chars {
        return s.to_string();
    }
    // Truncate at last sentence boundary before max_chars
    let slice = &s[..max_chars];
    if let Some(pos) = slice.rfind(". ") {
        slice[..=pos].to_string()
    } else if let Some(pos) = slice.rfind(' ') {
        slice[..pos].to_string()
    } else {
        slice.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_jsonld_organization() {
        let html = r#"
            <html><head>
            <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Organization","name":"Acme Corp","description":"AI consulting","foundingDate":"2020","numberOfEmployees":{"@type":"QuantitativeValue","value":50}}
            </script>
            </head><body><h1>Acme Corp</h1></body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.jsonld.is_some());
        let jsonld = profile.jsonld.unwrap();
        assert_eq!(jsonld["name"], "Acme Corp");
        assert_eq!(jsonld["@type"], "Organization");
    }

    #[test]
    fn test_extract_meta_tags() {
        let html = r#"
            <html><head>
            <meta name="description" content="We build AI solutions">
            <meta property="og:title" content="Acme Corp - AI Consulting">
            <meta property="og:description" content="Leading AI consultancy">
            <link rel="canonical" href="https://acme.com">
            </head><body></body></html>
        "#;
        let profile = extract_profile(html);
        assert_eq!(profile.meta_description.as_deref(), Some("We build AI solutions"));
        assert_eq!(profile.og_title.as_deref(), Some("Acme Corp - AI Consulting"));
        assert_eq!(profile.og_description.as_deref(), Some("Leading AI consultancy"));
        assert_eq!(profile.canonical_url.as_deref(), Some("https://acme.com"));
    }

    #[test]
    fn test_extract_headings() {
        let html = r#"
            <html><body>
            <h1>Acme Corporation</h1>
            <h2>Our Services</h2>
            <h2>About Us</h2>
            <h3>This Should Not Appear</h3>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert_eq!(profile.headings.len(), 3);
        assert_eq!(profile.headings[0], "Acme Corporation");
        assert_eq!(profile.headings[1], "Our Services");
        assert_eq!(profile.headings[2], "About Us");
    }

    #[test]
    fn test_extract_main_content_from_main_tag() {
        let html = r#"
            <html><body>
            <nav>Navigation stuff</nav>
            <main>
                <p>We are an AI-first consulting firm specializing in machine learning and NLP solutions for enterprise clients.</p>
            </main>
            <footer>Footer stuff</footer>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.main_content.contains("AI-first consulting firm"));
        // Should NOT contain nav/footer content (unless it falls through to body)
    }

    #[test]
    fn test_extract_mailto_emails() {
        let html = r#"
            <html><body>
            <a href="mailto:info@acme.com">Contact us</a>
            <a href="mailto:cto@acme.com?subject=Hello">Email CTO</a>
            <a href="MAILTO:hr@acme.com">HR</a>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.structured_emails.contains(&"info@acme.com".to_string()));
        assert!(profile.structured_emails.contains(&"cto@acme.com".to_string()));
        assert!(profile.structured_emails.contains(&"hr@acme.com".to_string()));
    }

    #[test]
    fn test_detect_careers_section() {
        let html = r#"
            <html><body>
            <h1>Acme Corp</h1>
            <nav><a href="/careers">Careers</a><a href="/about">About</a></nav>
            <h2>Join Us</h2>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.has_careers_section);
        assert!(profile.has_team_section); // /about link
    }

    #[test]
    fn test_detect_team_section() {
        let html = r#"
            <html><body>
            <h2>Meet the Team</h2>
            <p>Our leadership team brings decades of experience.</p>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.has_team_section);
    }

    #[test]
    fn test_profile_to_markdown() {
        let html = r#"
            <html><head>
            <meta name="description" content="AI consulting firm">
            <meta property="og:title" content="Acme Corp">
            </head><body>
            <h1>Acme Corp</h1>
            <main><p>We build intelligent systems for enterprise clients.</p></main>
            </body></html>
        "#;
        let profile = extract_profile(html);
        let md = profile_to_markdown(&profile);
        assert!(md.contains("## Metadata"));
        assert!(md.contains("AI consulting firm"));
        assert!(md.contains("## Page Headings"));
        assert!(md.contains("## Page Content"));
    }

    #[test]
    fn test_smart_truncate() {
        let text = "First sentence. Second sentence. Third sentence. Fourth.";
        let truncated = smart_truncate(text, 35);
        assert_eq!(truncated, "First sentence. Second sentence.");
    }

    #[test]
    fn test_collapse_whitespace() {
        let input = "  hello    world  \n\t  end  ";
        assert_eq!(collapse_whitespace(input), "hello world end");
    }

    #[test]
    fn test_empty_html() {
        let profile = extract_profile("");
        assert!(profile.jsonld.is_none());
        assert!(profile.meta_description.is_none());
        assert!(profile.headings.is_empty());
        assert!(profile.structured_emails.is_empty());
    }

    #[test]
    fn test_malformed_jsonld_ignored() {
        let html = r#"
            <html><head>
            <script type="application/ld+json">{ not valid json }</script>
            </head><body><p>Content here</p></body></html>
        "#;
        let profile = extract_profile(html);
        assert!(profile.jsonld.is_none());
    }

    #[test]
    fn test_prefers_organization_over_website_jsonld() {
        let html = r#"
            <html><head>
            <script type="application/ld+json">
            {"@type":"WebSite","name":"Acme Site","url":"https://acme.com"}
            </script>
            <script type="application/ld+json">
            {"@type":"Organization","name":"Acme Corp","description":"AI company"}
            </script>
            </head><body></body></html>
        "#;
        let profile = extract_profile(html);
        let jsonld = profile.jsonld.unwrap();
        assert_eq!(jsonld["@type"], "Organization");
        assert_eq!(jsonld["name"], "Acme Corp");
    }

    #[test]
    fn test_dedup_mailto_emails() {
        let html = r#"
            <html><body>
            <a href="mailto:info@acme.com">Contact 1</a>
            <a href="mailto:info@acme.com">Contact 2</a>
            </body></html>
        "#;
        let profile = extract_profile(html);
        assert_eq!(profile.structured_emails.len(), 1);
    }
}

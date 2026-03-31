use regex::Regex;
use scraper::{Html, Selector};
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// Compiled regex singletons
// ---------------------------------------------------------------------------

fn re_whitespace() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| Regex::new(r"\s+").unwrap())
}

fn re_email() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| {
        Regex::new(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}").unwrap()
    })
}

fn re_employee_count() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| {
        // Matches patterns like:
        //   "250+ employees", "50-200 employees", "team of 30", "1,500 people",
        //   "2.5K employees", "1k+ staff", "500 employees"
        Regex::new(
            r"(?xi)
            (?:
              (\d[\d,]*(?:\.\d+)?)\s*[kK]\+?\s*(?:employees|people|staff|team\s+members)
              |
              (\d[\d,]*)\s*[-–]\s*(\d[\d,]*)\s*(?:employees|people|staff|team\s+members)
              |
              team\s+of\s+(\d[\d,]*)
              |
              (\d[\d,]*)\+?\s*(?:employees|people|staff|team\s+members)
            )
            ",
        )
        .unwrap()
    })
}

fn re_funding() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| {
        Regex::new(
            r"(?i)\b(series\s+[abcde]|seed\s+round|pre[-\s]?seed|bootstrapped|vc[-\s]backed|self[-\s]funded)\b",
        )
        .unwrap()
    })
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default)]
pub struct SocialLinks {
    pub linkedin: Option<String>,
    pub twitter: Option<String>,
    pub github: Option<String>,
    pub crunchbase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PageContent {
    pub url: String,
    pub title: String,
    pub meta_description: String,
    pub body_text: String,
    pub emails_found: Vec<String>,
    pub links: Vec<String>,
    // -- new fields --
    pub employee_count_hint: Option<i32>,
    pub tech_stack_hints: Vec<String>,
    pub social_links: SocialLinks,
    pub funding_hint: Option<String>,
    pub is_hiring: bool,
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

pub fn extract(html: &str, url: &str) -> PageContent {
    let doc = Html::parse_document(html);
    let title = select_text(&doc, "title");
    let meta_description =
        select_attr(&doc, "meta[name='description']", "content").unwrap_or_default();
    let body_text = extract_visible_text(&doc);
    let emails_found = extract_emails(html);
    let links = extract_links(&doc, url);

    let employee_count_hint = extract_employee_count(&body_text);
    let tech_stack_hints = extract_tech_stack(html, &doc);
    let social_links = extract_social_links(&doc, url);
    let funding_hint = extract_funding_hint(&body_text);
    let is_hiring = detect_hiring(html, url);

    PageContent {
        url: url.to_string(),
        title,
        meta_description,
        body_text,
        emails_found,
        links,
        employee_count_hint,
        tech_stack_hints,
        social_links,
        funding_hint,
        is_hiring,
    }
}

// ---------------------------------------------------------------------------
// Employee count extraction
// ---------------------------------------------------------------------------

pub fn extract_employee_count(text: &str) -> Option<i32> {
    let re = re_employee_count();
    for cap in re.captures_iter(text) {
        // Group 1: "2.5K employees" style
        if let Some(m) = cap.get(1) {
            let raw = m.as_str().replace(',', "");
            if let Ok(f) = raw.parse::<f64>() {
                let v = (f * 1000.0) as i32;
                if v >= 1 && v <= 1_000_000 {
                    return Some(v);
                }
            }
        }
        // Groups 2 & 3: range "50-200 employees" → midpoint
        if let (Some(lo_m), Some(hi_m)) = (cap.get(2), cap.get(3)) {
            let lo = lo_m.as_str().replace(',', "").parse::<f64>().unwrap_or(0.0);
            let hi = hi_m.as_str().replace(',', "").parse::<f64>().unwrap_or(0.0);
            if lo > 0.0 && hi > 0.0 {
                let mid = ((lo + hi) / 2.0) as i32;
                if mid >= 1 && mid <= 1_000_000 {
                    return Some(mid);
                }
            }
        }
        // Group 4: "team of N"
        if let Some(m) = cap.get(4) {
            let v = m.as_str().replace(',', "").parse::<i32>().unwrap_or(0);
            if v >= 1 && v <= 1_000_000 {
                return Some(v);
            }
        }
        // Group 5: "N employees / people / staff"
        if let Some(m) = cap.get(5) {
            let v = m.as_str().replace(',', "").parse::<i32>().unwrap_or(0);
            if v >= 1 && v <= 1_000_000 {
                return Some(v);
            }
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Tech stack detection
// ---------------------------------------------------------------------------

/// CDN/script-src patterns mapped to human-readable names.
static SCRIPT_PATTERNS: &[(&str, &str)] = &[
    ("jquery", "jQuery"),
    ("react.production.min", "React"),
    ("react.development", "React"),
    ("/react.", "React"),
    ("vue.min", "Vue"),
    ("vue.esm", "Vue"),
    ("/vue.", "Vue"),
    ("angular", "Angular"),
    ("next/dist", "Next.js"),
    ("_next/static", "Next.js"),
    ("gatsby", "Gatsby"),
    ("stripe.js", "Stripe"),
    ("js.stripe.com", "Stripe"),
    ("segment.min", "Segment"),
    ("segment.io", "Segment"),
    ("cdn.segment.com", "Segment"),
    ("intercom", "Intercom"),
    ("widget.intercom.io", "Intercom"),
    ("hubspot", "HubSpot"),
    ("js.hsforms.net", "HubSpot"),
    ("salesforce", "Salesforce"),
    ("zendesk", "Zendesk"),
    ("zdassets.com", "Zendesk"),
    ("mixpanel", "Mixpanel"),
    ("amplitude", "Amplitude"),
    ("cdn.amplitude.com", "Amplitude"),
    ("sentry", "Sentry"),
    ("browser.sentry-cdn.com", "Sentry"),
    ("gtag/js", "Google Analytics"),
    ("google-analytics.com", "Google Analytics"),
    ("googletagmanager.com", "Google Tag Manager"),
    ("hotjar.com", "Hotjar"),
    ("drift.com", "Drift"),
    ("crisp.chat", "Crisp"),
];

/// Meta generator values mapped to CMS/platform names.
static GENERATOR_PATTERNS: &[(&str, &str)] = &[
    ("wordpress", "WordPress"),
    ("shopify", "Shopify"),
    ("squarespace", "Squarespace"),
    ("webflow", "Webflow"),
    ("ghost", "Ghost"),
    ("wix", "Wix"),
    ("joomla", "Joomla"),
    ("drupal", "Drupal"),
];

pub fn extract_tech_stack(html: &str, doc: &Html) -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    let html_lower = html.to_lowercase();

    // 1. Script src URLs
    if let Ok(sel) = Selector::parse("script[src]") {
        for el in doc.select(&sel) {
            if let Some(src) = el.value().attr("src") {
                let src_lower = src.to_lowercase();
                for (pattern, name) in SCRIPT_PATTERNS {
                    if src_lower.contains(pattern) {
                        found.push(name.to_string());
                        break; // one match per script tag is enough
                    }
                }
            }
        }
    }

    // 2. Meta generator tag
    if let Ok(sel) = Selector::parse("meta[name='generator']") {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let c_lower = content.to_lowercase();
                for (pattern, name) in GENERATOR_PATTERNS {
                    if c_lower.contains(pattern) {
                        found.push(name.to_string());
                    }
                }
            }
        }
    }

    // 3. CSS class hints (scan all elements with a class attribute)
    if let Ok(sel) = Selector::parse("[class]") {
        for el in doc.select(&sel) {
            if let Some(cls) = el.value().attr("class") {
                let cls_lower = cls.to_lowercase();
                if cls_lower.contains("tailwind") || cls_lower.contains("tw-") {
                    found.push("Tailwind".to_string());
                }
                if cls_lower.contains("chakra") {
                    found.push("Chakra UI".to_string());
                }
            }
        }
    }

    // 4. HTML comments: "powered by X"
    {
        // Simple regex over raw HTML — comment parsing not needed for hints
        if let Ok(re) = Regex::new(r"(?i)<!--.*?powered\s+by\s+([A-Za-z0-9 .]+?)[\s\-\->]") {
            for cap in re.captures_iter(html) {
                if let Some(m) = cap.get(1) {
                    let name = m.as_str().trim().to_string();
                    if !name.is_empty() {
                        found.push(name);
                    }
                }
            }
        }
    }

    // 5. Inline script / data-* for frameworks not caught above
    //    e.g., Next.js leaves __NEXT_DATA__ globals
    if html_lower.contains("__next_data__") || html_lower.contains("__next_router") {
        found.push("Next.js".to_string());
    }
    if html_lower.contains("__nuxt__") {
        found.push("Nuxt.js".to_string());
    }
    if html_lower.contains("gatsby-focus-wrapper") || html_lower.contains("gatsby-image") {
        found.push("Gatsby".to_string());
    }

    // Deduplicate while preserving first-seen order
    let mut seen = std::collections::HashSet::new();
    found.retain(|t| seen.insert(t.clone()));
    found
}

// ---------------------------------------------------------------------------
// Social link extraction
// ---------------------------------------------------------------------------

/// Known paths that belong to the platform itself, not a company profile.
static GITHUB_EXCLUDED: &[&str] = &[
    "github.com/features",
    "github.com/pricing",
    "github.com/about",
    "github.com/contact",
    "github.com/marketplace",
    "github.com/sponsors",
    "github.com/security",
    "github.com/topics",
    "github.com/explore",
    "github.com/login",
    "github.com/signup",
];

pub fn extract_social_links(doc: &Html, _base_url: &str) -> SocialLinks {
    let mut links = SocialLinks::default();

    let sel = match Selector::parse("a[href]") {
        Ok(s) => s,
        Err(_) => return links,
    };

    for el in doc.select(&sel) {
        let href = match el.value().attr("href") {
            Some(h) => h,
            None => continue,
        };
        let href_lower = href.to_lowercase();

        if links.linkedin.is_none() && href_lower.contains("linkedin.com/company/") {
            links.linkedin = Some(normalize_url(href));
        }

        if links.twitter.is_none()
            && (href_lower.contains("twitter.com/") || href_lower.contains("x.com/"))
            && !href_lower.contains("twitter.com/intent")
            && !href_lower.contains("twitter.com/share")
            && !href_lower.contains("x.com/intent")
        {
            links.twitter = Some(normalize_url(href));
        }

        if links.github.is_none() && href_lower.contains("github.com/") {
            let is_excluded = GITHUB_EXCLUDED.iter().any(|ex| href_lower.contains(ex));
            if !is_excluded {
                links.github = Some(normalize_url(href));
            }
        }

        if links.crunchbase.is_none() && href_lower.contains("crunchbase.com/organization/") {
            links.crunchbase = Some(normalize_url(href));
        }
    }

    links
}

/// Strip trailing slash and ensure the URL is usable.
fn normalize_url(url: &str) -> String {
    let s = url.trim_end_matches('/');
    // Make sure relative-protocol links have https
    if s.starts_with("//") {
        format!("https:{}", s)
    } else {
        s.to_string()
    }
}

// ---------------------------------------------------------------------------
// Funding hint extraction
// ---------------------------------------------------------------------------

pub fn extract_funding_hint(text: &str) -> Option<String> {
    re_funding().captures(text).and_then(|cap| {
        cap.get(1).map(|m| {
            // Title-case: capitalise first letter of each word
            m.as_str()
                .split_whitespace()
                .map(|word| {
                    let mut c = word.chars();
                    match c.next() {
                        None => String::new(),
                        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ")
        })
    })
}

// ---------------------------------------------------------------------------
// Hiring detection
// ---------------------------------------------------------------------------

pub fn detect_hiring(html: &str, url: &str) -> bool {
    let url_lower = url.to_lowercase();
    if url_lower.contains("/careers")
        || url_lower.contains("/jobs")
        || url_lower.contains("/join-us")
        || url_lower.contains("/join_us")
        || url_lower.contains("/work-with-us")
        || url_lower.contains("/work_with_us")
    {
        return true;
    }

    let html_lower = html.to_lowercase();
    html_lower.contains("we're hiring")
        || html_lower.contains("we are hiring")
        || html_lower.contains("join our team")
        || html_lower.contains("open positions")
        || html_lower.contains("view open roles")
        || html_lower.contains("open roles")
        || html_lower.contains("current openings")
}

// ---------------------------------------------------------------------------
// Helpers (unchanged from original)
// ---------------------------------------------------------------------------

fn select_text(doc: &Html, selector: &str) -> String {
    Selector::parse(selector)
        .ok()
        .and_then(|sel| doc.select(&sel).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default()
}

fn select_attr(doc: &Html, selector: &str, attr: &str) -> Option<String> {
    Selector::parse(selector)
        .ok()
        .and_then(|sel| doc.select(&sel).next())
        .and_then(|el| el.value().attr(attr))
        .map(|s| s.to_string())
}

fn extract_visible_text(doc: &Html) -> String {
    let body_sel = match Selector::parse("body") {
        Ok(s) => s,
        Err(_) => return String::new(),
    };
    let body = match doc.select(&body_sel).next() {
        Some(b) => b,
        None => return String::new(),
    };

    let mut parts: Vec<String> = Vec::new();
    for node in body.text() {
        let trimmed = node.trim();
        if !trimmed.is_empty() {
            parts.push(trimmed.to_string());
        }
    }

    let full = parts.join(" ");
    re_whitespace()
        .replace_all(&full, " ")
        .trim()
        .to_string()
}

fn extract_emails(html: &str) -> Vec<String> {
    let mut emails: Vec<String> = re_email()
        .find_iter(html)
        .map(|m| m.as_str().to_lowercase())
        .collect();
    emails.sort();
    emails.dedup();
    emails.retain(|e| {
        !e.ends_with(".png")
            && !e.ends_with(".jpg")
            && !e.contains("example.com")
            && !e.contains("sentry.io")
            && !e.starts_with("noreply")
    });
    emails
}

fn extract_links(doc: &Html, base_url: &str) -> Vec<String> {
    let sel = match Selector::parse("a[href]") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let base_domain = base_url
        .split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or("");

    doc.select(&sel)
        .filter_map(|el| el.value().attr("href"))
        .filter_map(|href| {
            if href.starts_with("http") {
                Some(href.to_string())
            } else if href.starts_with('/') {
                Some(format!("https://{}{}", base_domain, href))
            } else {
                None
            }
        })
        .filter(|url| url.contains(base_domain) || url.contains("linkedin.com"))
        .collect()
}

pub fn truncate_for_llm(text: &str, max_bytes: usize) -> String {
    if text.len() <= max_bytes {
        return text.to_string();
    }
    let mut end = max_bytes;
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    let truncated = &text[..end];
    if let Some(pos) = truncated.rfind(". ") {
        truncated[..=pos].to_string()
    } else {
        format!("{}...", truncated)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // --- employee_count_hint ---

    #[test]
    fn test_employee_count_plain() {
        assert_eq!(extract_employee_count("We have 250 employees worldwide."), Some(250));
    }

    #[test]
    fn test_employee_count_plus() {
        assert_eq!(extract_employee_count("500+ employees across 10 countries"), Some(500));
    }

    #[test]
    fn test_employee_count_range_midpoint() {
        // midpoint of 50–200 = 125
        assert_eq!(extract_employee_count("50-200 employees"), Some(125));
    }

    #[test]
    fn test_employee_count_range_em_dash() {
        assert_eq!(extract_employee_count("100–500 employees"), Some(300));
    }

    #[test]
    fn test_employee_count_k_suffix() {
        assert_eq!(extract_employee_count("2.5K employees"), Some(2500));
    }

    #[test]
    fn test_employee_count_k_lower() {
        assert_eq!(extract_employee_count("1k+ employees"), Some(1000));
    }

    #[test]
    fn test_employee_count_team_of() {
        assert_eq!(extract_employee_count("We are a team of 30 engineers"), Some(30));
    }

    #[test]
    fn test_employee_count_people() {
        assert_eq!(extract_employee_count("Over 400 people working remotely"), Some(400));
    }

    #[test]
    fn test_employee_count_staff() {
        assert_eq!(extract_employee_count("Our 1,200 staff members"), Some(1200));
    }

    #[test]
    fn test_employee_count_none() {
        assert_eq!(extract_employee_count("No relevant numbers here."), None);
    }

    #[test]
    fn test_employee_count_unreasonable_zero() {
        // "0 employees" should return None
        assert_eq!(extract_employee_count("0 employees"), None);
    }

    // --- tech_stack_hints ---

    #[test]
    fn test_tech_stack_react_script() {
        let html = r#"<html><body><script src="https://cdn.example.com/react.production.min.js"></script></body></html>"#;
        let doc = Html::parse_document(html);
        let stack = extract_tech_stack(html, &doc);
        assert!(stack.contains(&"React".to_string()), "expected React, got {:?}", stack);
    }

    #[test]
    fn test_tech_stack_wordpress_meta() {
        let html = r#"<html><head><meta name="generator" content="WordPress 6.4"/></head><body></body></html>"#;
        let doc = Html::parse_document(html);
        let stack = extract_tech_stack(html, &doc);
        assert!(stack.contains(&"WordPress".to_string()), "expected WordPress, got {:?}", stack);
    }

    #[test]
    fn test_tech_stack_nextjs_global() {
        let html = r#"<html><body><script>window.__NEXT_DATA__ = {};</script></body></html>"#;
        let doc = Html::parse_document(html);
        let stack = extract_tech_stack(html, &doc);
        assert!(stack.contains(&"Next.js".to_string()), "expected Next.js, got {:?}", stack);
    }

    #[test]
    fn test_tech_stack_tailwind_class() {
        let html = r#"<html><body><div class="tailwind-container flex"></div></body></html>"#;
        let doc = Html::parse_document(html);
        let stack = extract_tech_stack(html, &doc);
        assert!(stack.contains(&"Tailwind".to_string()), "expected Tailwind, got {:?}", stack);
    }

    #[test]
    fn test_tech_stack_dedup() {
        // Two React scripts — should appear only once
        let html = r#"<html><body>
            <script src="/react.production.min.js"></script>
            <script src="/vendor/react.production.min.js"></script>
        </body></html>"#;
        let doc = Html::parse_document(html);
        let stack = extract_tech_stack(html, &doc);
        assert_eq!(stack.iter().filter(|t| t.as_str() == "React").count(), 1);
    }

    // --- social_links ---

    #[test]
    fn test_social_links_linkedin() {
        let html = r#"<html><body>
            <a href="https://linkedin.com/company/acme-corp">LinkedIn</a>
        </body></html>"#;
        let doc = Html::parse_document(html);
        let links = extract_social_links(&doc, "https://acme.com");
        assert_eq!(
            links.linkedin,
            Some("https://linkedin.com/company/acme-corp".to_string())
        );
        assert!(links.twitter.is_none());
        assert!(links.github.is_none());
    }

    #[test]
    fn test_social_links_twitter_and_github() {
        let html = r#"<html><body>
            <a href="https://twitter.com/acmecorp">Twitter</a>
            <a href="https://github.com/acmecorp">GitHub</a>
        </body></html>"#;
        let doc = Html::parse_document(html);
        let links = extract_social_links(&doc, "https://acme.com");
        assert!(links.twitter.is_some());
        assert!(links.github.is_some());
    }

    #[test]
    fn test_social_links_github_excluded() {
        let html = r#"<html><body>
            <a href="https://github.com/features/actions">GitHub Actions</a>
        </body></html>"#;
        let doc = Html::parse_document(html);
        let links = extract_social_links(&doc, "https://acme.com");
        assert!(links.github.is_none(), "github.com/features should be excluded");
    }

    #[test]
    fn test_social_links_crunchbase() {
        let html = r#"<html><body>
            <a href="https://www.crunchbase.com/organization/acme">Crunchbase</a>
        </body></html>"#;
        let doc = Html::parse_document(html);
        let links = extract_social_links(&doc, "https://acme.com");
        assert!(links.crunchbase.is_some());
    }

    // --- funding_hint ---

    #[test]
    fn test_funding_series_b() {
        assert_eq!(
            extract_funding_hint("We recently closed our Series B round."),
            Some("Series B".to_string())
        );
    }

    #[test]
    fn test_funding_seed() {
        assert_eq!(
            extract_funding_hint("Backed by top VCs after our seed round."),
            Some("Seed Round".to_string())
        );
    }

    #[test]
    fn test_funding_bootstrapped() {
        assert_eq!(
            extract_funding_hint("We are proudly bootstrapped and profitable."),
            Some("Bootstrapped".to_string())
        );
    }

    #[test]
    fn test_funding_none() {
        assert_eq!(extract_funding_hint("No funding info here."), None);
    }

    // --- is_hiring ---

    #[test]
    fn test_hiring_url_careers() {
        assert!(detect_hiring("<html></html>", "https://acme.com/careers"));
    }

    #[test]
    fn test_hiring_url_jobs() {
        assert!(detect_hiring("<html></html>", "https://acme.com/jobs"));
    }

    #[test]
    fn test_hiring_url_join_us() {
        assert!(detect_hiring("<html></html>", "https://acme.com/join-us"));
    }

    #[test]
    fn test_hiring_text_were_hiring() {
        let html = "<html><body>We're hiring talented engineers!</body></html>";
        assert!(detect_hiring(html, "https://acme.com/about"));
    }

    #[test]
    fn test_hiring_text_open_positions() {
        let html = "<html><body>Check our open positions below.</body></html>";
        assert!(detect_hiring(html, "https://acme.com"));
    }

    #[test]
    fn test_hiring_text_join_our_team() {
        let html = "<html><body>Join our team and make a difference.</body></html>";
        assert!(detect_hiring(html, "https://acme.com"));
    }

    #[test]
    fn test_not_hiring() {
        let html = "<html><body>We make great software.</body></html>";
        assert!(!detect_hiring(html, "https://acme.com/about"));
    }

    // --- full extract integration ---

    #[test]
    fn test_extract_populates_new_fields() {
        let html = r#"<!DOCTYPE html><html>
        <head>
            <title>Acme Corp</title>
            <meta name="description" content="We build cool things"/>
            <meta name="generator" content="Webflow"/>
        </head>
        <body>
            <p>We are a team of 45 engineers. Series A funded.</p>
            <a href="https://linkedin.com/company/acme">LinkedIn</a>
            <p>Join our team — view open roles.</p>
        </body></html>"#;
        let page = extract(html, "https://acme.com");
        assert_eq!(page.employee_count_hint, Some(45));
        assert_eq!(page.funding_hint, Some("Series A".to_string()));
        assert!(page.social_links.linkedin.is_some());
        assert!(page.is_hiring);
        assert!(page.tech_stack_hints.contains(&"Webflow".to_string()));
    }
}

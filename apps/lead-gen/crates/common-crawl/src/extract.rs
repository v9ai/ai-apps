use scraper::{Html, Selector};
use serde_json::Value;
use sha2::{Digest, Sha256};

#[derive(Debug, Default, Clone)]
pub struct Person {
    pub name: String,
    pub title: Option<String>,
    pub email: Option<String>,
    pub source: PersonSource,
}

#[derive(Debug, Default, Clone, PartialEq)]
pub enum PersonSource {
    JsonLd,
    Microdata,
    #[default]
    Heuristic,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PageType {
    Team,
    About,
    Contact,
    General,
}

#[derive(Debug, Default, Clone)]
pub struct PageContent {
    pub title: Option<String>,
    pub description: Option<String>,
    pub text: String,
    pub emails: Vec<String>,
    pub persons: Vec<Person>,
    pub page_type: Option<PageType>,
    pub links: Vec<String>,
    pub content_hash: String,
}

pub fn extract(html: &str, source_url: &str) -> PageContent {
    let mut out = PageContent::default();
    out.content_hash = sha256_hex(html.as_bytes());
    out.page_type = Some(classify_page_type(source_url, html));

    let doc = Html::parse_document(html);

    out.title = select_text(&doc, "title");
    out.description = select_meta(&doc, "description")
        .or_else(|| select_meta_property(&doc, "og:description"));

    // Visible text — collect from body, excluding script/style/noscript/template nodes
    out.text = visible_text(&doc);

    // Emails from mailto: links
    if let Ok(sel) = Selector::parse("a[href^='mailto:']") {
        for el in doc.select(&sel) {
            if let Some(href) = el.value().attr("href") {
                let email = href.trim_start_matches("mailto:").split('?').next().unwrap_or("").trim();
                if !email.is_empty() && email.contains('@') {
                    out.emails.push(email.to_lowercase());
                }
            }
        }
    }
    out.emails.extend(scan_emails_in_text(&out.text));
    out.emails.sort();
    out.emails.dedup();

    // JSON-LD (highest quality — structured data)
    let jsonld_persons = extract_jsonld_persons(&doc);
    out.persons.extend(jsonld_persons);

    // Schema.org microdata
    let microdata_persons = extract_microdata_persons(&doc);
    for p in microdata_persons {
        if !out.persons.iter().any(|x| x.name == p.name) {
            out.persons.push(p);
        }
    }

    // DOM heuristic (team page card patterns) — only on Team/About pages
    if matches!(out.page_type, Some(PageType::Team) | Some(PageType::About)) {
        let heuristic = extract_persons_heuristic(&doc);
        for p in heuristic {
            if !out.persons.iter().any(|x| x.name == p.name) {
                out.persons.push(p);
            }
        }
    }

    // Outbound links to same domain
    let base_domain = extract_base_domain(source_url);
    if let Ok(sel) = Selector::parse("a[href]") {
        for el in doc.select(&sel) {
            if let Some(href) = el.value().attr("href") {
                let resolved = resolve_url(source_url, href);
                if let Some(ref resolved) = resolved {
                    if extract_base_domain(resolved) == base_domain {
                        out.links.push(resolved.clone());
                    }
                }
            }
        }
    }
    out.links.sort();
    out.links.dedup();

    out
}

// ── JSON-LD extraction ────────────────────────────────────────────────────────

fn extract_jsonld_persons(doc: &Html) -> Vec<Person> {
    let Ok(sel) = Selector::parse(r#"script[type="application/ld+json"]"#) else { return vec![] };
    let mut persons = Vec::new();
    for el in doc.select(&sel) {
        let raw = el.text().collect::<String>();
        if let Ok(v) = serde_json::from_str::<Value>(&raw) {
            collect_jsonld_persons(&v, &mut persons);
        }
    }
    persons
}

fn collect_jsonld_persons(v: &Value, out: &mut Vec<Person>) {
    match v {
        Value::Object(obj) => {
            let type_str = obj.get("@type").and_then(|t| t.as_str()).unwrap_or("");
            if type_str == "Person" {
                if let Some(p) = parse_jsonld_person(obj) {
                    out.push(p);
                }
            }
            // Recurse into all fields to find nested Persons
            for (key, val) in obj {
                if key == "@context" { continue; }
                collect_jsonld_persons(val, out);
            }
        }
        Value::Array(arr) => {
            for item in arr {
                collect_jsonld_persons(item, out);
            }
        }
        _ => {}
    }
}

fn parse_jsonld_person(obj: &serde_json::Map<String, Value>) -> Option<Person> {
    let name = obj.get("name").and_then(|v| v.as_str()).map(|s| s.trim().to_string())?;
    if !looks_like_name(&name) {
        return None;
    }
    let title = obj.get("jobTitle").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
    let email = obj.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim_start_matches("mailto:").to_lowercase());
    Some(Person { name, title, email, source: PersonSource::JsonLd })
}

// ── Microdata extraction ──────────────────────────────────────────────────────

fn extract_microdata_persons(doc: &Html) -> Vec<Person> {
    let Ok(sel) = Selector::parse(r#"[itemtype*="schema.org/Person"]"#) else { return vec![] };
    let Ok(name_sel) = Selector::parse(r#"[itemprop="name"]"#) else { return vec![] };
    let Ok(title_sel) = Selector::parse(r#"[itemprop="jobTitle"]"#) else { return vec![] };
    let Ok(email_sel) = Selector::parse(r#"[itemprop="email"]"#) else { return vec![] };

    let mut persons = Vec::new();
    for person_el in doc.select(&sel) {
        let name = person_el.select(&name_sel).next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| looks_like_name(s));
        let Some(name) = name else { continue };

        let title = person_el.select(&title_sel).next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty());
        let email = person_el.select(&email_sel).next()
            .and_then(|e| e.value().attr("href").or_else(|| Some(e.text().collect::<String>().leak())))
            .map(|s| s.trim_start_matches("mailto:").to_lowercase());

        persons.push(Person { name, title, email, source: PersonSource::Microdata });
    }
    persons
}

// ── DOM heuristic ─────────────────────────────────────────────────────────────

fn extract_persons_heuristic(doc: &Html) -> Vec<Person> {
    let Ok(heading_sel) = Selector::parse("h2, h3, h4") else { return vec![] };
    let mut persons = Vec::new();

    for heading in doc.select(&heading_sel) {
        let text = heading.text().collect::<String>();
        let name = text.trim().to_string();
        if !looks_like_name(&name) {
            continue;
        }

        // Look for a title in a nearby sibling or descendant
        let title = find_nearby_title(&heading);

        // Look for email in the same section
        let email = find_nearby_email(&heading);

        // Require a confirmed title to avoid hero/section headings
        if title.is_none() {
            continue;
        }
        persons.push(Person { name, title, email, source: PersonSource::Heuristic });
    }
    persons
}

fn find_nearby_title(heading: &scraper::ElementRef<'_>) -> Option<String> {
    const TITLE_WORDS: &[&str] = &[
        "ceo", "cto", "coo", "cfo", "cmo", "chief", "founder", "co-founder",
        "president", "vp", "vice president", "director", "head of", "head,",
        "partner", "principal", "manager", "lead", "senior", "engineer",
        "scientist", "researcher", "analyst", "designer", "officer",
    ];

    // First check direct siblings via parent
    if let Some(parent) = heading.parent().and_then(|p| scraper::ElementRef::wrap(p)) {
        for child in parent.children() {
            if let Some(child_el) = scraper::ElementRef::wrap(child) {
                if child_el == *heading { continue; }
                let child_text = child_el.text().collect::<String>().to_lowercase();
                if TITLE_WORDS.iter().any(|kw| child_text.contains(kw)) && child_text.len() < 80 {
                    return Some(child_el.text().collect::<String>().trim().to_string());
                }
            }
        }
    }

    // Check descendants of heading's parent container
    if let Some(container) = heading.parent()
        .and_then(|p| p.parent())
        .and_then(scraper::ElementRef::wrap)
    {
        if let Ok(p_sel) = Selector::parse("p, span, div") {
            for el in container.select(&p_sel) {
                let t = el.text().collect::<String>().to_lowercase();
                if TITLE_WORDS.iter().any(|kw| t.contains(kw)) && t.len() < 80 && t.len() > 3 {
                    return Some(el.text().collect::<String>().trim().to_string());
                }
            }
        }
    }
    None
}

fn find_nearby_email(heading: &scraper::ElementRef<'_>) -> Option<String> {
    let container = heading.parent()
        .and_then(|p| p.parent())
        .and_then(scraper::ElementRef::wrap)?;

    // mailto links in the same card
    if let Ok(sel) = Selector::parse("a[href^='mailto:']") {
        if let Some(el) = container.select(&sel).next() {
            if let Some(href) = el.value().attr("href") {
                return Some(href.trim_start_matches("mailto:").split('?').next().unwrap_or("").trim().to_lowercase());
            }
        }
    }
    None
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Two-letter uppercase tokens that look like acronyms, not name particles
const ACRONYM_TOKENS: &[&str] = &[
    "AI", "ML", "IT", "HR", "VP", "UK", "US", "EU", "PR",
    "QA", "PM", "BI", "UX", "UI", "BD", "CX", "AR", "VR",
];

const FUNCTION_WORDS: &[&str] = &[
    "The", "Our", "Your", "Their", "Its", "This", "That", "These", "Those",
    "An", "And", "Or", "But", "For", "With", "From", "Into", "About",
    "How", "Why", "What", "When", "Where", "Who",
    "Explore", "Meet", "Join", "Learn", "Get", "Find", "See", "View",
    "New", "All", "More", "Less", "Best",
];

fn looks_like_name(s: &str) -> bool {
    let words: Vec<&str> = s.split_whitespace().collect();
    if words.len() < 2 || words.len() > 4 {
        return false;
    }
    // Reject acronyms and common function words
    if words.iter().any(|w| ACRONYM_TOKENS.contains(w) || FUNCTION_WORDS.contains(w)) {
        return false;
    }
    // Reject all-uppercase words longer than 2 chars (e.g. "MACHINE")
    if words.iter().any(|w| w.len() > 2 && w.chars().all(|c| c.is_uppercase())) {
        return false;
    }
    // Each word: starts uppercase, only alpha/hyphen/apostrophe/period, >= 2 chars
    words.iter().all(|w| {
        let first = w.chars().next().map(|c| c.is_uppercase()).unwrap_or(false);
        let rest = w.chars().all(|c| c.is_alphabetic() || c == '-' || c == '\'' || c == '.');
        first && rest && w.len() >= 2
    }) && !contains_title_word(s)
}

fn contains_title_word(s: &str) -> bool {
    const TITLE_ONLY: &[&str] = &[
        "CEO", "CTO", "CFO", "COO", "CMO", "VP", "Director", "Manager",
        "Engineer", "Head", "Lead", "Partner", "Principal",
    ];
    TITLE_ONLY.iter().any(|kw| s.contains(kw))
}

fn classify_page_type(url: &str, html: &str) -> PageType {
    let path = crate::cdx::url_path(url).to_lowercase();
    let html_lower = html.to_lowercase();

    if path.contains("team") || path.contains("people") || path.contains("staff")
        || path.contains("leadership") || path.contains("management")
    {
        return PageType::Team;
    }
    if path.contains("about") || path.contains("who-we-are") || path.contains("company") {
        return PageType::About;
    }
    if path.contains("contact") {
        return PageType::Contact;
    }

    // Content-based fallback — skip careers/jobs paths (they mention titles in job ads)
    let is_careers = path.contains("career") || path.contains("job") || path.contains("vacanc") || path.contains("opening");
    if !is_careers {
        let team_signals = html_lower.matches("cto").count()
            + html_lower.matches("ceo").count()
            + html_lower.matches("director").count()
            + html_lower.matches("founder").count();
        if team_signals >= 3 {
            return PageType::Team;
        }
    }

    PageType::General
}

fn select_text(doc: &Html, selector: &str) -> Option<String> {
    Selector::parse(selector).ok().and_then(|sel| {
        doc.select(&sel).next().map(|e| e.text().collect::<String>().trim().to_string())
    }).filter(|s| !s.is_empty())
}

fn select_meta(doc: &Html, name: &str) -> Option<String> {
    let sel = Selector::parse(&format!(r#"meta[name="{name}"]"#)).ok()?;
    doc.select(&sel).next()?.value().attr("content").map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn select_meta_property(doc: &Html, property: &str) -> Option<String> {
    let sel = Selector::parse(&format!(r#"meta[property="{property}"]"#)).ok()?;
    doc.select(&sel).next()?.value().attr("content").map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn scan_emails_in_text(text: &str) -> Vec<String> {
    let mut emails = Vec::new();
    for word in text.split_whitespace() {
        let word = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '.' && c != '-' && c != '+' && c != '_');
        if is_valid_email(word) {
            emails.push(word.to_lowercase());
        }
    }
    emails
}

fn is_valid_email(s: &str) -> bool {
    // Must contain exactly one @
    let parts: Vec<&str> = s.splitn(2, '@').collect();
    if parts.len() != 2 { return false; }
    let local = parts[0];
    let domain = parts[1];
    // Local: 1–64 chars, alphanumeric + . - + _
    if local.is_empty() || local.len() > 64 { return false; }
    if !local.chars().all(|c| c.is_alphanumeric() || matches!(c, '.' | '-' | '+' | '_')) { return false; }
    // Domain: has a dot, no slashes (not a URL path), 4–253 chars, ends with 2–6 letter TLD
    if domain.contains('/') || domain.contains(':') || domain.contains('@') { return false; }
    if domain.len() < 4 || domain.len() > 253 { return false; }
    let tld = domain.rsplit('.').next().unwrap_or("");
    tld.len() >= 2 && tld.len() <= 6 && tld.chars().all(|c| c.is_alphabetic())
}

fn visible_text(doc: &Html) -> String {
    use scraper::node::Node;

    fn collect_text(node: scraper::element_ref::ElementRef<'_>, out: &mut Vec<String>) {
        for child in node.children() {
            match child.value() {
                Node::Text(t) => {
                    let s = t.trim();
                    if !s.is_empty() {
                        out.push(s.to_string());
                    }
                }
                Node::Element(el) => {
                    let tag = el.name();
                    if matches!(tag, "script" | "style" | "noscript" | "template" | "svg" | "canvas") {
                        continue;
                    }
                    if let Some(child_el) = scraper::ElementRef::wrap(child) {
                        collect_text(child_el, out);
                    }
                }
                _ => {}
            }
        }
    }

    let mut parts = Vec::new();
    collect_text(doc.root_element(), &mut parts);
    parts.join(" ")
}

fn extract_base_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or("")
        .trim_start_matches("www.")
        .to_lowercase()
}

fn resolve_url(base: &str, href: &str) -> Option<String> {
    if href.starts_with("http://") || href.starts_with("https://") {
        return Some(href.to_string());
    }
    if href.starts_with("//") {
        let scheme = if base.starts_with("https") { "https:" } else { "http:" };
        return Some(format!("{scheme}{href}"));
    }
    if href.starts_with('/') {
        let origin = base.split("://").nth(1).and_then(|s| s.find('/').map(|i| &s[..i]))?;
        let scheme = if base.starts_with("https") { "https" } else { "http" };
        return Some(format!("{scheme}://{origin}{href}"));
    }
    None
}

pub fn sha256_hex(data: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(data);
    hex::encode(h.finalize())
}

// ── Organization facts (JSON-LD @type:Organization) ───────────────────────────

#[derive(Debug, Default, Clone)]
pub struct OrgFacts {
    pub description: Option<String>,
    pub founded_year: Option<String>,
    pub location: Option<String>,
    pub social_links: Vec<String>,
}

pub fn extract_org_facts(html: &str) -> OrgFacts {
    let doc = Html::parse_document(html);
    let Ok(sel) = Selector::parse(r#"script[type="application/ld+json"]"#) else { return OrgFacts::default() };
    for el in doc.select(&sel) {
        let raw = el.text().collect::<String>();
        if let Ok(v) = serde_json::from_str::<Value>(&raw) {
            if let Some(facts) = collect_jsonld_org(&v) {
                return facts;
            }
        }
    }
    OrgFacts::default()
}

fn collect_jsonld_org(v: &Value) -> Option<OrgFacts> {
    match v {
        Value::Object(obj) => {
            let is_org = match obj.get("@type") {
                Some(Value::String(s)) => is_org_type(s),
                Some(Value::Array(arr)) => arr.iter().any(|v| v.as_str().map(is_org_type).unwrap_or(false)),
                _ => false,
            };
            if is_org {
                let mut facts = OrgFacts::default();
                facts.description = obj.get("description")
                    .and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                facts.founded_year = obj.get("foundingDate")
                    .and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                if let Some(addr) = obj.get("address") {
                    let loc = extract_address_text(addr);
                    if !loc.is_empty() { facts.location = Some(loc); }
                }
                if let Some(same_as) = obj.get("sameAs") {
                    match same_as {
                        Value::Array(links) => {
                            for link in links {
                                if let Some(url) = link.as_str() { facts.social_links.push(url.to_string()); }
                            }
                        }
                        Value::String(url) => facts.social_links.push(url.to_string()),
                        _ => {}
                    }
                }
                if facts.description.is_some() || facts.founded_year.is_some()
                    || facts.location.is_some() || !facts.social_links.is_empty()
                {
                    return Some(facts);
                }
            }
            for (key, val) in obj {
                if key == "@context" { continue; }
                if let Some(facts) = collect_jsonld_org(val) { return Some(facts); }
            }
        }
        Value::Array(arr) => {
            for item in arr {
                if let Some(facts) = collect_jsonld_org(item) { return Some(facts); }
            }
        }
        _ => {}
    }
    None
}

fn is_org_type(s: &str) -> bool {
    matches!(s, "Organization" | "LocalBusiness" | "Corporation" | "ProfessionalService"
                | "Consulting" | "LegalService" | "FinancialService" | "GovernmentOrganization"
                | "NGO" | "ResearchOrganization" | "EducationalOrganization")
}

fn extract_address_text(addr: &Value) -> String {
    match addr {
        Value::String(s) => s.trim().to_string(),
        Value::Object(obj) => {
            let parts: Vec<&str> = ["streetAddress", "addressLocality", "addressRegion", "addressCountry"]
                .iter()
                .filter_map(|key| obj.get(*key).and_then(|v| v.as_str()))
                .collect();
            parts.join(", ")
        }
        _ => String::new(),
    }
}

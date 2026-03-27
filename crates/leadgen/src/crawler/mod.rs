pub mod contact_ner;
pub mod extractor;
pub mod fetcher;
pub mod neural_ucb;
pub mod scheduler;
pub mod url_scorer;

use crate::{db, llm, search};
use anyhow::Result;
use std::collections::HashSet;
use tracing::{info, warn};

pub use fetcher::{CrawlJob, Fetcher};
pub use scheduler::{CrawlReward, DomainScheduler, SchedulerConfig};
pub use url_scorer::{discover_urls, score_url, AdaptiveUrlScorer};

/// Minimum NER confidence to accept extraction without LLM fallback.
const NER_CONFIDENCE_THRESHOLD: u8 = 40;

/// Convert NER extraction result to the LLM CompanyExtraction type.
fn ner_to_company_extraction(ner: &contact_ner::ContactExtraction) -> llm::CompanyExtraction {
    let key_people: Vec<llm::PersonExtraction> = ner
        .persons()
        .iter()
        .map(|p| llm::PersonExtraction {
            name: p.name_str().to_string(),
            title: p.title_str().to_string(),
            department: {
                let d = p.department_str();
                if d.is_empty() { None } else { Some(d.to_string()) }
            },
        })
        .collect();

    llm::CompanyExtraction {
        company_name: ner.company_name_str().to_string(),
        industry: {
            let i = ner.industry_str();
            if i.is_empty() { None } else { Some(i.to_string()) }
        },
        employee_count: None,
        founding_year: None,
        location: None,
        tech_stack: Vec::new(),
        key_people,
        description: None,
    }
}

/// Try NER extraction first; fall back to LLM only when NER confidence is too low.
/// Returns (extraction, source_label) where source_label is "ner" or "llm".
async fn extract_with_ner_fallback(
    text: &str,
    llm: &llm::LlmClient,
) -> (Result<llm::CompanyExtraction>, &'static str) {
    let mut ner_out = contact_ner::ContactExtraction::new();
    contact_ner::extract_contacts(text.as_bytes(), &mut ner_out);

    if ner_out.confidence >= NER_CONFIDENCE_THRESHOLD && ner_out.person_count > 0 {
        let data = ner_to_company_extraction(&ner_out);
        return (Ok(data), "ner");
    }

    // NER didn't find enough — fall back to LLM
    let truncated = extractor::truncate_for_llm(text, 3000);
    (llm.extract_entities(&truncated).await, "llm")
}

pub async fn process_domain(
    domain: &str, fetcher: &Fetcher, llm: &llm::LlmClient,
    database: &db::Db, index_writer: &mut tantivy::IndexWriter,
) -> Result<ProcessResult> {
    let job = CrawlJob::from_domain(domain);
    let mut pages_fetched = 0u32;
    let mut contacts_found = 0u32;
    let mut all_text = String::new();
    let mut all_emails: Vec<String> = Vec::new();

    info!(domain = domain, "starting crawl");

    for url in job.urls() {
        if let Some(cached) = db::get_cached_extraction(database, &url).await? {
            if let Ok(data) = serde_json::from_str::<llm::CompanyExtraction>(&cached) {
                save_extracted_data(database, domain, &data).await?;
                contacts_found += data.key_people.len() as u32;
            }
            continue;
        }

        match fetcher.fetch(&url).await {
            Ok(result) if result.is_html && result.status == 200 => {
                pages_fetched += 1;
                let content = extractor::extract(&result.html, &url);
                all_emails.extend(content.emails_found.clone());
                all_text.push_str(&content.body_text);
                all_text.push(' ');

                if content.body_text.len() > 200 {
                    let (result, source) = extract_with_ner_fallback(&content.body_text, llm).await;
                    match result {
                        Ok(data) => {
                            contacts_found += data.key_people.len() as u32;
                            save_extracted_data(database, domain, &data).await?;
                            let json = serde_json::to_string(&data)?;
                            db::cache_extraction(database, &url, &json, source).await?;
                        }
                        Err(e) => { warn!(url = %url, error = %e, "extraction failed"); }
                    }
                }
            }
            Ok(result) => { info!(url = %url, status = result.status, "skipped"); }
            Err(e) => { warn!(url = %url, error = %e, "fetch failed"); }
        }
    }

    all_emails.sort();
    all_emails.dedup();

    if !all_text.is_empty() {
        if let Some(company) = db::get_company_by_domain(database, domain).await? {
            search::index_company(index_writer, &company, &all_text)?;
        }
    }

    Ok(ProcessResult { domain: domain.to_string(), pages_fetched, contacts_found, emails_discovered: all_emails })
}

async fn save_extracted_data(database: &db::Db, domain: &str, data: &llm::CompanyExtraction) -> Result<()> {
    let company_id = uuid::Uuid::new_v4().to_string();
    let company = crate::Company {
        id: company_id.clone(), name: data.company_name.clone(),
        domain: Some(domain.to_string()), industry: data.industry.clone(),
        employee_count: data.employee_count, funding_stage: None,
        tech_stack: if data.tech_stack.is_empty() { None } else { Some(serde_json::to_string(&data.tech_stack)?) },
        location: data.location.clone(), description: data.description.clone(),
        source: Some("crawler".to_string()), created_at: None, updated_at: None,
    };
    db::upsert_company(database, &company).await?;

    let actual = db::get_company_by_domain(database, domain).await?;
    let cid = actual.map(|c| c.id).unwrap_or(company_id);

    for person in &data.key_people {
        let (first, last) = split_name(&person.name);
        let contact = crate::Contact {
            id: uuid::Uuid::new_v4().to_string(), company_id: Some(cid.clone()),
            first_name: first, last_name: last, title: Some(person.title.clone()),
            seniority: infer_seniority(&person.title), department: person.department.clone(),
            email: None, email_status: Some("unknown".to_string()),
            linkedin_url: None, phone: None, source: Some("crawler-llm".to_string()), created_at: None,
        };
        db::upsert_contact(database, &contact).await?;
    }
    Ok(())
}

fn split_name(full: &str) -> (String, String) {
    let parts: Vec<&str> = full.trim().splitn(2, ' ').collect();
    match parts.len() {
        0 => (String::new(), String::new()),
        1 => (parts[0].to_string(), String::new()),
        _ => (parts[0].to_string(), parts[1].to_string()),
    }
}

fn infer_seniority(title: &str) -> Option<String> {
    let t = title.to_lowercase();
    if t.contains("ceo") || t.contains("cto") || t.contains("cfo") || t.contains("chief") || t.contains("founder") {
        Some("C-level".into())
    } else if t.contains("vp") || t.contains("vice president") { Some("VP".into()) }
    else if t.contains("director") || t.contains("head of") { Some("Director".into()) }
    else if t.contains("manager") || t.contains("lead") { Some("Manager".into()) }
    else if t.contains("senior") { Some("Senior".into()) }
    else { Some("IC".into()) }
}

pub struct ProcessResult {
    pub domain: String,
    pub pages_fetched: u32,
    pub contacts_found: u32,
    pub emails_discovered: Vec<String>,
}

/// Enhanced crawl that discovers URLs dynamically using scoring heuristics
/// with an extraction feedback loop (CLARS-DQN adaptive reward shaping, 2026).
///
/// Starts with seed URLs (/, /about, /team), then discovers new URLs from
/// extracted links, ranked by `AdaptiveUrlScorer`. When LLM extraction succeeds,
/// the scorer learns which path patterns yield contacts — boosting similar
/// paths in the frontier. Crawls up to `max_pages` pages per domain.
///
/// Returns both a `ProcessResult` and a `CrawlReward` for the bandit scheduler.
pub async fn process_domain_smart(
    domain: &str,
    fetcher: &Fetcher,
    llm: &llm::LlmClient,
    database: &db::Db,
    index_writer: &mut tantivy::IndexWriter,
    max_pages: usize,
) -> Result<ProcessResult> {
    let base_url = format!("https://{}", domain);
    let mut pages_fetched = 0u32;
    let mut contacts_found = 0u32;
    let mut all_text = String::new();
    let mut all_emails: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let mut total_content_length = 0u64;
    let mut cached_pages = 0u32;

    // Adaptive URL scorer with extraction feedback loop
    let mut scorer = url_scorer::AdaptiveUrlScorer::new();

    // Seed URLs — start with highest-value static paths
    let seeds: Vec<String> = [
        "/", "/about", "/about-us", "/team", "/our-team",
        "/leadership", "/people", "/contact",
    ]
    .iter()
    .map(|p| format!("{}{}", base_url, p))
    .collect();

    // Priority queue: (score, url)
    let mut frontier: Vec<(f64, String)> = seeds
        .iter()
        .map(|url| {
            let path = extract_url_path(url);
            (scorer.score(&path), url.clone())
        })
        .collect();

    frontier.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    info!(domain = domain, seeds = frontier.len(), "starting smart crawl with adaptive scoring");

    while let Some((score, url)) = frontier.pop() {
        if pages_fetched >= max_pages as u32 {
            break;
        }

        let url_lower = url.to_lowercase();
        if seen.contains(&url_lower) {
            continue;
        }
        seen.insert(url_lower);

        let path = extract_url_path(&url);

        // Check cache first
        if let Some(cached) = db::get_cached_extraction(database, &url).await? {
            if let Ok(data) = serde_json::from_str::<llm::CompanyExtraction>(&cached) {
                save_extracted_data(database, domain, &data).await?;
                let n = data.key_people.len() as u32;
                contacts_found += n;
                cached_pages += 1;
                // Feed cached results into the adaptive scorer too
                scorer.record_extraction(&path, n);
            }
            continue;
        }

        match fetcher.fetch(&url).await {
            Ok(result) if result.is_html && result.status == 200 => {
                pages_fetched += 1;
                let content = extractor::extract(&result.html, &url);

                all_emails.extend(content.emails_found.clone());
                total_content_length += content.body_text.len() as u64;
                all_text.push_str(&content.body_text);
                all_text.push(' ');

                // Discover new URLs — score using adaptive scorer
                let new_urls = discover_urls(&content.links, domain, &seen, 10);
                for su in new_urls {
                    let adaptive_score = scorer.score(&su.path);
                    frontier.push((adaptive_score, su.url));
                }
                frontier.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

                // Extract entities — NER first, LLM fallback
                if content.body_text.len() > 200 {
                    let (result, source) = extract_with_ner_fallback(&content.body_text, llm).await;
                    match result {
                        Ok(data) => {
                            let n = data.key_people.len() as u32;
                            contacts_found += n;
                            save_extracted_data(database, domain, &data).await?;
                            let json = serde_json::to_string(&data)?;
                            db::cache_extraction(database, &url, &json, source).await?;

                            // ── Extraction feedback loop ──
                            scorer.record_extraction(&path, n);
                        }
                        Err(e) => {
                            scorer.record_extraction(&path, 0);
                            warn!(url = %url, score = score, source = source, error = %e, "extraction failed");
                        }
                    }
                }

                info!(
                    url = %url,
                    score = format!("{:.2}", score),
                    pages = pages_fetched,
                    contacts = contacts_found,
                    frontier = frontier.len(),
                    patterns = scorer.patterns_learned(),
                    "crawled"
                );
            }
            Ok(result) => {
                info!(url = %url, status = result.status, "skipped non-html");
            }
            Err(e) => {
                warn!(url = %url, error = %e, "fetch failed");
            }
        }
    }

    all_emails.sort();
    all_emails.dedup();

    if !all_text.is_empty() {
        if let Some(company) = db::get_company_by_domain(database, domain).await? {
            search::index_company(index_writer, &company, &all_text)?;
        }
    }

    info!(
        domain = domain,
        pages = pages_fetched,
        contacts = contacts_found,
        emails = all_emails.len(),
        patterns_learned = scorer.patterns_learned(),
        "smart crawl complete"
    );

    Ok(ProcessResult {
        domain: domain.to_string(),
        pages_fetched,
        contacts_found,
        emails_discovered: all_emails,
    })
}

fn extract_url_path(url: &str) -> String {
    url.split("://")
        .nth(1)
        .and_then(|s| s.find('/').map(|i| &s[i..]))
        .unwrap_or("/")
        .split('?')
        .next()
        .unwrap_or("/")
        .to_lowercase()
}

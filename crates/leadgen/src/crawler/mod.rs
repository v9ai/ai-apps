pub mod extractor;
pub mod fetcher;

use crate::{db, llm, search};
use anyhow::Result;
use tracing::{info, warn};

pub use fetcher::{CrawlJob, Fetcher};

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
                    let truncated = extractor::truncate_for_llm(&content.body_text, 3000);
                    match llm.extract_entities(&truncated).await {
                        Ok(data) => {
                            contacts_found += data.key_people.len() as u32;
                            save_extracted_data(database, domain, &data).await?;
                            let json = serde_json::to_string(&data)?;
                            db::cache_extraction(database, &url, &json, &llm.model_name()).await?;
                        }
                        Err(e) => { warn!(url = %url, error = %e, "LLM extraction failed"); }
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

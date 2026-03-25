mod api;
mod crawler;
mod db;
mod dedup;
mod email;
mod jobs;
mod llm;
mod outreach;
mod scoring;
mod search;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub employee_count: Option<i32>,
    pub funding_stage: Option<String>,
    pub tech_stack: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Contact {
    pub id: String,
    pub company_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub seniority: Option<String>,
    pub department: Option<String>,
    pub email: Option<String>,
    pub email_status: Option<String>,
    pub linkedin_url: Option<String>,
    pub phone: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadScore {
    pub contact_id: String,
    pub icp_fit_score: f64,
    pub intent_score: f64,
    pub recency_score: f64,
    pub composite_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScoredLead {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub title: String,
    pub email: String,
    pub email_status: String,
    pub company_name: String,
    pub domain: String,
    pub industry: String,
    pub icp_fit_score: f64,
    pub composite_score: f64,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "leadgen=info".into()),
        )
        .init();

    info!("starting leadgen engine");

    let args: Vec<String> = std::env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("serve");

    let database = db::init("data/leads.db").await?;
    info!("database initialized");

    let search_index = search::create_index("data/tantivy_index")?;
    let index_writer = search::create_writer(&search_index)?;
    info!("search index ready");

    let llm_client = llm::LlmClient::local("qwen2.5:7b-instruct-q4_K_M");
    info!("LLM client configured (local Ollama)");

    let fetcher = crawler::Fetcher::new(1000);
    let mx_checker = email::mx::MxChecker::new()?;
    let icp = scoring::IcpProfile::default();

    match command {
        "serve" => {
            let state = Arc::new(api::AppState {
                db: database,
                llm: llm_client,
                fetcher,
                mx_checker,
                search_index,
                index_writer: Mutex::new(index_writer),
                icp,
            });

            let app = api::router(state);
            let addr = "0.0.0.0:3000";
            info!(addr = addr, "API server starting");

            let listener = tokio::net::TcpListener::bind(addr).await?;
            axum::serve(listener, app).await?;
        }

        "enrich" => {
            let domain = args.get(2).expect("usage: leadgen enrich <domain>");
            let mut writer = index_writer;

            let result = crawler::process_domain(
                domain, &fetcher, &llm_client, &database, &mut writer,
            ).await?;

            search::commit(&mut writer)?;

            println!(
                "Enriched {}: {} pages, {} contacts, {} emails",
                result.domain, result.pages_fetched,
                result.contacts_found, result.emails_discovered.len()
            );
            for email in &result.emails_discovered {
                println!("  found: {}", email);
            }
        }

        "verify" => {
            let email_addr = args.get(2).expect("usage: leadgen verify <email>");

            if !email::verify::is_valid_syntax(email_addr) {
                println!("Invalid syntax: {}", email_addr);
                return Ok(());
            }

            let domain = email_addr.split('@').nth(1).unwrap();
            let mx = mx_checker.check_domain(domain).await?;
            println!("MX: {:?}", mx.mx_hosts);
            println!("Provider: {}", mx.provider);

            if let Some(mx_host) = mx.mx_hosts.first() {
                let result = email::verify::verify_smtp(email_addr, mx_host).await?;
                println!("SMTP result: {:?}", result);
            } else {
                println!("No MX records found");
            }
        }

        "score" => {
            let count = jobs::score_all_leads(&database, &icp).await?;
            println!("Scored {} leads", count);
        }

        "top" => {
            let limit = args.get(2).and_then(|s| s.parse::<i64>().ok()).unwrap_or(20);
            let leads = db::top_leads(&database, limit).await?;
            println!("{:<30} {:<25} {:<30} {:<8} {:<6}", "Name", "Title", "Company", "Status", "Score");
            println!("{}", "-".repeat(100));
            for lead in &leads {
                println!(
                    "{:<30} {:<25} {:<30} {:<8} {:.1}",
                    format!("{} {}", lead.first_name, lead.last_name),
                    &lead.title[..lead.title.len().min(24)],
                    &lead.company_name[..lead.company_name.len().min(29)],
                    lead.email_status,
                    lead.composite_score,
                );
            }
        }

        "export" => {
            let leads = db::top_leads(&database, 10000).await?;
            let csv = outreach::export_leads_csv(&leads);
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("leads.csv");
            std::fs::write(path, &csv)?;
            println!("Exported {} leads to {}", leads.len(), path);
        }

        "batch" => {
            let file = args.get(2).expect("usage: leadgen batch <domains.txt>");
            let content = std::fs::read_to_string(file)?;
            let domains: Vec<&str> = content.lines().filter(|l| !l.is_empty()).collect();
            let mut writer = index_writer;

            println!("Processing {} domains...", domains.len());
            for (i, domain) in domains.iter().enumerate() {
                let domain = domain.trim();
                print!("[{}/{}] {} ... ", i + 1, domains.len(), domain);
                match crawler::process_domain(domain, &fetcher, &llm_client, &database, &mut writer).await {
                    Ok(result) => println!("{} pages, {} contacts", result.pages_fetched, result.contacts_found),
                    Err(e) => println!("ERROR: {}", e),
                }
            }
            search::commit(&mut writer)?;
            println!("Done. Run `leadgen score` to score leads.");
        }

        _ => {
            eprintln!("Usage: leadgen <command> [args]");
            eprintln!();
            eprintln!("Commands:");
            eprintln!("  serve                  Start API server on :3000");
            eprintln!("  enrich <domain>        Crawl and enrich a single domain");
            eprintln!("  batch <domains.txt>    Batch enrich from file");
            eprintln!("  verify <email>         Verify a single email address");
            eprintln!("  score                  Score all leads against ICP");
            eprintln!("  top [limit]            Show top scored leads");
            eprintln!("  export [file.csv]      Export leads to CSV");
        }
    }

    Ok(())
}

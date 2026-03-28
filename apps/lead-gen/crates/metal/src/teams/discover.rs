//! Discovery stage — find companies matching ICP.
//!
//! Input:  domains file (one domain per line) or web search
//! Output: discovery report + companies ingested into Pipeline storage

use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::state;
use super::{StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveryReport {
    pub companies: Vec<DiscoveredCompany>,
    pub duplicates_skipped: usize,
    pub fetch_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredCompany {
    pub domain: String,
    pub name: String,
    pub description: String,
    pub tech_signals: Vec<String>,
    pub emails_found: Vec<String>,
    pub icp_score: f64,
}

pub async fn run(ctx: &TeamContext, domains_file: Option<&Path>) -> Result<StageReport> {
    let domains = match domains_file {
        Some(path) => read_domains(path)?,
        None => {
            // Web search fallback: search for companies in target vertical
            search_companies(&ctx.http, &ctx.icp_vertical).await?
        }
    };

    let limit = ctx.batch.discover.min(domains.len());
    let domains = &domains[..limit];

    let mut report = DiscoveryReport {
        companies: Vec::new(),
        duplicates_skipped: 0,
        fetch_errors: Vec::new(),
    };

    for domain in domains {
        let domain = domain.trim();
        if domain.is_empty() || domain.starts_with('#') {
            continue;
        }

        // Bloom-filter fast-path dedup
        if ctx.pipeline.domain_known(domain) {
            report.duplicates_skipped += 1;
            continue;
        }

        // Fetch homepage
        let url = format!("https://{domain}");
        let page_text = match fetch_page(&ctx.http, &url).await {
            Ok(html) => extract_text(&html),
            Err(e) => {
                report.fetch_errors.push(format!("{domain}: {e}"));
                continue;
            }
        };

        // Extract signals from page text
        let tech_signals = extract_tech_signals(&page_text);
        let icp_score = score_icp(&page_text, &tech_signals);

        // Extract emails from HTML
        let emails = extract_emails_from_text(&page_text);

        // Derive company name from domain (best-effort)
        let name = domain_to_name(domain);

        let company = DiscoveredCompany {
            domain: domain.to_string(),
            name: name.clone(),
            description: page_text.chars().take(500).collect(),
            tech_signals: tech_signals.clone(),
            emails_found: emails,
            icp_score,
        };

        // Ingest into Pipeline storage
        let id = format!("d-{}", crc32fast::hash(domain.as_bytes()));
        let tech_str = tech_signals.join(",");
        ctx.pipeline.ingest_company(
            &id, &name, domain, "", 0, &tech_str, "", &company.description,
        )?;

        report.companies.push(company);
    }

    // Persist report
    state::save_report(&ctx.data_dir, "discovery", &report)?;

    // Update state counts
    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.discovered += report.companies.len();
    st.save(&ctx.data_dir)?;

    let created = report.companies.len();
    let errors = report.fetch_errors.clone();
    let processed = limit;
    let status = if errors.is_empty() { StageStatus::Success } else { StageStatus::Partial };

    Ok(StageReport {
        stage: "discover".into(),
        status,
        processed,
        created,
        errors,
        duration_ms: 0,
    })
}

// ── Helpers ───────────────────────────────────────────────────

fn read_domains(path: &Path) -> Result<Vec<String>> {
    let content = std::fs::read_to_string(path)?;
    Ok(content.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
}

async fn search_companies(http: &reqwest::Client, vertical: &str) -> Result<Vec<String>> {
    // DuckDuckGo HTML search (no API key required)
    let queries = [
        format!("AI {} companies hiring fully remote worldwide", vertical),
        "machine learning engineering companies remote-first distributed".to_string(),
        format!("AI infrastructure {} remote work from anywhere", vertical),
    ];

    let mut domains = Vec::new();
    for query in &queries {
        let url = format!("https://html.duckduckgo.com/html/?q={}", urlencoded(query));
        if let Ok(resp) = http.get(&url).send().await {
            if let Ok(body) = resp.text().await {
                // Extract domains from search results
                for domain in extract_domains_from_search(&body) {
                    if !domains.contains(&domain) {
                        domains.push(domain);
                    }
                }
            }
        }
    }
    Ok(domains)
}

fn extract_domains_from_search(html: &str) -> Vec<String> {
    let mut domains = Vec::new();
    // Look for href="https://..." patterns and extract domains
    for chunk in html.split("href=\"https://") {
        if let Some(slash) = chunk.find('/') {
            let domain = &chunk[..slash];
            let domain = domain.split('"').next().unwrap_or(domain);
            if domain.contains('.') && !domain.contains(' ')
                && !domain.starts_with("duckduckgo")
                && !domain.starts_with("www.google")
                && !domain.starts_with("html.")
                && domain.len() < 100
            {
                domains.push(domain.to_string());
            }
        }
    }
    domains
}

async fn fetch_page(http: &reqwest::Client, url: &str) -> Result<String> {
    let resp = http.get(url).send().await?;
    if !resp.status().is_success() {
        anyhow::bail!("HTTP {}", resp.status());
    }
    let body = resp.text().await?;
    Ok(body)
}

fn extract_text(html: &str) -> String {
    #[cfg(feature = "kernel-html")]
    {
        let result = crate::kernel::html_scanner::scan_html_full(html.as_bytes());
        result.text
    }
    #[cfg(not(feature = "kernel-html"))]
    {
        // Fallback: strip tags naively
        let mut out = String::new();
        let mut in_tag = false;
        for ch in html.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => { in_tag = false; out.push(' '); }
                _ if !in_tag => out.push(ch),
                _ => {}
            }
        }
        out
    }
}

fn extract_emails_from_text(text: &str) -> Vec<String> {
    let mut emails = Vec::new();
    for word in text.split_whitespace() {
        if word.contains('@') && word.contains('.') {
            let clean = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '.' && c != '_' && c != '-');
            if clean.len() > 5 {
                emails.push(clean.to_lowercase());
            }
        }
    }
    emails.sort();
    emails.dedup();
    emails
}

const TECH_KEYWORDS: &[&str] = &[
    "rust", "python", "kubernetes", "pytorch", "tensorflow", "mlops",
    "machine learning", "deep learning", "llm", "gpt", "transformer",
    "docker", "aws", "gcp", "azure", "postgresql", "kafka",
    "react", "typescript", "go", "golang", "scala", "spark",
    "airflow", "dbt", "snowflake", "databricks", "huggingface",
    "langchain", "vector database", "rag", "embeddings",
    "computer vision", "nlp", "reinforcement learning",
];

fn extract_tech_signals(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    TECH_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(**kw))
        .map(|kw| kw.to_string())
        .collect()
}

fn score_icp(text: &str, tech_signals: &[String]) -> f64 {
    let lower = text.to_lowercase();
    let mut score = 0.0;

    // AI/ML signals (0-40)
    let ai_keywords = ["artificial intelligence", "machine learning", "deep learning", "ai ", "ml ", "llm", "nlp"];
    let ai_hits = ai_keywords.iter().filter(|kw| lower.contains(**kw)).count();
    score += (ai_hits as f64 / ai_keywords.len() as f64) * 40.0;

    // Tech stack depth (0-25)
    score += (tech_signals.len().min(8) as f64 / 8.0) * 25.0;

    // Remote/EU signals (0-20)
    let geo_keywords = ["remote", "europe", "eu ", "berlin", "amsterdam", "london", "paris", "distributed"];
    let geo_hits = geo_keywords.iter().filter(|kw| lower.contains(**kw)).count();
    score += (geo_hits.min(3) as f64 / 3.0) * 20.0;

    // Hiring signals (0-15)
    let hiring = ["careers", "hiring", "join us", "open positions", "we're hiring", "job"];
    let hire_hits = hiring.iter().filter(|kw| lower.contains(**kw)).count();
    score += (hire_hits.min(3) as f64 / 3.0) * 15.0;

    score.min(100.0) / 100.0
}

fn domain_to_name(domain: &str) -> String {
    domain
        .split('.')
        .next()
        .unwrap_or(domain)
        .replace('-', " ")
        .split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().to_string() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+").replace('&', "%26")
}

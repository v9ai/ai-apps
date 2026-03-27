//! Enrichment stage — classify, score, enrich discovered companies.
//!
//! Input:  discovery report (companies with domains)
//! Output: enrichment report + updated Pipeline records

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::discover::DiscoveryReport;
use super::{llm, state, StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichmentReport {
    pub companies: Vec<EnrichedCompany>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichedCompany {
    pub domain: String,
    pub name: String,
    pub category: String,
    pub ai_tier: String,
    pub industry: String,
    pub tech_stack: Vec<String>,
    pub emails_found: Vec<String>,
    pub has_careers_page: bool,
    pub remote_policy: u8, // 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub enrichment_score: f64,
    pub confidence: f64,
}

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let discovery: DiscoveryReport = state::load_report(&ctx.data_dir, "discovery")
        .ok_or_else(|| anyhow::anyhow!("no discovery report — run discover first"))?;

    let api_key = ctx.llm_api_key.as_deref();

    let limit = ctx.batch.enrich.min(discovery.companies.len());
    // Sort by ICP score descending, enrich top N
    let mut candidates = discovery.companies.clone();
    candidates.sort_by(|a, b| b.icp_score.partial_cmp(&a.icp_score).unwrap_or(std::cmp::Ordering::Equal));
    let candidates = &candidates[..limit];

    let mut report = EnrichmentReport {
        companies: Vec::new(),
        errors: Vec::new(),
    };

    for company in candidates {
        // Fetch additional pages for richer signals
        let mut all_text = company.description.clone();
        let mut all_emails = company.emails_found.clone();
        let mut has_careers = false;

        for path in &["/about", "/team", "/careers", "/jobs", "/open-positions"] {
            let url = format!("https://{}{path}", company.domain);
            match ctx.http.get(&url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(body) = resp.text().await {
                        let text = strip_tags(&body);
                        all_text.push(' ');
                        all_text.push_str(&text);

                        // Check for careers/jobs pages
                        if *path == "/careers" || *path == "/jobs" || *path == "/open-positions" {
                            has_careers = true;
                        }

                        // Extract emails
                        for email in extract_emails(&text) {
                            if !all_emails.contains(&email) {
                                all_emails.push(email);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        // LLM classification (if API key available)
        let (category, ai_tier, industry, confidence) = if let Some(key) = api_key {
            match llm::classify_company(
                &ctx.http, &ctx.llm_base_url, key,
                &company.name, &company.domain, &all_text,
            ).await {
                Ok(cls) => (cls.category, cls.ai_tier, cls.industry, cls.confidence),
                Err(e) => {
                    report.errors.push(format!("{}: LLM classify: {e}", company.domain));
                    // Fallback: heuristic classification
                    heuristic_classify(&all_text)
                }
            }
        } else {
            // No API key — use heuristics
            heuristic_classify(&all_text)
        };

        // Detect remote policy from all fetched text
        let remote_policy = crate::kernel::job_ner::detect_remote_policy(
            &all_text.to_lowercase().into_bytes(),
        );

        let enrichment_score = compute_enrichment_score(
            &category, &ai_tier, &company.tech_signals, has_careers, remote_policy, confidence,
        );

        let enriched = EnrichedCompany {
            domain: company.domain.clone(),
            name: company.name.clone(),
            category,
            ai_tier,
            industry,
            tech_stack: company.tech_signals.clone(),
            emails_found: all_emails,
            has_careers_page: has_careers,
            remote_policy,
            enrichment_score,
            confidence,
        };

        report.companies.push(enriched);
    }

    state::save_report(&ctx.data_dir, "enrichment", &report)?;

    // Update state
    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.enriched += report.companies.len();
    st.save(&ctx.data_dir)?;

    let created = report.companies.len();
    let errors = report.errors.clone();
    let status = if errors.is_empty() { StageStatus::Success } else { StageStatus::Partial };

    Ok(StageReport {
        stage: "enrich".into(),
        status,
        processed: limit,
        created,
        errors,
        duration_ms: 0,
    })
}

fn heuristic_classify(text: &str) -> (String, String, String, f64) {
    let lower = text.to_lowercase();

    let category = if lower.contains("consulting") || lower.contains("consultancy") || lower.contains("custom development") {
        "CONSULTANCY"
    } else if lower.contains("agency") || lower.contains("creative") || lower.contains("design studio") {
        "AGENCY"
    } else if lower.contains("staffing") || lower.contains("recruitment") || lower.contains("talent") {
        "STAFFING"
    } else {
        "PRODUCT"
    };

    let ai_tier = if lower.contains("artificial intelligence") || lower.contains("machine learning company")
        || lower.contains("ai-first") || lower.contains("ai company")
    {
        "ai_first"
    } else if lower.contains("ai") || lower.contains("machine learning") || lower.contains("deep learning") {
        "ai_native"
    } else {
        "other"
    };

    let industry = if lower.contains("healthcare") || lower.contains("health") {
        "healthcare"
    } else if lower.contains("fintech") || lower.contains("financial") {
        "fintech"
    } else if lower.contains("devtools") || lower.contains("developer") {
        "devtools"
    } else {
        "technology"
    };

    (category.into(), ai_tier.into(), industry.into(), 0.4)
}

fn compute_enrichment_score(
    category: &str, ai_tier: &str, tech: &[String], has_careers: bool,
    remote_policy: u8, confidence: f64,
) -> f64 {
    let mut score = 0.0;

    // Category weight (CONSULTANCY is primary ICP target)
    score += match category {
        "CONSULTANCY" => 25.0,
        "PRODUCT" => 20.0,
        "AGENCY" => 12.0,
        _ => 5.0,
    };

    // AI tier
    score += match ai_tier {
        "ai_first" => 25.0,
        "ai_native" => 18.0,
        _ => 5.0,
    };

    // Remote policy (critical filter)
    score += match remote_policy {
        1 => 20.0, // full_remote
        2 => 12.0, // hybrid
        3 => 0.0,  // onsite
        _ => 0.0,  // unknown
    };

    // Tech stack depth
    score += (tech.len().min(8) as f64 / 8.0) * 15.0;

    // Careers page
    if has_careers { score += 8.0; }

    // Confidence modifier
    score += confidence * 7.0;

    score.min(100.0) / 100.0
}

fn strip_tags(html: &str) -> String {
    #[cfg(feature = "kernel-html")]
    {
        crate::kernel::html_scanner::scan_html_full(html.as_bytes()).text
    }
    #[cfg(not(feature = "kernel-html"))]
    {
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

fn extract_emails(text: &str) -> Vec<String> {
    text.split_whitespace()
        .filter(|w| w.contains('@') && w.contains('.'))
        .map(|w| {
            w.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '.' && c != '_' && c != '-')
                .to_lowercase()
        })
        .filter(|e| e.len() > 5)
        .collect()
}

use std::sync::Arc;

use anyhow::Result;
use futures::stream::{self, StreamExt};
use tracing::{error, info, warn};

use crate::classify;
use crate::db;
use crate::scrape;
use crate::seeds::{self, SeedCompany};
use crate::{Consultancy, ScoreReasons};

const PARALLELISM: usize = 8;

pub async fn run(
    pool: &sqlx::PgPool,
    dry_run: bool,
    limit: Option<usize>,
) -> Result<()> {
    let all_seeds = seeds::seeds();
    info!("Loaded {} seed consultancies", all_seeds.len());

    let candidates: Vec<SeedCompany> = if let Some(n) = limit {
        all_seeds.into_iter().take(n).collect()
    } else {
        all_seeds
    };
    info!("Processing {} candidates", candidates.len());

    let client = Arc::new(
        reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()?,
    );
    let pool = Arc::new(pool.clone());

    let results: Vec<_> = stream::iter(candidates)
        .map(|seed| {
            let client = Arc::clone(&client);
            let pool = Arc::clone(&pool);
            let dry_run = dry_run;

            async move {
                let text = match scrape::fetch_and_extract(&client, seed.website).await {
                    Ok(t) => t,
                    Err(e) => {
                        warn!("[SKIP] {} ({}): {e:#}", seed.name, seed.website);
                        return Err(seed.name);
                    }
                };

                if classify::is_offshore_location(&text) {
                    warn!("[OFFSHORE] {} — skipping", seed.name);
                    return Err(seed.name);
                }

                let result = classify::classify(&text);
                let consultancy = build_consultancy(&seed, &text, &result);

                if dry_run {
                    info!(
                        "[DRY] {} | score={:.2} ai_tier={} consultancy={} ai={}",
                        seed.name, consultancy.score, consultancy.ai_tier,
                        result.is_consultancy, result.is_ai_focused,
                    );
                    return Ok(consultancy);
                }

                match db::upsert_company(&pool, &consultancy).await {
                    Ok(id) => {
                        info!(
                            "[OK] {} → id={id} score={:.2} ai_tier={}",
                            seed.name, consultancy.score, consultancy.ai_tier,
                        );
                        Ok(consultancy)
                    }
                    Err(e) => {
                        error!("[DB] {}: {e:#}", seed.name);
                        Err(seed.name)
                    }
                }
            }
        })
        .buffer_unordered(PARALLELISM)
        .collect()
        .await;

    let mut ok = 0usize;
    let mut ai_count = 0usize;
    let mut failed = 0usize;
    for r in &results {
        match r {
            Ok(c) => {
                ok += 1;
                if c.is_ai_focused {
                    ai_count += 1;
                }
            }
            Err(_) => failed += 1,
        }
    }

    info!("──────────────────────────────────────────────");
    info!(
        "Total: {} | OK: {} | AI-focused: {} | Failed/Skipped: {}",
        results.len(),
        ok,
        ai_count,
        failed,
    );

    Ok(())
}

fn build_consultancy(
    seed: &SeedCompany,
    scraped_text: &str,
    result: &classify::ClassificationResult,
) -> Consultancy {
    let canonical_domain = extract_domain(seed.website);
    let key = domain_to_key(&canonical_domain);

    let source_bonus: f32 = 0.8;
    let score = 0.4 * result.consultancy_score + 0.4 * result.ai_score + 0.2 * source_bonus;

    let description = truncate_utf8(scraped_text, 500);

    let services = extract_services(result);
    let industries = vec!["Technology".to_string(), "AI/ML".to_string()];

    Consultancy {
        key,
        name: seed.name.to_string(),
        website: seed.website.to_string(),
        canonical_domain,
        description,
        location: seed.location.to_string(),
        size: String::new(),
        source: "seed".to_string(),
        services,
        industries,
        is_ai_focused: result.is_ai_focused,
        score: score.min(1.0),
        score_reasons: ScoreReasons {
            method: "consultancy-discover-v1",
            keyword_hits: result.keyword_hits.clone(),
            ai_keyword_hits: result.ai_keyword_hits.clone(),
            anti_hits: result.anti_hits.clone(),
            source_bonus,
            ai_score: result.ai_score,
            consultancy_score: result.consultancy_score,
        },
        ai_tier: result.ai_tier,
    }
}

fn extract_domain(url: &str) -> String {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()))
        .map(|h| h.strip_prefix("www.").unwrap_or(&h).to_string())
        .unwrap_or_default()
}

fn domain_to_key(domain: &str) -> String {
    let cleaned = domain.replace('.', "-").to_lowercase();
    regex::Regex::new(r"[^a-z0-9-]")
        .unwrap()
        .replace_all(&cleaned, "")
        .to_string()
}

fn truncate_utf8(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut end = max_bytes;
    while !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}

fn extract_services(result: &classify::ClassificationResult) -> Vec<String> {
    let mut services = Vec::new();
    for kw in &result.ai_keyword_hits {
        let service = match kw.as_str() {
            "machine learning" => "Machine Learning",
            "artificial intelligence" => "Artificial Intelligence",
            "deep learning" => "Deep Learning",
            "natural language processing" | "nlp" => "NLP",
            "computer vision" => "Computer Vision",
            "generative ai" => "Generative AI",
            "large language model" | "llm" => "LLM Development",
            "mlops" => "MLOps",
            "data science" | "data science consulting" => "Data Science",
            "ai consulting" => "AI Consulting",
            "ai strategy" => "AI Strategy",
            "ml engineering" => "ML Engineering",
            "predictive analytics" => "Predictive Analytics",
            "ai research" => "AI Research",
            "foundation model" => "Foundation Models",
            "reinforcement learning" => "Reinforcement Learning",
            "prompt engineering" => "Prompt Engineering",
            "fine-tuning" => "Fine-Tuning",
            _ => continue,
        };
        if !services.contains(&service.to_string()) {
            services.push(service.to_string());
        }
    }
    if services.is_empty() {
        services.push("AI/ML Consulting".to_string());
    }
    services
}

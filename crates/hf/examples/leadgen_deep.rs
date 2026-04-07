//! Deep search for models that could feed a lead-gen pipeline —
//! beyond obvious "sales" keywords. Looking for the building blocks:
//! entity extraction, classification, embeddings, web parsing, etc.

use hf::HfClient;
use std::collections::HashMap;

const DOMAINS: &[(&str, &[&str])] = &[
    // === CORE LEAD-GEN BUILDING BLOCKS ===
    ("COMPANY/ORG NER", &[
        "organization NER", "company extraction", "company NER",
        "organization extraction", "ORG NER", "corporate entity",
        "company name extraction", "business NER",
    ]),
    ("PERSON/ROLE NER", &[
        "person NER", "job title extraction", "job title NER",
        "seniority classification", "role extraction", "PER NER",
        "person extraction", "name extraction",
    ]),
    ("INDUSTRY CLASSIFICATION", &[
        "industry classification", "company classification",
        "business classification", "sector classification",
        "NAICS", "SIC code", "industry sector",
    ]),
    ("TECH STACK / PRODUCT NER", &[
        "technology NER", "software NER", "product NER",
        "tech stack", "programming language detection",
        "technology extraction", "software extraction",
    ]),
    ("JOB POSTING ANALYSIS", &[
        "job posting", "job description", "job classification",
        "job parsing", "job extraction", "job NER",
        "job title classification", "hiring",
    ]),
    ("WEB CONTENT EXTRACTION", &[
        "web scraping", "web extraction", "HTML extraction",
        "website classification", "URL classification",
        "web content", "webpage classification",
    ]),
    ("EMAIL EXTRACTION", &[
        "email extraction", "email address", "contact information",
        "email NER", "email finder",
    ]),
    // === EMBEDDINGS & SIMILARITY (core for ICP matching) ===
    ("SENTENCE EMBEDDINGS", &[
        "sentence similarity", "semantic search", "sentence embeddings",
        "sentence-transformers", "e5 embedding", "bge embedding",
        "gte embedding",
    ]),
    ("ZERO-SHOT CLASSIFICATION", &[
        "zero-shot classification", "zero shot", "MNLI",
        "natural language inference",
    ]),
    // === ENRICHMENT SIGNALS ===
    ("NEWS/EVENT EXTRACTION", &[
        "news classification", "event extraction", "event detection",
        "news NER", "news sentiment", "press release",
    ]),
    ("FUNDING/FINANCIAL", &[
        "funding round", "startup", "venture capital",
        "financial NER", "SEC filing", "earnings",
    ]),
    ("SOCIAL MEDIA / LINKEDIN", &[
        "LinkedIn", "social media profile", "Twitter profile",
        "social media NER", "profile extraction",
    ]),
    // === LANGUAGE/QUALITY ===
    ("TEXT QUALITY / LANGUAGE", &[
        "language detection", "text quality", "spam classification",
        "text classification", "topic classification",
    ]),
    ("SUMMARIZATION (for research)", &[
        "summarization", "abstractive summarization",
        "document summarization", "text summarization",
    ]),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(16)?;

    let mut category_stats: Vec<(&str, u64, usize, usize, usize, String, u64)> = Vec::new();
    let mut hot_models: Vec<(u64, String, String, String, String, String, u64)> = Vec::new();
    let mut global_seen: HashMap<String, bool> = HashMap::new();

    for (category, queries) in DOMAINS {
        let mut seen: HashMap<String, u64> = HashMap::new();
        let mut cat_dl = 0u64;
        let mut cat_100k = 0usize;
        let mut cat_10k = 0usize;
        let mut cat_1k = 0usize;
        let mut cat_top = String::new();
        let mut cat_top_dl = 0u64;

        for query in *queries {
            let results = client.search_models(query, 50).await.unwrap_or_default();
            for m in results {
                let repo_id = m.repo_id.clone().unwrap_or_default();
                let dl = m.downloads.unwrap_or(0);
                if seen.contains_key(&repo_id) { continue; }
                seen.insert(repo_id.clone(), dl);

                cat_dl += dl;
                if dl >= 100_000 { cat_100k += 1; }
                if dl >= 10_000 { cat_10k += 1; }
                if dl >= 1_000 { cat_1k += 1; }
                if dl > cat_top_dl {
                    cat_top_dl = dl;
                    cat_top = repo_id.clone();
                }

                // Collect models with real adoption for deep analysis
                if dl >= 5_000 && !global_seen.contains_key(&repo_id) {
                    global_seen.insert(repo_id.clone(), true);
                    hot_models.push((
                        dl,
                        repo_id,
                        category.to_string(),
                        m.author.as_deref().unwrap_or("-").to_owned(),
                        m.library.as_deref().unwrap_or("-").to_owned(),
                        m.pipeline_tag.as_deref().unwrap_or("-").to_owned(),
                        m.likes.unwrap_or(0),
                    ));
                }
            }
        }

        category_stats.push((category, cat_dl, cat_100k, cat_10k, cat_1k, cat_top, cat_top_dl));
    }

    // Sort categories by total downloads
    category_stats.sort_by(|a, b| b.1.cmp(&a.1));

    eprintln!("\n{}", "=".repeat(140));
    eprintln!("  LEAD-GEN BUILDING BLOCKS ON HUGGINGFACE");
    eprintln!("{}", "=".repeat(140));
    eprintln!(
        "  {:<30} {:>12} {:>6} {:>6} {:>6} {:>10}  {}",
        "CATEGORY", "TOTAL DL", "≥100K", "≥10K", "≥1K", "TOP DL", "TOP MODEL"
    );
    eprintln!("  {}", "-".repeat(135));

    for (cat, total, c100k, c10k, c1k, top, top_dl) in &category_stats {
        let marker = if *c100k > 0 { "***" } else if *c10k > 0 { " * " } else { "   " };
        eprintln!(
            "{marker} {:<30} {:>12} {:>6} {:>6} {:>6} {:>10}  {}",
            cat, fmt(*total), c100k, c10k, c1k, fmt(*top_dl),
            trunc(top, 50),
        );
    }

    // Sort hot models by downloads
    hot_models.sort_by(|a, b| b.0.cmp(&a.0));

    eprintln!("\n{}", "=".repeat(140));
    eprintln!("  HOT MODELS (≥5K downloads) — LEAD-GEN RELEVANT");
    eprintln!("{}", "=".repeat(140));

    let mut prev_cat = String::new();
    // Group by category
    for cat_name in category_stats.iter().map(|(c, ..)| *c) {
        let cat_models: Vec<_> = hot_models.iter()
            .filter(|(_, _, cat, ..)| cat == cat_name)
            .collect();
        if cat_models.is_empty() { continue; }

        if prev_cat != cat_name {
            eprintln!("\n  --- {cat_name} ---");
            prev_cat = cat_name.to_string();
        }

        for (dl, repo_id, _, author, lib, tag, likes) in cat_models.iter().take(10) {
            eprintln!(
                "    {dl:>10} dl  {likes:>5} lk  {repo_id:<55} {author:<20} {lib:<18} {tag}",
            );
        }
    }

    // Fetch cards for top 30 most promising
    let top_ids: Vec<String> = hot_models.iter()
        .filter(|(_, _, cat, ..)| !matches!(cat.as_str(),
            "SENTENCE EMBEDDINGS" | "ZERO-SHOT CLASSIFICATION" |
            "SUMMARIZATION (for research)" | "TEXT QUALITY / LANGUAGE"))
        .take(30)
        .map(|(_, id, ..)| id.clone())
        .collect();

    if !top_ids.is_empty() {
        eprintln!("\n{}", "=".repeat(140));
        eprintln!("  MODEL CARD DEEP ANALYSIS — TOP LEAD-GEN CANDIDATES");
        eprintln!("{}", "=".repeat(140));

        let cards = client.fetch_model_cards(&top_ids).await.unwrap_or_default();

        for id in &top_ids {
            if let Some(card) = cards.get(id.as_str()) {
                let lower = card.to_lowercase();
                let lines = card.lines().count();
                let dl = hot_models.iter().find(|(_, rid, ..)| rid == id).map(|m| m.0).unwrap_or(0);

                let kws = [
                    "lead", "sales", "crm", "b2b", "enterprise", "company",
                    "organization", "contact", "email", "linkedin", "job posting",
                    "hiring", "tech stack", "funding", "startup", "industry",
                    "classification", "extraction", "enrichment", "scraping",
                    "pipeline", "prospect", "customer", "account",
                ];
                let mentions: Vec<&str> = kws.iter()
                    .filter(|&&kw| lower.contains(kw))
                    .copied()
                    .collect();

                if !mentions.is_empty() || lines > 50 {
                    let cat = hot_models.iter().find(|(_, rid, ..)| rid == id).map(|m| m.2.as_str()).unwrap_or("?");
                    eprintln!(
                        "  {dl:>8} dl  [{cat:<25}]  {id:<50} lines={lines:<4} kw={mentions:?}",
                    );
                }
            }
        }
    }

    eprintln!("\nTotal unique models scanned: {}", global_seen.len() +
        category_stats.iter().map(|(_, _, _, _, c1k, ..)| c1k).sum::<usize>());

    Ok(())
}

fn fmt(n: u64) -> String {
    if n >= 1_000_000 { format!("{:.1}M", n as f64 / 1e6) }
    else if n >= 1_000 { format!("{:.1}K", n as f64 / 1e3) }
    else { format!("{n}") }
}

fn trunc(s: &str, max: usize) -> &str {
    if s.len() > max { &s[..max] } else { s }
}

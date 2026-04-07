//! Search HF across B2B/enterprise-adjacent domains to find where
//! real adoption exists beyond pure "sales AI".

use hf::HfClient;
use std::collections::HashMap;

/// (domain_label, queries)
const DOMAINS: &[(&str, &[&str])] = &[
    ("SALES", &[
        "sales email", "sales conversation", "lead scoring", "lead generation",
        "B2B intent", "revenue prediction", "sales forecasting", "CRM",
        "deal scoring", "outreach", "cold email", "prospecting",
    ]),
    ("CONTACT CENTER / SUPPORT", &[
        "customer support", "call center", "ticket classification",
        "support ticket", "helpdesk", "customer service", "call routing",
        "agent assist", "contact center",
    ]),
    ("CONVERSATIONAL AI", &[
        "chatbot", "dialogue", "conversational", "virtual assistant",
        "question answering customer", "FAQ",
    ]),
    ("EMAIL / COMMUNICATION", &[
        "email classification", "email generation", "email intent",
        "spam detection", "phishing detection", "email parsing",
    ]),
    ("NER / ENTITY EXTRACTION", &[
        "company NER", "organization NER", "business entity",
        "person extraction", "address extraction", "resume parsing",
        "invoice extraction", "receipt extraction",
    ]),
    ("FINANCIAL / FINTECH", &[
        "fraud detection", "credit scoring", "financial sentiment",
        "stock prediction", "financial NER", "financial classification",
        "anti money laundering", "transaction classification",
    ]),
    ("HR / RECRUITING", &[
        "resume parsing", "job matching", "candidate scoring",
        "resume classification", "skill extraction", "job classification",
    ]),
    ("MARKETING", &[
        "ad classification", "campaign optimization", "marketing sentiment",
        "brand monitoring", "social media monitoring", "content moderation",
        "audience segmentation", "product review",
    ]),
    ("DOCUMENT INTELLIGENCE", &[
        "document classification", "invoice processing", "contract analysis",
        "table extraction", "form extraction", "OCR",
        "document understanding", "layout analysis",
    ]),
    ("KNOWLEDGE EXTRACTION", &[
        "relation extraction", "entity linking", "knowledge graph",
        "information extraction", "event extraction", "fact extraction",
    ]),
    ("CHURN / RETENTION", &[
        "churn prediction", "churn", "customer retention",
        "customer lifetime value", "subscription cancellation",
    ]),
    ("PRICING / RECOMMENDATION", &[
        "price prediction", "product recommendation", "demand forecasting",
        "price optimization", "dynamic pricing",
    ]),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    let mut domain_stats: Vec<(&str, u64, u64, usize, usize, String)> = Vec::new();

    for (domain, queries) in DOMAINS {
        let mut seen: HashMap<String, u64> = HashMap::new();
        let mut total_dl = 0u64;
        let mut count_10k = 0usize;
        let mut count_1k = 0usize;
        let mut top_model = String::new();
        let mut top_dl = 0u64;

        for query in *queries {
            let results = client.search_models(query, 50).await.unwrap_or_default();
            for m in results {
                let repo_id = m.repo_id.clone().unwrap_or_default();
                let dl = m.downloads.unwrap_or(0);
                let author = m.author.as_deref().unwrap_or("");

                // Skip Salesforce general research
                if author == "Salesforce" {
                    continue;
                }

                if seen.contains_key(&repo_id) {
                    continue;
                }
                seen.insert(repo_id.clone(), dl);
                total_dl += dl;

                if dl >= 10_000 {
                    count_10k += 1;
                }
                if dl >= 1_000 {
                    count_1k += 1;
                }
                if dl > top_dl {
                    top_dl = dl;
                    top_model = repo_id;
                }
            }
        }

        domain_stats.push((domain, total_dl, top_dl, count_10k, count_1k, top_model));
    }

    // Sort by total downloads descending
    domain_stats.sort_by(|a, b| b.1.cmp(&a.1));

    eprintln!("\n{}", "=".repeat(140));
    eprintln!("  B2B / ENTERPRISE DOMAIN ADOPTION ON HUGGINGFACE (excl. Salesforce Research)");
    eprintln!("{}", "=".repeat(140));
    eprintln!(
        "  {:<35} {:>12} {:>8} {:>8} {:>12}  {}",
        "DOMAIN", "TOTAL DL", "≥10K", "≥1K", "TOP DL", "TOP MODEL"
    );
    eprintln!("  {}", "-".repeat(135));

    for (domain, total_dl, top_dl, count_10k, count_1k, top_model) in &domain_stats {
        eprintln!(
            "  {:<35} {:>12} {:>8} {:>8} {:>12}  {}",
            domain,
            format_dl(*total_dl),
            count_10k,
            count_1k,
            format_dl(*top_dl),
            if top_model.len() > 55 { &top_model[..55] } else { top_model },
        );
    }

    // Now deep-dive into top 3 domains — show top 10 models each
    eprintln!("\n");
    let top_domains: Vec<&str> = domain_stats.iter().take(5).map(|(d, ..)| *d).collect();

    for domain_name in top_domains {
        let queries = DOMAINS.iter().find(|(d, _)| *d == domain_name).unwrap().1;
        let mut seen: HashMap<String, u64> = HashMap::new();
        let mut models = Vec::new();

        for query in queries {
            let results = client.search_models(query, 50).await.unwrap_or_default();
            for m in results {
                let repo_id = m.repo_id.clone().unwrap_or_default();
                let dl = m.downloads.unwrap_or(0);
                let author = m.author.as_deref().unwrap_or("").to_owned();
                if author == "Salesforce" || seen.contains_key(&repo_id) {
                    continue;
                }
                seen.insert(repo_id.clone(), dl);
                let lib = m.library.as_deref().unwrap_or("-").to_owned();
                let tag = m.pipeline_tag.as_deref().unwrap_or("-").to_owned();
                let likes = m.likes.unwrap_or(0);
                models.push((dl, repo_id, author, lib, tag, likes, query.to_string()));
            }
        }

        models.sort_by(|a, b| b.0.cmp(&a.0));

        eprintln!("{}", "=".repeat(140));
        eprintln!("  TOP MODELS: {domain_name}");
        eprintln!("{}", "=".repeat(140));

        for (dl, repo_id, author, lib, tag, likes, query) in models.iter().take(15) {
            eprintln!(
                "  {dl:>10} dl  {likes:>5} lk  {repo_id:<55} {author:<20} {lib:<18} {tag:<25} q=\"{query}\""
            );
        }
        eprintln!();
    }

    Ok(())
}

fn format_dl(n: u64) -> String {
    if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}K", n as f64 / 1_000.0)
    } else {
        format!("{n}")
    }
}

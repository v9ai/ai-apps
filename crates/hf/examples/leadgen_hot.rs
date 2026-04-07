//! Find the ACTUALLY hot models for lead-gen — the building blocks
//! people use in production, not the "lead scoring" toys.

use hf::HfClient;
use std::collections::HashMap;

const QUERIES: &[(&str, &[&str])] = &[
    // Zero-shot NER (the real game-changer for lead gen)
    ("GLINER / ZERO-SHOT NER", &[
        "GLiNER", "zero-shot NER", "universal NER",
        "open NER", "few-shot NER", "NuNER",
    ]),
    // General NER that works for business entities
    ("GENERAL NER (OntoNotes/CoNLL)", &[
        "NER conll", "NER ontonotes", "named entity recognition",
        "NER bert", "NER roberta", "flair NER",
    ]),
    // Embeddings specifically for retrieval/matching
    ("BGE / E5 / GTE EMBEDDINGS", &[
        "bge-large", "bge-small", "bge-base",
        "e5-large", "e5-base", "e5-small",
        "gte-large", "gte-base", "gte-small",
        "nomic-embed", "jina-embeddings",
    ]),
    // Classification without training data
    ("ZERO-SHOT + FEW-SHOT CLASS", &[
        "zero-shot classification", "SetFit",
        "few-shot classification", "prompt classification",
    ]),
    // Rerankers (critical for search/matching quality)
    ("RERANKERS", &[
        "reranker", "cross-encoder", "bge-reranker",
        "ms-marco reranker", "jina-reranker",
    ]),
    // Structured extraction from text
    ("STRUCTURED EXTRACTION", &[
        "information extraction", "relation extraction",
        "structured output", "JSON extraction",
        "key value extraction",
    ]),
    // Job/skill/role understanding
    ("JOB MARKET MODELS", &[
        "jobbert", "skill extraction", "job title",
        "resume parsing", "ESCO", "O*NET",
        "occupation classification",
    ]),
    // Address/location parsing (for geo targeting)
    ("GEO / ADDRESS PARSING", &[
        "address parsing", "geocoding", "location NER",
        "address NER", "geoparser",
    ]),
    // Website/URL understanding
    ("WEB / URL INTELLIGENCE", &[
        "website classification", "URL classification",
        "domain classification", "web page classification",
        "HTML understanding",
    ]),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(16)?;
    let mut global_seen: HashMap<String, bool> = HashMap::new();

    for (category, queries) in QUERIES {
        let mut models = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();

        for query in *queries {
            let results = client.search_models(query, 50).await.unwrap_or_default();
            for m in results {
                let repo_id = m.repo_id.clone().unwrap_or_default();
                let dl = m.downloads.unwrap_or(0);
                if seen.contains_key(&repo_id) || global_seen.contains_key(&repo_id) { continue; }
                seen.insert(repo_id.clone(), true);
                global_seen.insert(repo_id.clone(), true);

                // Skip OpenMed (biomedical, not business)
                let author = m.author.as_deref().unwrap_or("");
                if author == "OpenMed" { continue; }

                let lib = m.library.as_deref().unwrap_or("-").to_owned();
                let tag = m.pipeline_tag.as_deref().unwrap_or("-").to_owned();
                let likes = m.likes.unwrap_or(0);

                models.push((dl, repo_id, author.to_owned(), lib, tag, likes));
            }
        }

        models.sort_by(|a, b| b.0.cmp(&a.0));

        let total_dl: u64 = models.iter().map(|m| m.0).sum();
        let count_100k = models.iter().filter(|m| m.0 >= 100_000).count();
        let count_10k = models.iter().filter(|m| m.0 >= 10_000).count();

        eprintln!("\n{}", "=".repeat(130));
        eprintln!(
            "  {category}  —  total={} | ≥100K={count_100k} | ≥10K={count_10k} | models={}",
            fmt(total_dl), models.len()
        );
        eprintln!("{}", "=".repeat(130));

        for (dl, repo_id, author, lib, tag, likes) in models.iter().take(15) {
            let marker = if *dl >= 100_000 { "***" }
                else if *dl >= 10_000 { " * " }
                else if *dl >= 1_000 { " . " }
                else { "   " };
            eprintln!(
                "{marker} {dl:>10} dl  {likes:>5} lk  {repo_id:<55} {author:<22} {lib:<20} {tag}",
            );
        }
    }

    // Now fetch model cards for the most interesting ones
    let interesting = [
        // GLiNER family
        "urchade/gliner_multi_pii-v1",
        "urchade/gliner_multi-v2.1",
        "urchade/gliner_medium-v2.1",
        "urchade/gliner_small-v2.1",
        "urchade/gliner_large-v2.1",
        "knowledgator/gliner-multitask-large-v0.5",
        // Job market
        "jjzha/jobbert_skill_extraction",
        "jjzha/jobbert_knowledge_extraction",
        // Web classification
        "alimazhar-110/website_classification",
        // Rerankers
        "cross-encoder/ms-marco-MiniLM-L-6-v2",
        // SetFit
        "SetFit/bge-small-en-v1.5-sst2-8-shot",
    ];

    let ids: Vec<String> = interesting.iter().map(|s| s.to_string()).collect();
    let cards = client.fetch_model_cards(&ids).await.unwrap_or_default();

    eprintln!("\n{}", "=".repeat(130));
    eprintln!("  KEY MODEL CARDS — LEAD-GEN RELEVANCE CHECK");
    eprintln!("{}", "=".repeat(130));

    for id in &interesting {
        if let Some(card) = cards.get(*id) {
            let lower = card.to_lowercase();
            let lines = card.lines().count();

            let kws = [
                "company", "organization", "person", "email", "phone",
                "address", "job", "skill", "industry", "product",
                "technology", "linkedin", "website", "entity", "extraction",
                "classification", "zero-shot", "few-shot", "any label",
                "custom entities", "lead", "sales", "crm", "b2b",
            ];
            let mentions: Vec<&str> = kws.iter()
                .filter(|&&kw| lower.contains(kw))
                .copied()
                .collect();

            eprintln!("  {id:<55} lines={lines:<4}  kw={mentions:?}");
        }
    }

    Ok(())
}

fn fmt(n: u64) -> String {
    if n >= 1_000_000 { format!("{:.1}M", n as f64 / 1e6) }
    else if n >= 1_000 { format!("{:.1}K", n as f64 / 1e3) }
    else { format!("{n}") }
}

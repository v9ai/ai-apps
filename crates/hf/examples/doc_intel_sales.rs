//! Deep dive into Document Intelligence models on HF — which ones
//! are relevant to B2B sales pipelines (invoice extraction, contract
//! analysis, proposal parsing, business card OCR, etc.)

use hf::{HfClient, OrgScanner};
use std::collections::HashMap;

/// Queries organized by sales-relevance tier
const QUERIES: &[(&str, &[&str])] = &[
    // Tier 1: Directly sales-relevant document types
    ("INVOICE/RECEIPT", &[
        "invoice extraction", "invoice processing", "invoice parsing",
        "receipt extraction", "receipt OCR", "receipt parsing",
        "invoice classification", "invoice",
    ]),
    ("CONTRACT/LEGAL", &[
        "contract analysis", "contract extraction", "contract NER",
        "legal document", "clause extraction", "NDA",
        "contract classification", "legal NER",
    ]),
    ("BUSINESS CARD/CONTACT", &[
        "business card OCR", "business card", "contact extraction",
        "visiting card", "card scanner",
    ]),
    ("FORM/TABLE EXTRACTION", &[
        "form extraction", "table extraction", "table detection",
        "form understanding", "structured extraction",
        "key value extraction", "form parsing",
    ]),
    ("DOCUMENT LAYOUT", &[
        "layout analysis", "document layout", "document segmentation",
        "page segmentation", "document structure",
    ]),
    ("DOCUMENT CLASSIFICATION", &[
        "document classification", "document type", "document categorization",
    ]),
    // Tier 2: Sales-adjacent document processing
    ("PROPOSAL/RFP", &[
        "proposal extraction", "RFP", "quote extraction",
        "proposal analysis", "bid extraction",
    ]),
    ("FINANCIAL DOCUMENT", &[
        "financial document", "bank statement", "financial report",
        "earnings report", "SEC filing", "10-K",
    ]),
    ("EMAIL DOCUMENT", &[
        "email extraction", "email parsing", "email document",
        "email attachment", "email header",
    ]),
    // Tier 3: General doc intel with sales applications
    ("HANDWRITING/SIGNATURE", &[
        "handwriting recognition", "signature detection",
        "signature verification", "handwritten",
    ]),
    ("DOCUMENT QA", &[
        "document question answering", "document QA", "DocVQA",
        "document understanding",
    ]),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    let mut all_models: Vec<(u64, String, String, String, String, String, u64)> = Vec::new();
    let mut seen: HashMap<String, u64> = HashMap::new();
    let mut category_stats: Vec<(&str, u64, usize, usize, String, u64)> = Vec::new();

    for (category, queries) in QUERIES {
        let mut cat_dl = 0u64;
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
                if dl >= 10_000 { cat_10k += 1; }
                if dl >= 1_000 { cat_1k += 1; }
                if dl > cat_top_dl {
                    cat_top_dl = dl;
                    cat_top = repo_id.clone();
                }

                let author = m.author.as_deref().unwrap_or("-").to_owned();
                let lib = m.library.as_deref().unwrap_or("-").to_owned();
                let tag = m.pipeline_tag.as_deref().unwrap_or("-").to_owned();
                let likes = m.likes.unwrap_or(0);

                all_models.push((dl, repo_id, category.to_string(), author, lib, tag, likes));
            }
        }

        category_stats.push((category, cat_dl, cat_10k, cat_1k, cat_top, cat_top_dl));
    }

    // Print category summary
    category_stats.sort_by(|a, b| b.1.cmp(&a.1));

    eprintln!("\n{}", "=".repeat(130));
    eprintln!("  DOCUMENT INTELLIGENCE — SALES-RELEVANT SUBCATEGORIES");
    eprintln!("{}", "=".repeat(130));
    eprintln!(
        "  {:<25} {:>12} {:>6} {:>6} {:>10}  {}",
        "CATEGORY", "TOTAL DL", "≥10K", "≥1K", "TOP DL", "TOP MODEL"
    );
    eprintln!("  {}", "-".repeat(125));

    for (cat, total, c10k, c1k, top, top_dl) in &category_stats {
        eprintln!(
            "  {:<25} {:>12} {:>6} {:>6} {:>10}  {}",
            cat, fmt(*total), c10k, c1k, fmt(*top_dl),
            if top.len() > 55 { &top[..55] } else { top },
        );
    }

    // Top 15 models per top 5 categories
    all_models.sort_by(|a, b| b.0.cmp(&a.0));

    let top_cats: Vec<&str> = category_stats.iter().take(6).map(|(c, ..)| *c).collect();

    for cat_name in &top_cats {
        let cat_models: Vec<_> = all_models.iter().filter(|m| m.2 == *cat_name).take(12).collect();
        if cat_models.is_empty() { continue; }

        eprintln!("\n{}", "-".repeat(130));
        eprintln!("  {cat_name}:");
        eprintln!("{}", "-".repeat(130));

        for (dl, repo_id, _, author, lib, tag, likes) in &cat_models {
            eprintln!(
                "    {dl:>10} dl  {likes:>4} lk  {repo_id:<55} {author:<20} {lib:<18} {tag}",
            );
        }
    }

    // Fetch model cards for top 20 sales-relevant models to check actual content
    let sales_relevant: Vec<String> = all_models.iter()
        .filter(|(dl, _, cat, ..)| {
            *dl >= 500 && matches!(cat.as_str(),
                "INVOICE/RECEIPT" | "CONTRACT/LEGAL" | "BUSINESS CARD/CONTACT" |
                "FORM/TABLE EXTRACTION" | "PROPOSAL/RFP" | "FINANCIAL DOCUMENT")
        })
        .take(25)
        .map(|(_, id, ..)| id.clone())
        .collect();

    if !sales_relevant.is_empty() {
        eprintln!("\n{}", "=".repeat(130));
        eprintln!("  MODEL CARD ANALYSIS — SALES-RELEVANT DOC INTEL (≥500 dl)");
        eprintln!("{}", "=".repeat(130));

        let cards = client.fetch_model_cards(&sales_relevant).await.unwrap_or_default();

        for id in &sales_relevant {
            if let Some(card) = cards.get(id.as_str()) {
                let lower = card.to_lowercase();
                let bp = OrgScanner::detect_boilerplate(card);
                let cookbook = OrgScanner::detect_cookbook_recipe(card, &[]);
                let lines = card.lines().count();
                let dl = seen.get(id).copied().unwrap_or(0);

                let kws = [
                    "sales", "crm", "erp", "procurement", "vendor", "supplier",
                    "purchase order", "b2b", "enterprise", "accounts payable",
                    "accounts receivable", "billing", "payment", "contract",
                    "invoice", "receipt", "compliance", "audit",
                ];
                let mentions: Vec<&str> = kws.iter().filter(|&&kw| lower.contains(kw)).copied().collect();

                // Check what org published it
                let has_real_docs = bp < 0.3 && lines > 20;

                eprintln!(
                    "  {dl:>8} dl  {id:<50} lines={lines:<4} bp={bp:.2} docs={:<5} cook={:<12} kw={mentions:?}",
                    if has_real_docs { "yes" } else { "no" },
                    cookbook.as_deref().unwrap_or("-"),
                );
            }
        }
    }

    eprintln!("\nTotal unique models scanned: {}", seen.len());

    Ok(())
}

fn fmt(n: u64) -> String {
    if n >= 1_000_000 { format!("{:.1}M", n as f64 / 1e6) }
    else if n >= 1_000 { format!("{:.1}K", n as f64 / 1e3) }
    else { format!("{n}") }
}

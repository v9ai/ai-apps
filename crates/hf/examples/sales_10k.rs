//! Search HF for sales-adjacent models — report all with 1k+ downloads,
//! highlight any with 10k+.

use hf::{HfClient, OrgScanner, SalesCategory};
use std::collections::HashMap;

const QUERIES: &[&str] = &[
    // Core sales
    "sales email",
    "sales conversation",
    "sales forecasting",
    "sales prediction",
    "sales classification",
    // Revenue / pipeline
    "revenue prediction",
    "revenue forecasting",
    "revenue intelligence",
    "pipeline forecasting",
    // Lead gen / scoring
    "lead scoring",
    "lead generation",
    "lead classification",
    "lead qualification",
    // Intent / enrichment
    "B2B intent",
    "buyer intent",
    "contact enrichment",
    "company enrichment",
    "company classification",
    "technographic",
    "firmographic",
    // CRM / deals
    "CRM",
    "deal scoring",
    "account scoring",
    "churn prediction",
    "customer scoring",
    "customer lifetime value",
    // Outreach
    "prospecting",
    "outreach",
    "cold email",
    "email personalization",
    // Conversation intelligence
    "conversation intelligence",
    "call coaching",
    "sentiment analysis sales",
    // Broader — established adjacent categories
    "demand forecasting",
    "price prediction",
    "customer segmentation",
    "customer churn",
    "product recommendation",
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    let mut seen: HashMap<String, u64> = HashMap::new();
    let mut hits_1k = Vec::new();

    eprintln!("Searching {} queries...\n", QUERIES.len());

    for query in QUERIES {
        let results = client.search_models(query, 100).await.unwrap_or_default();
        for m in results {
            let repo_id = m.repo_id.clone().unwrap_or_default();
            let dl = m.downloads.unwrap_or(0);
            if dl >= 1_000 && !seen.contains_key(&repo_id) {
                seen.insert(repo_id.clone(), dl);

                let tags = m.tags.clone().unwrap_or_default();
                let sales_signals = OrgScanner::detect_sales_signals(&repo_id, "", &tags);

                // Skip Salesforce general research models
                let author = m.author.as_deref().unwrap_or("");
                let is_sf_general = author == "Salesforce"
                    && (sales_signals.is_empty()
                        || sales_signals
                            .iter()
                            .all(|s| s.category == SalesCategory::General));
                if is_sf_general {
                    continue;
                }

                hits_1k.push((dl, repo_id, query.to_string(), m, sales_signals));
            }
        }
    }

    // Sort by downloads descending
    hits_1k.sort_by(|a, b| b.0.cmp(&a.0));

    let count_10k = hits_1k.iter().filter(|(dl, ..)| *dl >= 10_000).count();
    let count_1k = hits_1k.len();

    eprintln!("\n{}", "=".repeat(130));
    eprintln!(
        "  SALES-ADJACENT MODELS: {} with 10k+ dl, {} with 1k+ dl (excl. Salesforce Research)",
        count_10k, count_1k
    );
    eprintln!("{}", "=".repeat(130));

    for (dl, repo_id, query, m, signals) in &hits_1k {
        let lib = m.library.as_deref().unwrap_or("-");
        let tag = m.pipeline_tag.as_deref().unwrap_or("-");
        let author = m.author.as_deref().unwrap_or("-");
        let created = m.created_at.as_deref().map(|d| &d[..10]).unwrap_or("?");
        let likes = m.likes.unwrap_or(0);
        let cats: String = if signals.is_empty() {
            "-".into()
        } else {
            signals
                .iter()
                .map(|s| format!("{:?}", s.category))
                .collect::<Vec<_>>()
                .join(",")
        };
        let marker = if *dl >= 10_000 { "***" } else { "   " };

        eprintln!(
            "{marker} {dl:>10} dl  {likes:>4} lk  {repo_id:<60} {author:<20} {lib:<18} {tag:<28} {created}  [{cats}]  q=\"{query}\""
        );
    }

    // Fetch model cards for top hits
    if !hits_1k.is_empty() {
        let top_ids: Vec<String> = hits_1k
            .iter()
            .take(30)
            .map(|(_, id, _, _, _)| id.clone())
            .collect();
        eprintln!(
            "\nFetching model cards for top {} hits...",
            top_ids.len()
        );
        let cards = client.fetch_model_cards(&top_ids).await.unwrap_or_default();

        eprintln!("\n  MODEL CARD ANALYSIS:");
        for (_, repo_id, _, _, _) in hits_1k.iter().take(30) {
            if let Some(card) = cards.get(repo_id.as_str()) {
                let lower = card.to_lowercase();
                let kws = [
                    "sales", "lead", "revenue", "crm", "outreach", "prospect",
                    "pipeline", "deal", "quota", "churn", "retention", "forecast",
                    "customer lifetime", "recommendation", "segmentation",
                ];
                let mentions: Vec<&str> = kws
                    .iter()
                    .filter(|&&kw| lower.contains(kw))
                    .copied()
                    .collect();

                let boilerplate = OrgScanner::detect_boilerplate(card);
                let lines = card.lines().count();
                let cookbook = OrgScanner::detect_cookbook_recipe(card, &[]);
                let generic_ds = OrgScanner::detect_generic_dataset(card, None, repo_id);

                eprintln!(
                    "  {repo_id:<55} lines={lines:<4} bp={boilerplate:.2}  cookbook={:<15} ds={:<15} kw={mentions:?}",
                    cookbook.as_deref().unwrap_or("-"),
                    generic_ds.as_deref().unwrap_or("-"),
                );
            }
        }
    }

    eprintln!(
        "\nSummary: {count_10k} models ≥10k dl, {count_1k} models ≥1k dl, across {} queries",
        QUERIES.len()
    );

    Ok(())
}

//! Search HF for sales-adjacent models with 10k+ downloads.
//! Fetches model cards for hits to verify genuine sales relevance.

use hf::{HfClient, OrgScanner};
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
    // Broader — catch sales-adjacent at scale
    "sales",
    "demand forecasting",
    "price prediction",
    "customer segmentation",
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    let mut seen: HashMap<String, u64> = HashMap::new();
    let mut all_hits = Vec::new();

    eprintln!("Searching {} queries...\n", QUERIES.len());

    for query in QUERIES {
        let results = client.search_models(query, 100).await.unwrap_or_default();
        let mut query_10k = 0;
        for m in results {
            let repo_id = m.repo_id.clone().unwrap_or_default();
            let dl = m.downloads.unwrap_or(0);
            if dl >= 10_000 && !seen.contains_key(&repo_id) {
                seen.insert(repo_id.clone(), dl);

                let tags = m.tags.clone().unwrap_or_default();
                let sales_signals = OrgScanner::detect_sales_signals(&repo_id, "", &tags);

                // Skip Salesforce general research models — brand match, not sales-specific
                let author = m.author.as_deref().unwrap_or("");
                if author == "Salesforce" && sales_signals.iter().all(|s| s.category == hf::SalesCategory::General) {
                    continue;
                }

                query_10k += 1;
                all_hits.push((dl, repo_id.clone(), query.to_string(), m, sales_signals));
            }
        }
        if query_10k > 0 {
            eprintln!("  \"{query}\" → {query_10k} models with 10k+ dl");
        }
    }

    // Sort by downloads descending
    all_hits.sort_by(|a, b| b.0.cmp(&a.0));

    eprintln!("\n{}", "=".repeat(120));
    eprintln!("  GENUINE SALES-ADJACENT MODELS WITH 10K+ DOWNLOADS");
    eprintln!("{}", "=".repeat(120));

    if all_hits.is_empty() {
        eprintln!("\n  *** NONE FOUND ***");
        eprintln!("  No model with 10k+ downloads is genuinely sales-specific.");
        eprintln!("  Sales AI lives behind proprietary APIs (Gong, Clari, Outreach, etc.),");
        eprintln!("  not on HuggingFace.\n");
    } else {
        for (dl, repo_id, query, m, signals) in &all_hits {
            let lib = m.library.as_deref().unwrap_or("-");
            let tag = m.pipeline_tag.as_deref().unwrap_or("-");
            let author = m.author.as_deref().unwrap_or("-");
            let created = m.created_at.as_deref().map(|d| &d[..10]).unwrap_or("?");
            let likes = m.likes.unwrap_or(0);
            let cats: Vec<String> = signals.iter().map(|s| format!("{:?}", s.category)).collect();

            eprintln!(
                "  {dl:>12} dl  {likes:>5} likes  {repo_id:<55} author={author:<20} lib={lib:<15} tag={tag:<25} {created}  [{cats}]  q=\"{query}\""
                , cats = cats.join(",")
            );
        }
    }

    // Fetch model cards for top hits for deeper analysis
    if !all_hits.is_empty() {
        let top_ids: Vec<String> = all_hits.iter().take(20).map(|(_, id, _, _, _)| id.clone()).collect();
        eprintln!("\nFetching model cards for top {} hits...", top_ids.len());
        let cards = client.fetch_model_cards(&top_ids).await.unwrap_or_default();

        for (_, repo_id, _, _, _) in all_hits.iter().take(20) {
            if let Some(card) = cards.get(repo_id.as_str()) {
                let lower = card.to_lowercase();
                let sales_mentions: Vec<&str> = ["sales", "lead", "revenue", "crm", "outreach", "prospect", "pipeline", "deal", "quota"]
                    .iter()
                    .filter(|&&kw| lower.contains(kw))
                    .copied()
                    .collect();

                let boilerplate = OrgScanner::detect_boilerplate(card);
                let lines = card.lines().count();

                if !sales_mentions.is_empty() {
                    eprintln!("  {repo_id}: card={lines} lines, boilerplate={boilerplate:.2}, mentions: {sales_mentions:?}");
                }
            }
        }
    }

    eprintln!("\nTotal: {} models with 10k+ downloads across {} queries (excluding Salesforce Research)", all_hits.len(), QUERIES.len());

    Ok(())
}

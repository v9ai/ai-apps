//! Search HF for sales-adjacent models — debug output to understand landscape.

use hf::{HfClient, OrgScanner};
use std::collections::HashMap;

const QUERIES: &[&str] = &[
    "sales",
    "churn prediction",
    "churn",
    "customer segmentation",
    "demand forecasting",
    "lead scoring",
    "revenue prediction",
    "sales forecasting",
    "B2B intent",
    "sales email",
    "outreach",
    "CRM",
    "customer lifetime value",
    "sentiment",
    "recommendation",
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    let mut seen: HashMap<String, u64> = HashMap::new();
    let mut all_hits = Vec::new();

    for query in QUERIES {
        let results = client.search_models(query, 100).await.unwrap_or_default();
        let total = results.len();
        let over_1k: Vec<_> = results.iter().filter(|m| m.downloads.unwrap_or(0) >= 1_000).collect();
        let over_10k: Vec<_> = results.iter().filter(|m| m.downloads.unwrap_or(0) >= 10_000).collect();
        let max_dl = results.iter().map(|m| m.downloads.unwrap_or(0)).max().unwrap_or(0);

        eprintln!(
            "  \"{query:<30}\" → {total:>3} results, {over10k:>3} ≥10k, {over1k:>3} ≥1k, max_dl={max_dl}",
            over10k = over_10k.len(),
            over1k = over_1k.len(),
        );

        // Show top 5 for each query
        for m in results.iter().take(5) {
            let repo_id = m.repo_id.as_deref().unwrap_or("?");
            let dl = m.downloads.unwrap_or(0);
            let author = m.author.as_deref().unwrap_or("-");
            let tag = m.pipeline_tag.as_deref().unwrap_or("-");

            if !seen.contains_key(repo_id) {
                seen.insert(repo_id.to_owned(), dl);

                let tags = m.tags.clone().unwrap_or_default();
                let sales = OrgScanner::detect_sales_signals(repo_id, "", &tags);
                let is_salesforce = author == "Salesforce";
                let cats: String = if sales.is_empty() { "-".into() } else {
                    sales.iter().map(|s| format!("{:?}", s.category)).collect::<Vec<_>>().join(",")
                };

                eprintln!(
                    "      {dl:>10} dl  {repo_id:<55} {author:<20} {tag:<25} sf={is_salesforce}  [{cats}]"
                );

                if dl >= 1_000 && !is_salesforce {
                    all_hits.push((dl, repo_id.to_owned(), query.to_string()));
                }
            }
        }
        eprintln!();
    }

    all_hits.sort_by(|a, b| b.0.cmp(&a.0));

    eprintln!("{}", "=".repeat(100));
    eprintln!("  NON-SALESFORCE MODELS ≥1K DOWNLOADS:");
    eprintln!("{}", "=".repeat(100));
    if all_hits.is_empty() {
        eprintln!("  NONE");
    } else {
        for (dl, repo_id, query) in &all_hits {
            eprintln!("  {dl:>10} dl  {repo_id:<55}  q=\"{query}\"");
        }
    }
    eprintln!("\nTotal non-SF ≥1k: {}", all_hits.len());

    Ok(())
}

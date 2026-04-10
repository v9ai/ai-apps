//! Find organizations on HF Hub similar to a given org.
//!
//! Usage: cargo run --example similar_orgs [ORG_NAME]
//! Default: TechWolf

use hf::{HfClient, OrgScanner, SimilarOrgOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let target_org = std::env::args().nth(1).unwrap_or_else(|| "TechWolf".into());

    let client = HfClient::from_env(8)?;
    let scanner = OrgScanner::new(&client);

    eprintln!("Scanning {target_org}...");
    let profile = scanner.scan_org(&target_org).await?;
    let fingerprint = OrgScanner::fingerprint(&profile);

    eprintln!("Fingerprint for {target_org}:");
    eprintln!("  models:        {}", profile.models.len());
    eprintln!("  datasets:      {}", profile.datasets.len());
    eprintln!("  spaces:        {}", profile.spaces.len());
    eprintln!("  pipeline_tags: {:?}", fingerprint.pipeline_tags);
    eprintln!("  libraries:     {:?}", fingerprint.libraries);
    eprintln!("  domain_tags:   {} tags", fingerprint.domain_tags.len());
    eprintln!("  dataset_kws:   {:?}", fingerprint.dataset_keywords);

    let opts = SimilarOrgOptions {
        per_query_limit: 200,
        max_results: 30,
        min_score: 0.03,
        min_downloads: 50,
        ..Default::default()
    };

    eprintln!("\nSearching for similar orgs...\n");
    let similar = scanner.find_similar_orgs(&profile, &opts).await?;

    eprintln!(
        "{:=<120}",
        format!("  ORGANIZATIONS SIMILAR TO {target_org}  ({} found) ", similar.len())
    );
    eprintln!(
        "  {:<4} {:<30} {:>6} {:>5} {:>5} {:>10} {:>6}  {}",
        "#", "ORG", "SCORE", "MDLS", "DS", "DOWNLOADS", "QHITS", "SHARED PIPELINE TAGS"
    );
    eprintln!("  {}", "-".repeat(115));

    for (i, org) in similar.iter().enumerate() {
        eprintln!(
            "  {:<4} {:<30} {:>5.3} {:>5} {:>5} {:>10} {:>6}  {}",
            i + 1,
            org.org_name,
            org.similarity_score,
            org.model_count,
            org.dataset_count,
            format_dl(org.total_downloads),
            org.query_hits,
            org.shared_pipeline_tags.join(", "),
        );
    }

    // Detailed view of top 10
    eprintln!("\n{}", "=".repeat(120));
    eprintln!("  DETAILED VIEW — TOP 10");
    eprintln!("{}", "=".repeat(120));

    for org in similar.iter().take(10) {
        eprintln!(
            "\n  {} (score={:.3}, dl={}, likes={})",
            org.org_name,
            org.similarity_score,
            format_dl(org.total_downloads),
            org.total_likes
        );
        eprintln!("    shared pipelines: {:?}", org.shared_pipeline_tags);
        eprintln!("    shared libraries: {:?}", org.shared_libraries);
        eprintln!(
            "    shared tags:      {} ({})",
            org.shared_domain_tags.len(),
            org.shared_domain_tags.iter().take(8).cloned().collect::<Vec<_>>().join(", ")
        );
        for repo in org.repos.iter().take(5) {
            let repo_id = repo.repo_id.as_deref().unwrap_or("?");
            let dl = repo.downloads.unwrap_or(0);
            let tag = repo.pipeline_tag.as_deref().unwrap_or("-");
            eprintln!("      {:>8} dl  {:<50}  {}", format_dl(dl), repo_id, tag);
        }
        if org.repos.len() > 5 {
            eprintln!("      ... and {} more repos", org.repos.len() - 5);
        }
    }

    // JSON output to stdout for downstream consumption
    let output = serde_json::json!({
        "target_org": target_org,
        "fingerprint": {
            "pipeline_tags": fingerprint.pipeline_tags,
            "libraries": fingerprint.libraries,
            "domain_tags": fingerprint.domain_tags,
            "dataset_keywords": fingerprint.dataset_keywords,
        },
        "similar_orgs": similar.iter().map(|o| serde_json::json!({
            "org_name": o.org_name,
            "similarity_score": (o.similarity_score * 1000.0).round() / 1000.0,
            "model_count": o.model_count,
            "dataset_count": o.dataset_count,
            "total_downloads": o.total_downloads,
            "total_likes": o.total_likes,
            "shared_pipeline_tags": o.shared_pipeline_tags,
            "shared_libraries": o.shared_libraries,
            "shared_domain_tags": o.shared_domain_tags,
            "query_hits": o.query_hits,
        })).collect::<Vec<_>>(),
    });
    println!("{}", serde_json::to_string_pretty(&output)?);

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

use hf::{HfClient, OrgScanner};
use serde_json::json;
use std::path::Path;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let scanner = OrgScanner::new(&client);

    let orgs = ["AssemblyAI", "sumble"];

    let mut all_profiles = Vec::new();

    for org in orgs {
        eprintln!("\n{}", "=".repeat(70));
        eprintln!("  SCANNING: {org}");
        eprintln!("{}", "=".repeat(70));

        let profile = scanner.scan_org(org).await?;
        let score = OrgScanner::compute_hf_score(&profile);

        eprintln!("  Models:    {}", profile.models.len());
        eprintln!("  Datasets:  {}", profile.datasets.len());
        eprintln!("  Spaces:    {}", profile.spaces.len());
        eprintln!("  Downloads: {}", profile.total_downloads);
        eprintln!("  HF Score:  {score:.3}");

        // Fetch model cards (READMEs) for all models
        let model_ids: Vec<String> = profile
            .models
            .iter()
            .filter_map(|m| m.repo_id.clone())
            .collect();

        let cards = if !model_ids.is_empty() {
            eprintln!("  Fetching {} model cards...", model_ids.len());
            client
                .fetch_model_cards(&model_ids)
                .await
                .unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };

        // Build models JSON with card text included
        let models_json: Vec<serde_json::Value> = profile
            .models
            .iter()
            .map(|m| {
                let repo_id = m.repo_id.as_deref().unwrap_or("?");
                let card_text = cards.get(repo_id).cloned();
                json!({
                    "repo_id": m.repo_id,
                    "model_id": m.model_id,
                    "author": m.author,
                    "sha": m.sha,
                    "last_modified": m.last_modified,
                    "created_at": m.created_at,
                    "tags": m.tags,
                    "downloads": m.downloads,
                    "likes": m.likes,
                    "library": m.library,
                    "pipeline_tag": m.pipeline_tag,
                    "private": m.private,
                    "gated": m.gated,
                    "disabled": m.disabled,
                    "description": m.description,
                    "sdk": m.sdk,
                    "siblings": m.siblings.as_ref().map(|s| s.iter().map(|f| {
                        json!({ "filename": f.filename, "size": f.size })
                    }).collect::<Vec<_>>()),
                    "card_data": m.card_data,
                    "card_text": card_text,
                    "extra": m.extra,
                })
            })
            .collect();

        let datasets_json: Vec<serde_json::Value> = profile
            .datasets
            .iter()
            .map(|d| {
                json!({
                    "repo_id": d.repo_id,
                    "author": d.author,
                    "sha": d.sha,
                    "last_modified": d.last_modified,
                    "created_at": d.created_at,
                    "tags": d.tags,
                    "downloads": d.downloads,
                    "likes": d.likes,
                    "description": d.description,
                    "siblings": d.siblings.as_ref().map(|s| s.iter().map(|f| {
                        json!({ "filename": f.filename, "size": f.size })
                    }).collect::<Vec<_>>()),
                    "card_data": d.card_data,
                    "extra": d.extra,
                })
            })
            .collect();

        let spaces_json: Vec<serde_json::Value> = profile
            .spaces
            .iter()
            .map(|s| {
                json!({
                    "repo_id": s.repo_id,
                    "author": s.author,
                    "sha": s.sha,
                    "last_modified": s.last_modified,
                    "created_at": s.created_at,
                    "tags": s.tags,
                    "downloads": s.downloads,
                    "likes": s.likes,
                    "description": s.description,
                    "sdk": s.sdk,
                    "siblings": s.siblings.as_ref().map(|si| si.iter().map(|f| {
                        json!({ "filename": f.filename, "size": f.size })
                    }).collect::<Vec<_>>()),
                    "card_data": s.card_data,
                    "extra": s.extra,
                })
            })
            .collect();

        let training_signals_json: Vec<serde_json::Value> = profile
            .training_signals
            .iter()
            .map(|s| {
                json!({
                    "repo_id": s.repo_id,
                    "signal_type": format!("{:?}", s.signal_type),
                    "evidence": s.evidence,
                })
            })
            .collect();

        // Compute total likes
        let total_likes: u64 = profile
            .models
            .iter()
            .chain(profile.datasets.iter())
            .chain(profile.spaces.iter())
            .filter_map(|r| r.likes)
            .sum();

        let profile_json = json!({
            "org_name": profile.org_name,
            "hf_score": (score * 1000.0).round() / 1000.0,
            "total_downloads": profile.total_downloads,
            "total_likes": total_likes,
            "model_count": profile.models.len(),
            "dataset_count": profile.datasets.len(),
            "space_count": profile.spaces.len(),
            "libraries_used": profile.libraries_used,
            "pipeline_tags": profile.pipeline_tags,
            "arxiv_links": profile.arxiv_links,
            "training_signals": training_signals_json,
            "models": models_json,
            "datasets": datasets_json,
            "spaces": spaces_json,
        });

        all_profiles.push(profile_json);
    }

    let output = serde_json::to_string_pretty(&all_profiles)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("hf-profiles.json");
    std::fs::write(&out_path, &output)?;
    eprintln!("\nSaved to {}", out_path.display());

    println!("{output}");

    Ok(())
}

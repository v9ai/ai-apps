use hf::{HfClient, OrgScanner};
use serde_json::json;
use std::path::Path;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let scanner = OrgScanner::new(&client);

    // All companies from ai-features.json that have features + key domain variants
    // Plus potential HF orgs for all 63 companies
    let orgs = [
        // 9 companies with features (known)
        "assemblyai",
        "sumble",
        "gong-io", "gong",
        "landbase",
        "aviso", "aviso-ai",
        "sierra-ai", "sierraai",
        "alembic", "alembic-ai",
        "cresta", "cresta-ai",
        "zapier",
        // Other companies from the list — try common HF org patterns
        "clari",
        "bland-ai", "blandai",
        "amplemarket",
        "ocean-io", "ocean-ai",
        "clay-com", "clay-ai", "clay-hq",
        "revenue-io",
        "qualified",
        "outreach", "outreach-io",
        "nooks-ai", "nooksai",
        "apollo-io", "apolloio",
        "salesloft",
        "smartlead",
        "artisan-ai", "artisanai",
        "11x-ai",
        "usergems",
        "sybill-ai", "sybill",
        "lindy-ai", "lindyai",
        "decagon-ai", "decagon",
        "warmly-ai",
        // B2B sales AI companies NOT in list — discovered via research
        "chorus-ai", "chorusai",     // conversation intelligence (acquired by ZoomInfo)
        "people-ai", "peopleai",     // revenue intelligence
        "clari-ai",
        "6sense",                     // predictive analytics
        "bombora",                    // intent data
        "zoominfo",                   // data enrichment
        "clearbit",                   // data enrichment
        "lusha",                      // contact data
        "cognism",                    // sales intelligence
        "apollo",                     // sales engagement
        "outplay",                    // sales engagement
        "regie-ai", "regieai",       // AI content for sales
        "copy-ai", "copyai",         // AI content
        "lavender-ai", "lavenderai", // email AI
        "drift",                      // conversational marketing
        "intercom",                   // customer messaging
        "conversica",                 // AI sales assistant
        "exceed-ai", "exceedai",     // AI sales assistant
        "orum",                       // AI dialer
        "salience", "salience-ai",   // NLP
    ];

    let mut all_profiles = Vec::new();
    let mut found_orgs = Vec::new();

    for org in orgs {
        let profile = scanner.scan_org(org).await?;
        let score = OrgScanner::compute_hf_score(&profile);
        let total = profile.models.len() + profile.datasets.len() + profile.spaces.len();

        if total == 0 {
            continue; // Skip empty orgs
        }

        eprintln!(
            "{org:>25}  models={:<3} datasets={:<3} spaces={:<3} dl={:<10} score={:.3}  signals={}",
            profile.models.len(),
            profile.datasets.len(),
            profile.spaces.len(),
            profile.total_downloads,
            score,
            profile.training_signals.len(),
        );

        found_orgs.push(org.to_string());

        // Fetch model cards
        let model_ids: Vec<String> = profile
            .models
            .iter()
            .filter_map(|m| m.repo_id.clone())
            .collect();

        let cards = if !model_ids.is_empty() {
            client
                .fetch_model_cards(&model_ids)
                .await
                .unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };

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

    // Also search HF for sales/lead-gen related models
    eprintln!("\n{}", "=".repeat(70));
    eprintln!("  SEARCHING HF for sales/lead-gen ML models...");
    eprintln!("{}", "=".repeat(70));

    let searches = [
        "sales lead scoring",
        "sales conversation",
        "revenue prediction",
        "B2B intent",
        "contact enrichment",
        "sales email",
        "lead generation NER",
        "technographic",
        "company classification",
        "sales forecasting",
    ];

    let mut search_results = Vec::new();
    for query in searches {
        let results = client.search_models(query, 10).await.unwrap_or_default();
        if !results.is_empty() {
            eprintln!("  '{query}': {} results", results.len());
            for m in &results {
                let repo_id = m.repo_id.as_deref().unwrap_or("?");
                let dl = m.downloads.unwrap_or(0);
                let likes = m.likes.unwrap_or(0);
                let lib = m.library.as_deref().unwrap_or("-");
                let tag = m.pipeline_tag.as_deref().unwrap_or("-");
                search_results.push(json!({
                    "query": query,
                    "repo_id": repo_id,
                    "downloads": dl,
                    "likes": likes,
                    "library": lib,
                    "pipeline_tag": tag,
                    "tags": m.tags,
                    "created_at": m.created_at,
                    "author": m.author,
                }));
            }
        }
    }

    let output = json!({
        "org_profiles": all_profiles,
        "found_orgs": found_orgs,
        "search_results": search_results,
    });

    let output_str = serde_json::to_string_pretty(&output)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("hf-profiles.json");
    std::fs::write(&out_path, &output_str)?;
    eprintln!("\nSaved to {}", out_path.display());
    eprintln!("Found {} orgs with HF presence", found_orgs.len());
    eprintln!("Search results: {} models across {} queries", search_results.len(), searches.len());

    Ok(())
}

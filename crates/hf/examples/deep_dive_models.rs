use hf::{HfClient, OrgScanner};
use serde_json::json;
use std::path::Path;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let scanner = OrgScanner::new(&client);

    let orgs = [
        "diffbot",
        "sumble",
        "assemblyai",
        "salesloft",
        "chorus",
        "uniphore",
        "deepgram",
        "dialpad",
    ];

    let mut all_profiles = Vec::new();

    for org in orgs {
        eprintln!("\n--- Scanning {org} (deep) ---");

        let profile = scanner.scan_org_deep(org).await?;
        let score = OrgScanner::compute_hf_score(&profile);

        let total = profile.models.len() + profile.datasets.len() + profile.spaces.len();
        if total == 0 {
            eprintln!("  (no HF presence, skipping)");
            continue;
        }

        eprintln!(
            "  models={} datasets={} spaces={} dl={} signals={} configs={} score={:.3}",
            profile.models.len(),
            profile.datasets.len(),
            profile.spaces.len(),
            profile.total_downloads,
            profile.training_signals.len(),
            profile.model_configs.len(),
            score,
        );

        // Print architecture analysis from config.json
        for (repo_id, config) in &profile.model_configs {
            let model_type = config.get("model_type").and_then(|v| v.as_str()).unwrap_or("?");
            let hidden = config.get("hidden_size").and_then(|v| v.as_u64());
            let layers = config.get("num_hidden_layers").and_then(|v| v.as_u64());
            let experts = config
                .get("num_experts")
                .or(config.get("num_local_experts"))
                .and_then(|v| v.as_u64());
            let ctx = config.get("max_position_embeddings").and_then(|v| v.as_u64());
            let labels = config.get("id2label").and_then(|v| v.as_object());

            eprint!("    {repo_id}: {model_type}");
            if let Some(h) = hidden {
                eprint!(" h={h}");
            }
            if let Some(l) = layers {
                eprint!(" L={l}");
            }
            if let Some(e) = experts {
                eprint!(" E={e}");
            }
            if let Some(c) = ctx {
                eprint!(" ctx={c}");
            }
            if let Some(lbls) = labels {
                let names: Vec<&str> = lbls.values().filter_map(|v| v.as_str()).collect();
                eprint!(" labels={names:?}");
            }
            eprintln!();
        }

        // Print training signals
        for sig in &profile.training_signals {
            eprintln!("    signal: {:?} — {}", sig.signal_type, sig.evidence);
        }

        // Build JSON for output
        let arch_analysis: Vec<serde_json::Value> = profile
            .model_configs
            .iter()
            .map(|(repo_id, config)| {
                json!({
                    "repo_id": repo_id,
                    "model_type": config.get("model_type"),
                    "hidden_size": config.get("hidden_size"),
                    "num_hidden_layers": config.get("num_hidden_layers"),
                    "num_attention_heads": config.get("num_attention_heads"),
                    "num_key_value_heads": config.get("num_key_value_heads"),
                    "num_experts": config.get("num_experts").or(config.get("num_local_experts")),
                    "num_activated_experts": config.get("num_activated_experts").or(config.get("num_experts_per_tok")),
                    "max_position_embeddings": config.get("max_position_embeddings"),
                    "vocab_size": config.get("vocab_size"),
                    "id2label": config.get("id2label"),
                    "architectures": config.get("architectures"),
                })
            })
            .collect();

        let signals_json: Vec<serde_json::Value> = profile
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

        all_profiles.push(json!({
            "org_name": profile.org_name,
            "hf_score": (score * 1000.0).round() / 1000.0,
            "total_downloads": profile.total_downloads,
            "total_likes": total_likes,
            "model_count": profile.models.len(),
            "dataset_count": profile.datasets.len(),
            "space_count": profile.spaces.len(),
            "config_count": profile.model_configs.len(),
            "signal_count": profile.training_signals.len(),
            "architecture_analysis": arch_analysis,
            "training_signals": signals_json,
            "libraries_used": profile.libraries_used,
            "pipeline_tags": profile.pipeline_tags,
            "arxiv_links": profile.arxiv_links,
        }));
    }

    let output = json!({ "org_profiles": all_profiles });
    let output_str = serde_json::to_string_pretty(&output)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("hf-profiles-deep.json");
    std::fs::write(&out_path, &output_str)?;
    eprintln!("\nSaved to {}", out_path.display());
    eprintln!("Profiles: {}", all_profiles.len());

    Ok(())
}

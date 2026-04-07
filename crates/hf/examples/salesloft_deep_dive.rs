//! Deep dive on SalesLoft's HuggingFace presence.
//! SalesLoft is a sales engagement platform — their HF model (llama3-8b-instruct-ultrafeedback-kto)
//! is a KTO-aligned Llama-3 fine-tune, directly relevant to B2B sales AI.
//! Fetches all configs, training details, model cards, and dataset info.

use hf::{FetchRequest, FetchResult, HfClient, OrgScanner, RepoType};
use serde_json::json;
use std::collections::{BTreeMap, HashMap};
use std::path::Path;

/// Files to fetch from every model repo.
const COMMON_FILES: &[&str] = &[
    "config.json",
    "tokenizer_config.json",
    "generation_config.json",
    "special_tokens_map.json",
    "model.safetensors.index.json",
    // KTO / alignment-specific files
    "adapter_config.json",
    "training_args.bin",
    "trainer_state.json",
    "all_results.json",
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;
    let scanner = OrgScanner::new(&client);

    // ── 1. List ALL SalesLoft repos (models, datasets, spaces) ────
    eprintln!("=== Phase 1: Listing all SalesLoft repos ===");
    let models = client
        .list_by_author("salesloft", RepoType::Model, 500)
        .await?;
    let datasets = client
        .list_by_author("salesloft", RepoType::Dataset, 500)
        .await?;
    let spaces = client
        .list_by_author("salesloft", RepoType::Space, 500)
        .await?;
    eprintln!(
        "Found {} models, {} datasets, {} spaces",
        models.len(),
        datasets.len(),
        spaces.len()
    );

    for m in &models {
        let id = m.repo_id.as_deref().unwrap_or("?");
        let dl = m.downloads.unwrap_or(0);
        let likes = m.likes.unwrap_or(0);
        let lib = m.library.as_deref().unwrap_or("-");
        let tag = m.pipeline_tag.as_deref().unwrap_or("-");
        let created = m.created_at.as_deref().unwrap_or("?");
        eprintln!("  MODEL  {id:<60} dl={dl:<6} likes={likes:<4} lib={lib:<15} tag={tag:<20} created={created}");
    }
    for d in &datasets {
        let id = d.repo_id.as_deref().unwrap_or("?");
        let dl = d.downloads.unwrap_or(0);
        let created = d.created_at.as_deref().unwrap_or("?");
        eprintln!("  DATASET {id:<59} dl={dl:<6} created={created}");
    }
    for s in &spaces {
        let id = s.repo_id.as_deref().unwrap_or("?");
        let likes = s.likes.unwrap_or(0);
        let created = s.created_at.as_deref().unwrap_or("?");
        eprintln!("  SPACE  {id:<60} likes={likes:<4} created={created}");
    }

    let model_ids: Vec<String> = models.iter().filter_map(|m| m.repo_id.clone()).collect();
    let dataset_ids: Vec<String> = datasets.iter().filter_map(|d| d.repo_id.clone()).collect();

    // ── 2. Fetch file listings for all models ─────────────────────
    eprintln!("\n=== Phase 2: File listings ===");
    let file_requests: Vec<FetchRequest> =
        model_ids.iter().map(|id| FetchRequest::model(id)).collect();
    let file_listings = client.list_repo_files(&file_requests).await;

    let mut repo_files: HashMap<String, Vec<String>> = HashMap::new();
    for result in &file_listings {
        match result {
            FetchResult::Ok { repo_id, data } => {
                let filenames: Vec<String> = data.iter().map(|f| f.filename.clone()).collect();
                eprintln!("  {repo_id}: {} files", filenames.len());
                for f in &filenames {
                    eprintln!("    {f}");
                }
                repo_files.insert(repo_id.clone(), filenames);
            }
            FetchResult::Err { repo_id, error } => {
                eprintln!("  {repo_id}: ERROR {error}");
            }
        }
    }

    // Also list dataset files
    let dataset_requests: Vec<FetchRequest> = dataset_ids
        .iter()
        .map(|id| FetchRequest::dataset(id))
        .collect();
    if !dataset_requests.is_empty() {
        let ds_listings = client.list_repo_files(&dataset_requests).await;
        for result in &ds_listings {
            match result {
                FetchResult::Ok { repo_id, data } => {
                    let filenames: Vec<String> = data.iter().map(|f| f.filename.clone()).collect();
                    eprintln!("  {repo_id}: {} files", filenames.len());
                    for f in &filenames {
                        eprintln!("    {f}");
                    }
                    repo_files.insert(repo_id.clone(), filenames);
                }
                FetchResult::Err { repo_id, error } => {
                    eprintln!("  {repo_id}: ERROR {error}");
                }
            }
        }
    }

    // ── 3. Fetch config files per-type ────────────────────────────
    eprintln!("\n=== Phase 3: Fetching config files ===");
    let mut repo_data: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut fetch_ok = 0usize;
    let mut fetch_err = 0usize;

    let mut batches: Vec<(&str, Vec<FetchRequest>)> = Vec::new();

    for &filename in COMMON_FILES {
        let reqs: Vec<FetchRequest> = model_ids
            .iter()
            .filter(|id| {
                repo_files
                    .get(*id)
                    .map(|fs| fs.iter().any(|f| f == filename))
                    .unwrap_or(false)
            })
            .map(|id| FetchRequest::model(id).with_path(filename))
            .collect();
        if !reqs.is_empty() {
            batches.push((filename, reqs));
        }
    }

    // Also fetch README.md from datasets (for training data documentation)
    for ds_id in &dataset_ids {
        if repo_files
            .get(ds_id)
            .map(|fs| fs.iter().any(|f| f == "README.md"))
            .unwrap_or(false)
        {
            batches.push((
                "README.md",
                vec![FetchRequest::dataset(ds_id).with_path("README.md")],
            ));
        }
    }

    let total_files: usize = batches.iter().map(|(_, r)| r.len()).sum();
    eprintln!(
        "Fetching {total_files} files across {} repos...",
        model_ids.len() + dataset_ids.len()
    );

    for (filename, reqs) in &batches {
        let results = client.fetch_raw_files(reqs).await;
        for result in results {
            match result {
                FetchResult::Ok { repo_id, data } => {
                    fetch_ok += 1;
                    repo_data
                        .entry(repo_id)
                        .or_default()
                        .insert(filename.to_string(), data);
                }
                FetchResult::Err { repo_id, error } => {
                    fetch_err += 1;
                    eprintln!("  FAIL {repo_id}/{filename}: {error}");
                }
            }
        }
    }
    eprintln!("Fetched: {fetch_ok} ok, {fetch_err} failed");

    // ── 4. Fetch model cards ──────────────────────────────────────
    eprintln!("\n=== Phase 4: Model cards ===");
    let cards = client
        .fetch_model_cards(&model_ids)
        .await
        .unwrap_or_default();
    for (repo_id, card) in &cards {
        let lines = card.lines().count();
        let has_yaml = card.starts_with("---");
        eprintln!("  {repo_id}: {lines} lines, yaml_frontmatter={has_yaml}");
    }

    // ── 5. Run scan_org_deep for scoring ──────────────────────────
    eprintln!("\n=== Phase 5: OrgScanner deep scan ===");
    let profile = scanner.scan_org_deep("salesloft").await?;
    let score = OrgScanner::compute_hf_score(&profile);
    eprintln!(
        "  hf_score={score:.3}  signals={}  configs={}",
        profile.training_signals.len(),
        profile.model_configs.len()
    );

    for sig in &profile.training_signals {
        eprintln!(
            "    {:?}: {} — {}",
            sig.signal_type, sig.repo_id, sig.evidence
        );
    }

    // ── 6. Build comprehensive analysis ───────────────────────────
    eprintln!("\n=== Phase 6: Building analysis ===");

    let mut model_analyses = Vec::new();

    let mut sorted_models = models.clone();
    sorted_models.sort_by(|a, b| {
        a.created_at
            .as_deref()
            .unwrap_or("")
            .cmp(&b.created_at.as_deref().unwrap_or(""))
    });

    for m in &sorted_models {
        let repo_id = m.repo_id.as_deref().unwrap_or("?");
        let data = repo_data.get(repo_id);
        let files = repo_files.get(repo_id);

        // Parse config.json
        let config: Option<serde_json::Value> = data
            .and_then(|d| d.get("config.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Parse tokenizer_config.json
        let tokenizer: Option<serde_json::Value> = data
            .and_then(|d| d.get("tokenizer_config.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Parse generation_config.json
        let gen_config: Option<serde_json::Value> = data
            .and_then(|d| d.get("generation_config.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Parse model.safetensors.index.json
        let index: Option<serde_json::Value> = data
            .and_then(|d| d.get("model.safetensors.index.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Parse adapter_config.json (LoRA/QLoRA)
        let adapter_config: Option<serde_json::Value> = data
            .and_then(|d| d.get("adapter_config.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Architecture details
        let arch = config.as_ref().map(|c| {
            let model_type = c.get("model_type").and_then(|v| v.as_str());
            let architectures = c.get("architectures");
            let hidden = c.get("hidden_size").and_then(|v| v.as_u64());
            let layers = c.get("num_hidden_layers").and_then(|v| v.as_u64());
            let heads = c.get("num_attention_heads").and_then(|v| v.as_u64());
            let kv_heads = c.get("num_key_value_heads").and_then(|v| v.as_u64());
            let ctx = c.get("max_position_embeddings").and_then(|v| v.as_u64());
            let vocab = c.get("vocab_size").and_then(|v| v.as_u64());
            let intermediate = c.get("intermediate_size").and_then(|v| v.as_u64());
            let rope_theta = c.get("rope_theta").and_then(|v| v.as_f64());
            let torch_dtype = c.get("torch_dtype").and_then(|v| v.as_str());
            let name_or_path = c.get("_name_or_path").and_then(|v| v.as_str());

            json!({
                "model_type": model_type,
                "architectures": architectures,
                "hidden_size": hidden,
                "num_hidden_layers": layers,
                "num_attention_heads": heads,
                "num_key_value_heads": kv_heads,
                "max_position_embeddings": ctx,
                "vocab_size": vocab,
                "intermediate_size": intermediate,
                "rope_theta": rope_theta,
                "torch_dtype": torch_dtype,
                "_name_or_path": name_or_path,
            })
        });

        // Param count from safetensors index
        let param_info = index.as_ref().map(|idx| {
            let total_size = idx
                .get("metadata")
                .and_then(|m| m.get("total_size"))
                .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())));
            let shard_count = idx
                .get("weight_map")
                .and_then(|w| w.as_object())
                .map(|w| {
                    let mut shards: Vec<&str> = w.values().filter_map(|v| v.as_str()).collect();
                    shards.sort();
                    shards.dedup();
                    shards.len()
                });
            json!({
                "total_size_bytes": total_size,
                "total_size_gb": total_size.map(|s| (s as f64 / 1e9 * 100.0).round() / 100.0),
                "shard_count": shard_count,
            })
        });

        // Adapter/LoRA config (important for understanding fine-tune method)
        let adapter_info = adapter_config.as_ref().map(|a| {
            json!({
                "peft_type": a.get("peft_type"),
                "base_model_name_or_path": a.get("base_model_name_or_path"),
                "r": a.get("r"),
                "lora_alpha": a.get("lora_alpha"),
                "lora_dropout": a.get("lora_dropout"),
                "target_modules": a.get("target_modules"),
                "task_type": a.get("task_type"),
                "bias": a.get("bias"),
                "modules_to_save": a.get("modules_to_save"),
            })
        });

        // Chat template info
        let chat_info = tokenizer.as_ref().map(|t| {
            let has_chat_template = t.get("chat_template").is_some();
            let chat_template_len = t
                .get("chat_template")
                .and_then(|v| v.as_str().map(|s| s.len()));
            let added_tokens = t
                .get("added_tokens_decoder")
                .and_then(|v| v.as_object())
                .map(|o| o.len());
            let bos = t.get("bos_token");
            let eos = t.get("eos_token");
            json!({
                "has_chat_template": has_chat_template,
                "chat_template_length": chat_template_len,
                "added_tokens_count": added_tokens,
                "bos_token": bos,
                "eos_token": eos,
            })
        });

        // Generation config
        let gen_info = gen_config.as_ref().map(|g| {
            json!({
                "temperature": g.get("temperature"),
                "top_k": g.get("top_k"),
                "top_p": g.get("top_p"),
                "max_new_tokens": g.get("max_new_tokens"),
                "max_length": g.get("max_length"),
                "repetition_penalty": g.get("repetition_penalty"),
                "do_sample": g.get("do_sample"),
                "eos_token_id": g.get("eos_token_id"),
            })
        });

        // Model card deep parse — extract KTO/alignment methodology
        let card_analysis = cards.get(repo_id).map(|card| {
            let lines = card.lines().count();

            // Extract YAML frontmatter fields
            let yaml_section = if card.starts_with("---") {
                card.find("\n---\n")
                    .map(|end| &card[4..end])
                    .unwrap_or("")
            } else {
                ""
            };

            // Extract headers for structure analysis
            let headers: Vec<&str> = card
                .lines()
                .filter(|l| l.starts_with('#'))
                .collect();

            // Look for alignment/training methodology keywords
            let content_lower = card.to_lowercase();
            let methodology = json!({
                "mentions_kto": content_lower.contains("kto") || content_lower.contains("kahneman-tversky"),
                "mentions_dpo": content_lower.contains("dpo") || content_lower.contains("direct preference"),
                "mentions_rlhf": content_lower.contains("rlhf") || content_lower.contains("reinforcement learning from human"),
                "mentions_sft": content_lower.contains("sft") || content_lower.contains("supervised fine-tun"),
                "mentions_ultrafeedback": content_lower.contains("ultrafeedback"),
                "mentions_trl": content_lower.contains("trl") || content_lower.contains("transformer reinforcement"),
                "mentions_peft": content_lower.contains("peft") || content_lower.contains("lora"),
                "mentions_qlora": content_lower.contains("qlora"),
                "mentions_sales": content_lower.contains("sales"),
                "mentions_email": content_lower.contains("email"),
                "mentions_outreach": content_lower.contains("outreach"),
                "mentions_customer": content_lower.contains("customer"),
                "mentions_conversation": content_lower.contains("conversation"),
            });

            // Extract code blocks (training scripts, configs)
            let code_blocks: Vec<&str> = card
                .split("```")
                .enumerate()
                .filter(|(i, _)| i % 2 == 1)
                .map(|(_, s)| s.lines().next().unwrap_or(""))
                .collect();

            // Extract URLs/links
            let urls: Vec<&str> = card
                .split(['(', ' ', '\n'])
                .filter(|s| s.starts_with("http"))
                .map(|s| s.trim_end_matches(')'))
                .collect();

            // Content after YAML
            let content_start = if card.starts_with("---") {
                card.find("\n---\n").map(|i| i + 5).unwrap_or(0)
            } else {
                0
            };
            let body = &card[content_start..];

            json!({
                "total_lines": lines,
                "has_yaml_frontmatter": card.starts_with("---"),
                "yaml_section_lines": yaml_section.lines().count(),
                "headers": headers,
                "methodology": methodology,
                "code_block_languages": code_blocks,
                "urls_referenced": urls,
                "body_preview": body.chars().take(2000).collect::<String>(),
            })
        });

        let file_list = files.cloned().unwrap_or_default();

        model_analyses.push(json!({
            "repo_id": repo_id,
            "created_at": m.created_at,
            "last_modified": m.last_modified,
            "downloads": m.downloads,
            "likes": m.likes,
            "library": m.library,
            "pipeline_tag": m.pipeline_tag,
            "tags": m.tags,
            "files": file_list,
            "architecture": arch,
            "parameters": param_info,
            "adapter_config": adapter_info,
            "chat_template": chat_info,
            "generation_config": gen_info,
            "model_card_analysis": card_analysis,
        }));
    }

    // ── 7. Dataset analysis ───────────────────────────────────────
    let mut dataset_analyses = Vec::new();
    for d in &datasets {
        let repo_id = d.repo_id.as_deref().unwrap_or("?");
        let data = repo_data.get(repo_id);
        let files = repo_files.get(repo_id);

        let readme = data.and_then(|d| d.get("README.md")).map(|card| {
            let content_lower = card.to_lowercase();
            json!({
                "lines": card.lines().count(),
                "has_yaml_frontmatter": card.starts_with("---"),
                "mentions_sales": content_lower.contains("sales"),
                "mentions_email": content_lower.contains("email"),
                "mentions_feedback": content_lower.contains("feedback"),
                "mentions_preference": content_lower.contains("preference"),
                "preview": card.chars().take(2000).collect::<String>(),
            })
        });

        dataset_analyses.push(json!({
            "repo_id": repo_id,
            "created_at": d.created_at,
            "last_modified": d.last_modified,
            "downloads": d.downloads,
            "likes": d.likes,
            "tags": d.tags,
            "files": files.cloned().unwrap_or_default(),
            "readme_analysis": readme,
        }));
    }

    // ── 8. Architecture families + timeline ───────────────────────
    let mut parsed_configs: HashMap<String, serde_json::Value> = HashMap::new();
    for (repo_id, files) in &repo_data {
        if let Some(cfg_str) = files.get("config.json") {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(cfg_str) {
                parsed_configs.insert(repo_id.clone(), cfg);
            }
        }
    }

    let mut arch_families: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for m in &models {
        let repo_id = m.repo_id.as_deref().unwrap_or("?");
        let model_type = parsed_configs
            .get(repo_id)
            .and_then(|c| c.get("model_type").and_then(|v| v.as_str()))
            .unwrap_or("unknown");
        arch_families
            .entry(model_type.to_owned())
            .or_default()
            .push(repo_id.to_owned());
    }

    let timeline: Vec<serde_json::Value> = sorted_models
        .iter()
        .map(|m| {
            let repo_id = m.repo_id.as_deref().unwrap_or("?");
            let model_type = parsed_configs
                .get(repo_id)
                .and_then(|c| c.get("model_type").and_then(|v| v.as_str()))
                .unwrap_or("unknown");
            json!({
                "date": m.created_at,
                "repo_id": repo_id,
                "model_type": model_type,
            })
        })
        .collect();

    // ── 9. Training signals + score ───────────────────────────────
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

    // ── 10. Sales relevance assessment ────────────────────────────
    // Analyze how this HF presence relates to B2B sales use cases
    let sales_relevance = {
        let has_kto = cards.values().any(|c| {
            let lower = c.to_lowercase();
            lower.contains("kto") || lower.contains("kahneman-tversky")
        });
        let has_ultrafeedback = cards
            .values()
            .any(|c| c.to_lowercase().contains("ultrafeedback"));
        let has_instruct = model_ids.iter().any(|id| id.contains("instruct"));
        let has_chat = model_ids.iter().any(|id| id.contains("chat"));
        let has_sales_mention = cards
            .values()
            .any(|c| c.to_lowercase().contains("sales"));

        let base_models: Vec<String> = parsed_configs
            .values()
            .filter_map(|c| c.get("_name_or_path").and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect();

        json!({
            "alignment_method": if has_kto { "KTO (Kahneman-Tversky Optimization)" } else { "unknown" },
            "training_data": if has_ultrafeedback { "UltraFeedback (general instruction-following)" } else { "unknown" },
            "has_instruct_model": has_instruct,
            "has_chat_model": has_chat,
            "mentions_sales_in_cards": has_sales_mention,
            "base_models": base_models,
            "assessment": "SalesLoft published an aligned LLM fine-tune — KTO on Llama-3 suggests internal ML team experimenting with preference-aligned generation for sales workflows (email drafting, conversation coaching, response generation).",
            "sales_applications": [
                "Email personalization / outreach generation",
                "Sales call coaching / response suggestions",
                "Customer conversation summarization",
                "Objection handling / response drafting",
            ],
        })
    };

    // ── 11. Save ──────────────────────────────────────────────────
    let output = json!({
        "org": "salesloft",
        "scan_method": "hf crate: scan_org_deep + fetch_raw_files + list_repo_files + fetch_model_cards",
        "hf_score": (score * 1000.0).round() / 1000.0,
        "total_models": models.len(),
        "total_datasets": datasets.len(),
        "total_spaces": spaces.len(),
        "configs_fetched": repo_data.values().filter(|d| d.contains_key("config.json")).count(),
        "total_files_fetched": fetch_ok,
        "fetch_failures": fetch_err,
        "model_cards_fetched": cards.len(),
        "architecture_families": arch_families,
        "timeline": timeline,
        "training_signals": signals_json,
        "sales_relevance": sales_relevance,
        "models": model_analyses,
        "datasets": dataset_analyses,
    });

    let output_str = serde_json::to_string_pretty(&output)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("salesloft-deep-dive.json");
    std::fs::write(&out_path, &output_str)?;
    eprintln!("\nSaved to {}", out_path.display());
    eprintln!(
        "Models: {}  Datasets: {}  Spaces: {}  Configs: {}  Files: {}  Cards: {}",
        models.len(),
        datasets.len(),
        spaces.len(),
        repo_data
            .values()
            .filter(|d| d.contains_key("config.json"))
            .count(),
        fetch_ok,
        cards.len(),
    );

    Ok(())
}

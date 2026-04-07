//! Super deep dive on Diffbot's HuggingFace presence.
//! Fetches all model configs, tokenizers, generation configs, weight indices,
//! model cards, and tool parser source code using the hf crate exclusively.

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
];

/// Extra files specific to known repos (tool parsers, templates, quantization).
const EXTRA_FILES: &[(&str, &[&str])] = &[
    (
        "diffbot/Diffbot-Coder-2603",
        &[
            "chat_template.jinja",
            "qwen3coder_tool_parser_vllm.py",
            "qwen3_coder_detector_sgl.py",
        ],
    ),
    (
        "diffbot/Diffbot-Coder-2602",
        &["chat_template.jinja"],
    ),
    (
        "diffbot/Diffbot-Coder-2601",
        &["chat_template.jinja"],
    ),
    (
        "diffbot/Diffbot-Coder-2603-GGUF",
        &["Modelfile"],
    ),
    (
        "diffbot/Diffbot-Coder-2601-GGUF",
        &["Modelfile"],
    ),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;
    let scanner = OrgScanner::new(&client);

    // ── 1. List all Diffbot models with full metadata ──────────
    eprintln!("=== Phase 1: Listing all Diffbot models ===");
    let models = client.list_by_author("diffbot", RepoType::Model, 500).await?;
    eprintln!("Found {} models", models.len());

    let repo_ids: Vec<String> = models.iter().filter_map(|m| m.repo_id.clone()).collect();

    for m in &models {
        let id = m.repo_id.as_deref().unwrap_or("?");
        let dl = m.downloads.unwrap_or(0);
        let likes = m.likes.unwrap_or(0);
        let lib = m.library.as_deref().unwrap_or("-");
        let tag = m.pipeline_tag.as_deref().unwrap_or("-");
        let created = m.created_at.as_deref().unwrap_or("?");
        let n_files = m.siblings.as_ref().map(|s| s.len()).unwrap_or(0);
        eprintln!(
            "  {id:<50} dl={dl:<6} likes={likes:<4} lib={lib:<15} tag={tag:<20} created={created:<26} files={n_files}"
        );
    }

    // ── 2. Fetch file listings for all models ──────────────────
    eprintln!("\n=== Phase 2: File listings ===");
    let file_requests: Vec<FetchRequest> = repo_ids
        .iter()
        .map(|id| FetchRequest::model(id))
        .collect();
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

    // ── 3. Fetch config files per-type (avoids buffer_unordered ordering issues) ──
    eprintln!("\n=== Phase 3: Fetching config files ===");
    let mut repo_data: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut fetch_ok = 0usize;
    let mut fetch_err = 0usize;

    // Build all (filename, requests) batches
    let mut batches: Vec<(&str, Vec<FetchRequest>)> = Vec::new();

    for &filename in COMMON_FILES {
        let reqs: Vec<FetchRequest> = repo_ids
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

    // Extra files for specific repos
    for &(target_repo, extras) in EXTRA_FILES {
        if !repo_ids.iter().any(|r| r == target_repo) {
            continue;
        }
        let files = repo_files.get(target_repo);
        for &filename in extras {
            let exists = files
                .map(|fs| fs.iter().any(|f| f == filename))
                .unwrap_or(false);
            if exists {
                batches.push((filename, vec![FetchRequest::model(target_repo).with_path(filename)]));
            }
        }
    }

    let total_files: usize = batches.iter().map(|(_, r)| r.len()).sum();
    eprintln!("Fetching {total_files} files across {} models...", repo_ids.len());

    // Fetch each file type as a batch — results match by repo_id
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

    // ── 4. Fetch model cards ───────────────────────────────────
    eprintln!("\n=== Phase 4: Model cards ===");
    let cards = client.fetch_model_cards(&repo_ids).await.unwrap_or_default();
    for (repo_id, card) in &cards {
        let lines = card.lines().count();
        let has_yaml = card.starts_with("---");
        eprintln!("  {repo_id}: {lines} lines, yaml_frontmatter={has_yaml}");
    }

    // ── 5. Run scan_org_deep for scoring ───────────────────────
    eprintln!("\n=== Phase 5: OrgScanner deep scan ===");
    let profile = scanner.scan_org_deep("diffbot").await?;
    let score = OrgScanner::compute_hf_score(&profile);
    eprintln!("  hf_score={score:.3}  signals={}  configs={}",
        profile.training_signals.len(), profile.model_configs.len());

    for sig in &profile.training_signals {
        eprintln!("    {:?}: {} — {}", sig.signal_type, sig.repo_id, sig.evidence);
    }

    // ── 6. Build comprehensive analysis JSON ───────────────────
    eprintln!("\n=== Phase 6: Building analysis ===");

    let mut model_analyses = Vec::new();

    // Sort by created_at for timeline
    let mut sorted_models = models.clone();
    sorted_models.sort_by(|a, b| {
        a.created_at.as_deref().unwrap_or("").cmp(&b.created_at.as_deref().unwrap_or(""))
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

        // Parse model.safetensors.index.json for param count
        let index: Option<serde_json::Value> = data
            .and_then(|d| d.get("model.safetensors.index.json"))
            .and_then(|s| serde_json::from_str(s).ok());

        // Extract architecture details from config
        let arch = config.as_ref().map(|c| {
            let model_type = c.get("model_type").and_then(|v| v.as_str());
            let architectures = c.get("architectures");
            let hidden = c.get("hidden_size").and_then(|v| v.as_u64());
            let layers = c.get("num_hidden_layers").and_then(|v| v.as_u64());
            let heads = c.get("num_attention_heads").and_then(|v| v.as_u64());
            let kv_heads = c.get("num_key_value_heads").and_then(|v| v.as_u64());
            let experts = c.get("num_experts").or(c.get("num_local_experts")).and_then(|v| v.as_u64());
            let active_experts = c.get("num_activated_experts").or(c.get("num_experts_per_tok")).and_then(|v| v.as_u64());
            let shared_experts = c.get("n_shared_experts").and_then(|v| v.as_u64());
            let ctx = c.get("max_position_embeddings").and_then(|v| v.as_u64());
            let vocab = c.get("vocab_size").and_then(|v| v.as_u64());
            let intermediate = c.get("intermediate_size").and_then(|v| v.as_u64());
            let moe_intermediate = c.get("moe_intermediate_size").and_then(|v| v.as_u64());
            let rope_theta = c.get("rope_theta").and_then(|v| v.as_f64());
            let torch_dtype = c.get("torch_dtype").and_then(|v| v.as_str());

            // MLA (Multi-head Latent Attention) fields
            let kv_lora_rank = c.get("kv_lora_rank").and_then(|v| v.as_u64());
            let q_lora_rank = c.get("q_lora_rank").and_then(|v| v.as_u64());

            // Hybrid attention fields
            let linear_conv_kernel_dim = c.get("linear_conv_kernel_dim").and_then(|v| v.as_u64());
            let partial_rotary_factor = c.get("partial_rotary_factor").and_then(|v| v.as_f64());

            // Speculative decoding
            let nextn = c.get("num_nextn_predict_layers").and_then(|v| v.as_u64());

            json!({
                "model_type": model_type,
                "architectures": architectures,
                "hidden_size": hidden,
                "num_hidden_layers": layers,
                "num_attention_heads": heads,
                "num_key_value_heads": kv_heads,
                "num_experts": experts,
                "num_activated_experts": active_experts,
                "n_shared_experts": shared_experts,
                "max_position_embeddings": ctx,
                "vocab_size": vocab,
                "intermediate_size": intermediate,
                "moe_intermediate_size": moe_intermediate,
                "rope_theta": rope_theta,
                "torch_dtype": torch_dtype,
                "kv_lora_rank": kv_lora_rank,
                "q_lora_rank": q_lora_rank,
                "linear_conv_kernel_dim": linear_conv_kernel_dim,
                "partial_rotary_factor": partial_rotary_factor,
                "num_nextn_predict_layers": nextn,
            })
        });

        // Extract param count from safetensors index
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
            // Count distinct layer prefixes for structure analysis
            let layer_structure = idx
                .get("weight_map")
                .and_then(|w| w.as_object())
                .map(|w| {
                    let mut layers: BTreeMap<String, Vec<String>> = BTreeMap::new();
                    for key in w.keys() {
                        let parts: Vec<&str> = key.split('.').collect();
                        if parts.len() >= 3 && parts[0] == "model" && parts[1] == "layers" {
                            let layer_num = parts[2].to_string();
                            let component = parts[3..].join(".");
                            layers.entry(layer_num).or_default().push(component);
                        }
                    }
                    // Return summary: layer count and component types of first MoE + first dense layer
                    let n_layers = layers.len();
                    let first_layer = layers.iter().next().map(|(k, v)| {
                        json!({"layer": k, "components": v.len(), "has_experts": v.iter().any(|c| c.contains("expert"))})
                    });
                    let moe_layer = layers.iter().find(|(_, v)| v.iter().any(|c| c.contains("expert"))).map(|(k, v)| {
                        let expert_count = v.iter().filter(|c| c.starts_with("experts.")).collect::<Vec<_>>().len();
                        json!({"layer": k, "components": v.len(), "expert_weight_count": expert_count})
                    });
                    json!({"total_layers": n_layers, "first_layer": first_layer, "sample_moe_layer": moe_layer})
                });

            json!({
                "total_size_bytes": total_size,
                "total_size_gb": total_size.map(|s| (s as f64 / 1e9 * 100.0).round() / 100.0),
                "shard_count": shard_count,
                "layer_structure": layer_structure,
            })
        });

        // Extract chat template info
        let chat_info = tokenizer.as_ref().map(|t| {
            let has_chat_template = t.get("chat_template").is_some();
            let chat_template_len = t
                .get("chat_template")
                .and_then(|v| v.as_str().map(|s| s.len())
                    .or_else(|| v.as_array().map(|a| a.len())));
            let added_tokens = t
                .get("added_tokens_decoder")
                .and_then(|v| v.as_object())
                .map(|o| o.len());
            let bos = t.get("bos_token");
            let eos = t.get("eos_token");

            // Check for tool-use related tokens
            let has_tool_tokens = t
                .get("added_tokens_decoder")
                .and_then(|v| v.as_object())
                .map(|o| {
                    o.values().any(|v| {
                        v.get("content")
                            .and_then(|c| c.as_str())
                            .map(|s| s.contains("tool") || s.contains("function"))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);

            json!({
                "has_chat_template": has_chat_template,
                "chat_template_length": chat_template_len,
                "added_tokens_count": added_tokens,
                "bos_token": bos,
                "eos_token": eos,
                "has_tool_tokens": has_tool_tokens,
            })
        });

        // Generation config
        let gen_info = gen_config.as_ref().map(|g| {
            json!({
                "temperature": g.get("temperature"),
                "top_k": g.get("top_k"),
                "top_p": g.get("top_p"),
                "max_new_tokens": g.get("max_new_tokens"),
                "repetition_penalty": g.get("repetition_penalty"),
                "do_sample": g.get("do_sample"),
                "eos_token_id": g.get("eos_token_id"),
            })
        });

        // Tool parser source code (just presence + line count)
        let tool_parsers: Vec<serde_json::Value> = data
            .map(|d| {
                d.iter()
                    .filter(|(k, _)| k.ends_with(".py"))
                    .map(|(k, v)| {
                        json!({
                            "filename": k,
                            "lines": v.lines().count(),
                            "size_bytes": v.len(),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Chat template raw content (for template analysis)
        let chat_template_raw = data
            .and_then(|d| d.get("chat_template.jinja"))
            .map(|s| {
                json!({
                    "lines": s.lines().count(),
                    "size_bytes": s.len(),
                    "has_tool_call": s.contains("tool_call"),
                    "has_think": s.contains("think"),
                    "has_function": s.contains("function"),
                })
            });

        // Modelfile (Ollama)
        let modelfile = data
            .and_then(|d| d.get("Modelfile"))
            .map(|s| {
                json!({
                    "lines": s.lines().count(),
                    "content": s,
                })
            });

        // Model card summary
        let card_summary = cards.get(repo_id).map(|card| {
            let lines = card.lines().count();
            // Extract first non-YAML paragraph
            let content_start = if card.starts_with("---") {
                card.find("\n---\n").map(|i| i + 5).unwrap_or(0)
            } else {
                0
            };
            let first_para: String = card[content_start..]
                .lines()
                .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
                .take(5)
                .collect::<Vec<_>>()
                .join("\n");
            json!({
                "lines": lines,
                "has_yaml_frontmatter": card.starts_with("---"),
                "first_paragraph": first_para,
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
            "chat_template": chat_info,
            "generation_config": gen_info,
            "tool_parsers": tool_parsers,
            "chat_template_analysis": chat_template_raw,
            "modelfile": modelfile,
            "model_card": card_summary,
        }));
    }

    // ── 7. Parse all configs into a lookup for family grouping ──
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
            .unwrap_or(if repo_id.contains("GGUF") || repo_id.contains("fp8") {
                "quantized_variant"
            } else {
                "unknown"
            });
        arch_families
            .entry(model_type.to_owned())
            .or_default()
            .push(repo_id.to_owned());
    }

    // ── 8. Timeline analysis ───────────────────────────────────
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

    // ── 9. Training signals + score ────────────────────────────
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

    // ── 10. Save ───────────────────────────────────────────────
    let output = json!({
        "org": "diffbot",
        "scan_method": "hf crate: scan_org_deep + fetch_raw_files + list_repo_files + fetch_model_cards",
        "hf_score": (score * 1000.0).round() / 1000.0,
        "total_models": models.len(),
        "configs_fetched": repo_data.values().filter(|d| d.contains_key("config.json")).count(),
        "total_files_fetched": fetch_ok,
        "fetch_failures": fetch_err,
        "model_cards_fetched": cards.len(),
        "architecture_families": arch_families,
        "timeline": timeline,
        "training_signals": signals_json,
        "models": model_analyses,
    });

    let output_str = serde_json::to_string_pretty(&output)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("diffbot-deep-dive.json");
    std::fs::write(&out_path, &output_str)?;
    eprintln!("\nSaved to {}", out_path.display());
    eprintln!(
        "Models: {}  Configs: {}  Files: {}  Cards: {}",
        models.len(),
        repo_data.values().filter(|d| d.contains_key("config.json")).count(),
        fetch_ok,
        cards.len(),
    );

    Ok(())
}

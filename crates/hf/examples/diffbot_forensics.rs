//! Diffbot forensics — second-pass deep analysis.
//! Weight map layer analysis, tool parser code, chat templates, Modelfiles,
//! cross-model architecture evolution, and pytorch index for older models.

use hf::{FetchRequest, FetchResult, HfClient, RepoType};
use serde_json::json;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::Path;

/// Additional files the first pass missed.
const EXTRA_FETCHES: &[(&str, &str)] = &[
    // Old-format weight index for 2412 models
    ("diffbot/Llama-3.3-Diffbot-Small-XL-2412", "pytorch_model.bin.index.json"),
    ("diffbot/Llama-3.1-Diffbot-Small-2412", "pytorch_model.bin.index.json"),
    // Ollama Modelfiles
    ("diffbot/Diffbot-Coder-2603-GGUF", "Modelfile.Q4_K_M"),
    ("diffbot/Diffbot-Coder-2603-GGUF", "Modelfile.Q8_0"),
    // Chat templates (separate jinja files)
    ("diffbot/Diffbot-Coder-2603", "chat_template.jinja"),
    ("diffbot/Diffbot-Coder-2602", "chat_template.jinja"),
    ("diffbot/Diffbot-Coder-2601", "chat_template.jinja"),
    ("diffbot/Diffbot-Small-XL-2508", "chat_template.jinja"),
    ("diffbot/Llama-3.1-Diffbot-Small-2508", "chat_template.jinja"),
    // Tool parsers
    ("diffbot/Diffbot-Coder-2603", "qwen3coder_tool_parser_vllm.py"),
    ("diffbot/Diffbot-Coder-2603", "qwen3_coder_detector_sgl.py"),
    // All weight indices (for deep layer analysis)
    ("diffbot/Diffbot-Coder-2603", "model.safetensors.index.json"),
    ("diffbot/Diffbot-Coder-2602", "model.safetensors.index.json"),
    ("diffbot/Diffbot-Coder-2601", "model.safetensors.index.json"),
    ("diffbot/Diffbot-Small-XL-2508", "model.safetensors.index.json"),
    ("diffbot/Diffbot-Small-XL-2505", "model.safetensors.index.json"),
    ("diffbot/Llama-3.3-Diffbot-Small-XL-2504", "model.safetensors.index.json"),
    ("diffbot/Llama-3.1-Diffbot-Small-2504", "model.safetensors.index.json"),
    ("diffbot/Llama-3.1-Diffbot-Small-2508", "model.safetensors.index.json"),
    // All configs for completeness
    ("diffbot/Diffbot-Coder-2603", "config.json"),
    ("diffbot/Diffbot-Coder-2602", "config.json"),
    ("diffbot/Diffbot-Coder-2601", "config.json"),
    // README for flagship
    ("diffbot/Diffbot-Coder-2603", "README.md"),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(12)?;

    // ── 1. Fetch all forensic files ────────────────────────────
    eprintln!("=== Fetching forensic files ===");

    // Group by filename for correct batching (buffer_unordered doesn't preserve order)
    let mut by_file: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for &(repo, file) in EXTRA_FETCHES {
        by_file.entry(file.to_owned()).or_default().push(repo.to_owned());
    }

    let mut fetched: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut ok_count = 0usize;
    let mut err_count = 0usize;

    for (filename, repos) in &by_file {
        let requests: Vec<FetchRequest> = repos
            .iter()
            .map(|r| FetchRequest::model(r).with_path(filename))
            .collect();
        let results = client.fetch_raw_files(&requests).await;
        for result in results {
            match result {
                FetchResult::Ok { repo_id, data } => {
                    ok_count += 1;
                    fetched.entry(repo_id).or_default().insert(filename.clone(), data);
                }
                FetchResult::Err { repo_id, error } => {
                    err_count += 1;
                    eprintln!("  FAIL {repo_id}/{filename}: {error}");
                }
            }
        }
    }
    eprintln!("Fetched: {ok_count} ok, {err_count} failed\n");

    // ── 2. Weight map forensics ────────────────────────────────
    eprintln!("=== Weight Map Forensics ===");
    let mut weight_analyses = Vec::new();

    let weight_index_files = [
        "model.safetensors.index.json",
        "pytorch_model.bin.index.json",
    ];

    for (repo_id, files) in &fetched {
        for index_file in weight_index_files {
            let Some(content) = files.get(index_file) else { continue };
            let Ok(idx) = serde_json::from_str::<serde_json::Value>(content) else { continue };

            let weight_map = match idx.get("weight_map").and_then(|w| w.as_object()) {
                Some(w) => w,
                None => continue,
            };

            // Total size
            let total_size = idx
                .get("metadata")
                .and_then(|m| m.get("total_size"))
                .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())));

            // Shard analysis
            let mut shards: Vec<&str> = weight_map.values().filter_map(|v| v.as_str()).collect();
            shards.sort();
            shards.dedup();

            // Layer structure analysis
            let mut layers: BTreeMap<usize, Vec<String>> = BTreeMap::new();
            let mut non_layer_keys: Vec<String> = Vec::new();

            for key in weight_map.keys() {
                let parts: Vec<&str> = key.split('.').collect();
                if parts.len() >= 3 && parts[0] == "model" && parts[1] == "layers" {
                    if let Ok(num) = parts[2].parse::<usize>() {
                        let component = parts[3..].join(".");
                        layers.entry(num).or_default().push(component);
                    }
                } else {
                    non_layer_keys.push(key.clone());
                }
            }

            // Classify each layer
            let mut layer_types: BTreeMap<usize, String> = BTreeMap::new();
            let mut moe_layers = Vec::new();
            let mut dense_layers = Vec::new();
            let mut attention_types: BTreeMap<usize, String> = BTreeMap::new();

            for (&layer_num, components) in &layers {
                let has_experts = components.iter().any(|c| c.contains("experts."));
                let has_shared_expert = components.iter().any(|c| c.contains("shared_expert"))
                    || components.iter().any(|c| c.contains("shared_experts"));
                let has_gate = components.iter().any(|c| c.contains("gate"));

                // Attention type detection
                let has_q_proj = components.iter().any(|c| c.contains("q_proj"));
                let has_in_proj = components.iter().any(|c| c.contains("in_proj"));
                let has_a_log = components.iter().any(|c| c.contains("A_log"));
                let has_conv1d = components.iter().any(|c| c.contains("conv1d"));
                let has_dt_bias = components.iter().any(|c| c.contains("dt_bias"));
                let has_q_norm = components.iter().any(|c| c.contains("q_norm"));

                let attn_type = if has_a_log || has_dt_bias {
                    "DeltaNet (gated linear)"
                } else if has_q_proj && has_q_norm {
                    "Full attention (with q/k norm)"
                } else if has_q_proj {
                    "Full attention"
                } else if has_in_proj {
                    "Fused projection"
                } else {
                    "unknown"
                };
                attention_types.insert(layer_num, attn_type.to_owned());

                if has_experts {
                    moe_layers.push(layer_num);
                    // Count unique expert indices
                    let expert_ids: HashSet<usize> = components
                        .iter()
                        .filter_map(|c| {
                            let p: Vec<&str> = c.split('.').collect();
                            p.iter().position(|&s| s == "experts")
                                .and_then(|i| p.get(i + 1))
                                .and_then(|s| s.parse().ok())
                        })
                        .collect();
                    let layer_type = format!(
                        "MoE({} experts{}{})",
                        expert_ids.len(),
                        if has_shared_expert { " + shared" } else { "" },
                        if has_gate { " + gate" } else { "" },
                    );
                    layer_types.insert(layer_num, layer_type);
                } else {
                    dense_layers.push(layer_num);
                    layer_types.insert(layer_num, "dense".to_owned());
                }
            }

            // Detect attention pattern (for hybrid models)
            let attn_pattern = if attention_types.values().any(|t| t.contains("DeltaNet")) {
                // Find the pattern: every Nth layer is full attention
                let full_attn_layers: Vec<usize> = attention_types
                    .iter()
                    .filter(|(_, t)| t.contains("Full attention"))
                    .map(|(&k, _)| k)
                    .collect();
                let delta_layers: Vec<usize> = attention_types
                    .iter()
                    .filter(|(_, t)| t.contains("DeltaNet"))
                    .map(|(&k, _)| k)
                    .collect();

                if full_attn_layers.len() >= 2 {
                    let gaps: Vec<usize> = full_attn_layers.windows(2)
                        .map(|w| w[1] - w[0])
                        .collect();
                    let consistent_gap = gaps.iter().all(|&g| g == gaps[0]);
                    if consistent_gap && !gaps.is_empty() {
                        format!(
                            "Hybrid: {} DeltaNet + {} full attention (every {}th layer: {:?})",
                            delta_layers.len(),
                            full_attn_layers.len(),
                            gaps[0],
                            &full_attn_layers[..full_attn_layers.len().min(8)]
                        )
                    } else {
                        format!("Hybrid: {} DeltaNet + {} full attention (irregular)", delta_layers.len(), full_attn_layers.len())
                    }
                } else {
                    format!("DeltaNet dominant ({} layers)", delta_layers.len())
                }
            } else {
                "Standard attention".to_owned()
            };

            // Expert size analysis for MoE layers
            let sample_moe_layer = moe_layers.first().map(|&layer_num| {
                let components = &layers[&layer_num];
                // Count weights per expert to estimate expert size
                let expert_weights: Vec<&String> = components
                    .iter()
                    .filter(|c| c.contains("experts.0."))
                    .collect();
                json!({
                    "layer": layer_num,
                    "weights_per_expert": expert_weights.len(),
                    "expert_weight_names": expert_weights,
                })
            });

            eprintln!("  {repo_id}:");
            eprintln!("    total_size: {:.2} GB", total_size.unwrap_or(0) as f64 / 1e9);
            eprintln!("    shards: {}", shards.len());
            eprintln!("    layers: {} ({} MoE, {} dense)", layers.len(), moe_layers.len(), dense_layers.len());
            eprintln!("    attention: {attn_pattern}");
            eprintln!("    non-layer keys: {}", non_layer_keys.len());

            weight_analyses.push(json!({
                "repo_id": repo_id,
                "index_file": index_file,
                "total_size_bytes": total_size,
                "total_size_gb": total_size.map(|s| (s as f64 / 1e9 * 100.0).round() / 100.0),
                "shard_count": shards.len(),
                "total_weights": weight_map.len(),
                "total_layers": layers.len(),
                "moe_layer_count": moe_layers.len(),
                "dense_layer_count": dense_layers.len(),
                "moe_layers": moe_layers,
                "dense_layers": dense_layers,
                "attention_pattern": attn_pattern,
                "layer_types": layer_types.iter().map(|(k, v)| json!({"layer": k, "type": v})).collect::<Vec<_>>(),
                "attention_types": attention_types.iter().map(|(k, v)| json!({"layer": k, "type": v})).collect::<Vec<_>>(),
                "sample_moe_layer": sample_moe_layer,
                "non_layer_keys": non_layer_keys,
            }));
        }
    }

    // ── 3. Chat template analysis ──────────────────────────────
    eprintln!("\n=== Chat Template Analysis ===");
    let mut template_analyses = Vec::new();

    for (repo_id, files) in &fetched {
        let Some(template) = files.get("chat_template.jinja") else { continue };

        let lines = template.lines().count();
        let has_tool_call = template.contains("tool_call");
        let has_think = template.contains("<think>");
        let has_function = template.contains("function");
        let has_system = template.contains("system");
        let has_tool_response = template.contains("tool_response") || template.contains("tool_result");
        let has_xml_tool = template.contains("<tool_call>");

        // Extract tool format pattern
        let tool_format = if template.contains("<tool_call><function=") {
            "XML nested: <tool_call><function=NAME><parameter=KEY>VALUE</parameter></function></tool_call>"
        } else if template.contains("<tool_call>") && template.contains("<arg_key>") {
            "XML arg: <tool_call>func<arg_key>k</arg_key><arg_value>v</arg_value></tool_call>"
        } else if template.contains("tool_call") {
            "custom tool_call format"
        } else {
            "no tool format detected"
        };

        // Extract thinking mode
        let thinking_mode = if template.contains("enable_thinking") || template.contains("<think>") {
            if template.contains("enable_thinking") {
                "configurable (enable_thinking flag)"
            } else {
                "always-on <think> blocks"
            }
        } else {
            "none"
        };

        // Extract role handling
        let roles: Vec<&str> = ["system", "user", "assistant", "tool", "observation"]
            .iter()
            .filter(|&&role| template.contains(role))
            .copied()
            .collect();

        eprintln!("  {repo_id}: {lines}L  tool_format={tool_format}  thinking={thinking_mode}");
        eprintln!("    roles: {roles:?}");

        template_analyses.push(json!({
            "repo_id": repo_id,
            "lines": lines,
            "size_bytes": template.len(),
            "has_tool_call": has_tool_call,
            "has_think": has_think,
            "has_function": has_function,
            "has_system": has_system,
            "has_tool_response": has_tool_response,
            "has_xml_tool": has_xml_tool,
            "tool_format": tool_format,
            "thinking_mode": thinking_mode,
            "roles": roles,
            "raw_content": template,
        }));
    }

    // ── 4. Tool parser source code analysis ────────────────────
    eprintln!("\n=== Tool Parser Analysis ===");
    let mut parser_analyses = Vec::new();

    for (repo_id, files) in &fetched {
        for (filename, content) in files {
            if !filename.ends_with(".py") {
                continue;
            }

            let lines = content.lines().count();

            // Extract class names
            let classes: Vec<String> = content
                .lines()
                .filter(|l| l.starts_with("class "))
                .map(|l| l.trim_start_matches("class ").split(['(', ':']).next().unwrap_or("").to_owned())
                .collect();

            // Extract method names
            let methods: Vec<String> = content
                .lines()
                .filter(|l| l.trim().starts_with("def "))
                .map(|l| l.trim().trim_start_matches("def ").split('(').next().unwrap_or("").to_owned())
                .collect();

            // Extract imports
            let imports: Vec<String> = content
                .lines()
                .filter(|l| l.starts_with("import ") || l.starts_with("from "))
                .map(|l| l.to_owned())
                .collect();

            // Extract regex patterns (tool parsing patterns)
            let regex_patterns: Vec<String> = content
                .lines()
                .filter(|l| l.contains("re.compile") || l.contains("re.search") || l.contains("re.findall") || l.contains("re.match"))
                .map(|l| l.trim().to_owned())
                .collect();

            // Extract string constants (tool format markers)
            let markers: Vec<String> = content
                .lines()
                .filter(|l| {
                    l.contains("\"<tool_call>\"") || l.contains("\"</tool_call>\"")
                        || l.contains("\"<function=\"") || l.contains("\"<parameter=\"")
                        || l.contains("TOOL_CALL") || l.contains("tool_call")
                })
                .map(|l| l.trim().to_owned())
                .collect();

            eprintln!("  {repo_id}/{filename}: {lines}L, {} classes, {} methods", classes.len(), methods.len());
            eprintln!("    classes: {classes:?}");
            eprintln!("    methods: {methods:?}");
            if !regex_patterns.is_empty() {
                eprintln!("    regex patterns: {}", regex_patterns.len());
            }

            parser_analyses.push(json!({
                "repo_id": repo_id,
                "filename": filename,
                "lines": lines,
                "size_bytes": content.len(),
                "classes": classes,
                "methods": methods,
                "imports": imports,
                "regex_patterns": regex_patterns,
                "tool_markers": markers,
                "raw_content": content,
            }));
        }
    }

    // ── 5. Modelfile analysis (Ollama) ─────────────────────────
    eprintln!("\n=== Modelfile Analysis (Ollama) ===");
    let mut modelfile_analyses = Vec::new();

    for (repo_id, files) in &fetched {
        for (filename, content) in files {
            if !filename.starts_with("Modelfile") {
                continue;
            }

            let lines = content.lines().count();

            // Extract key directives
            let from_line = content.lines().find(|l| l.starts_with("FROM "));
            let system_prompt: String = content
                .lines()
                .skip_while(|l| !l.starts_with("SYSTEM"))
                .skip(1)
                .take_while(|l| !l.starts_with("PARAMETER") && !l.starts_with("TEMPLATE") && !l.starts_with("FROM"))
                .collect::<Vec<_>>()
                .join("\n");
            let params: Vec<String> = content
                .lines()
                .filter(|l| l.starts_with("PARAMETER "))
                .map(|l| l.to_owned())
                .collect();
            let template_block: String = content
                .lines()
                .skip_while(|l| !l.starts_with("TEMPLATE"))
                .take_while(|l| !l.starts_with("PARAMETER") || l.starts_with("TEMPLATE"))
                .collect::<Vec<_>>()
                .join("\n");

            eprintln!("  {repo_id}/{filename}: {lines}L  from={}", from_line.unwrap_or("?"));
            eprintln!("    params: {params:?}");

            modelfile_analyses.push(json!({
                "repo_id": repo_id,
                "filename": filename,
                "lines": lines,
                "from": from_line,
                "parameters": params,
                "system_prompt_preview": system_prompt.chars().take(500).collect::<String>(),
                "template_preview": template_block.chars().take(500).collect::<String>(),
                "raw_content": content,
            }));
        }
    }

    // ── 6. README / Model card analysis ────────────────────────
    eprintln!("\n=== Model Card Analysis ===");
    let mut card_analyses = Vec::new();

    for (repo_id, files) in &fetched {
        let Some(readme) = files.get("README.md") else { continue };

        let lines = readme.lines().count();

        // Extract YAML frontmatter
        let frontmatter = if readme.starts_with("---") {
            readme
                .find("\n---\n")
                .map(|end| &readme[4..end])
                .unwrap_or("")
        } else {
            ""
        };

        // Extract headers
        let headers: Vec<String> = readme
            .lines()
            .filter(|l| l.starts_with('#'))
            .map(|l| l.to_owned())
            .collect();

        // Extract code blocks (usage examples)
        let code_blocks: Vec<String> = {
            let mut blocks = Vec::new();
            let mut in_block = false;
            let mut current = String::new();
            let mut lang = String::new();
            for line in readme.lines() {
                if line.starts_with("```") {
                    if in_block {
                        blocks.push(json!({"lang": lang, "content": current.clone()}).to_string());
                        current.clear();
                        in_block = false;
                    } else {
                        lang = line.trim_start_matches('`').to_owned();
                        in_block = true;
                    }
                } else if in_block {
                    current.push_str(line);
                    current.push('\n');
                }
            }
            blocks
        };

        // Extract benchmark mentions
        let benchmarks: Vec<String> = readme
            .lines()
            .filter(|l| {
                let lower = l.to_lowercase();
                lower.contains("humaneval") || lower.contains("mbpp")
                    || lower.contains("benchmark") || lower.contains("accuracy")
                    || lower.contains("pass@") || lower.contains("score")
            })
            .map(|l| l.trim().to_owned())
            .collect();

        eprintln!("  {repo_id}: {lines}L, {} headers, {} code blocks, {} benchmark lines",
            headers.len(), code_blocks.len(), benchmarks.len());
        for h in &headers {
            eprintln!("    {h}");
        }

        card_analyses.push(json!({
            "repo_id": repo_id,
            "lines": lines,
            "frontmatter": frontmatter,
            "headers": headers,
            "code_block_count": code_blocks.len(),
            "benchmarks": benchmarks,
            "raw_content": readme,
        }));
    }

    // ── 7. Config deep-comparison ──────────────────────────────
    eprintln!("\n=== Config Deep Comparison ===");
    let mut config_details = Vec::new();

    for (repo_id, files) in &fetched {
        let Some(content) = files.get("config.json") else { continue };
        let Ok(config) = serde_json::from_str::<serde_json::Value>(content) else { continue };

        // Extract ALL keys (not just the common ones)
        let all_keys: Vec<String> = config
            .as_object()
            .map(|o| o.keys().cloned().collect())
            .unwrap_or_default();

        eprintln!("  {repo_id}: {} config keys", all_keys.len());

        config_details.push(json!({
            "repo_id": repo_id,
            "key_count": all_keys.len(),
            "all_keys": all_keys,
            "full_config": config,
        }));
    }

    // ── 8. Save comprehensive forensics ────────────────────────
    let output = json!({
        "org": "diffbot",
        "analysis_type": "forensics_deep_dive",
        "files_fetched": ok_count,
        "files_failed": err_count,
        "weight_map_analyses": weight_analyses,
        "chat_template_analyses": template_analyses,
        "tool_parser_analyses": parser_analyses,
        "modelfile_analyses": modelfile_analyses,
        "model_card_analyses": card_analyses,
        "config_comparisons": config_details,
    });

    let output_str = serde_json::to_string_pretty(&output)?;

    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/lead-gen/consultancies/data");
    let out_path = out_dir.join("diffbot-forensics.json");
    std::fs::write(&out_path, &output_str)?;
    eprintln!("\nSaved to {}", out_path.display());
    eprintln!(
        "Weight analyses: {}  Templates: {}  Parsers: {}  Modelfiles: {}  Cards: {}  Configs: {}",
        weight_analyses.len(),
        template_analyses.len(),
        parser_analyses.len(),
        modelfile_analyses.len(),
        card_analyses.len(),
        config_details.len(),
    );

    Ok(())
}

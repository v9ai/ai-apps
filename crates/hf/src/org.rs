//! Organization profiling — scan an org's HF presence and detect training signals.

use std::collections::{HashMap, HashSet};

use crate::client::HfClient;
use crate::error::Error;
use crate::types::*;

/// Well-known HF model types (standard architectures that indicate
/// fine-tuning rather than custom training when used as `model_type`).
const STANDARD_MODEL_TYPES: &[&str] = &[
    // NLU / encoder models
    "bert",
    "roberta",
    "distilbert",
    "albert",
    "electra",
    "deberta",
    "deberta-v2",
    "xlnet",
    "longformer",
    "bigbird",
    // Decoder / generation
    "gpt2",
    "gpt_neo",
    "gpt_neox",
    "llama",
    "mistral",
    "mixtral",
    "gemma",
    "gemma2",
    "phi",
    "phi3",
    "qwen2",
    "qwen2_moe",
    "falcon",
    "mpt",
    "cohere",
    "starcoder2",
    "codellama",
    // Seq2seq
    "t5",
    "bart",
    "pegasus",
    "marian",
    // Speech
    "whisper",
    "wav2vec2",
    // Vision
    "vit",
    "clip",
    "deit",
    "swin",
    "resnet",
    "convnext",
    // Image generation
    "stable-diffusion",
    "sdxl",
];

/// Scans a Hugging Face organization and builds an [`OrgProfile`]
/// with aggregated metadata, training signals, and arXiv citations.
pub struct OrgScanner<'a> {
    client: &'a HfClient,
}

impl<'a> OrgScanner<'a> {
    pub fn new(client: &'a HfClient) -> Self {
        Self { client }
    }

    /// Scan an org's complete HF presence.
    ///
    /// The HF API `author` filter is lowercase-only, so the org name is
    /// normalised automatically. The original casing is preserved in the
    /// returned `OrgProfile.org_name`.
    pub async fn scan_org(&self, org_name: &str) -> Result<OrgProfile, Error> {
        // HF API requires lowercase author param
        let author = org_name.to_lowercase();

        // 1. Fetch all models, datasets, spaces for the org
        let models = self
            .client
            .list_by_author(&author, RepoType::Model, 500)
            .await
            .unwrap_or_default();
        let datasets = self
            .client
            .list_by_author(&author, RepoType::Dataset, 500)
            .await
            .unwrap_or_default();
        let spaces = self
            .client
            .list_by_author(&author, RepoType::Space, 500)
            .await
            .unwrap_or_default();

        let total_downloads = models
            .iter()
            .chain(datasets.iter())
            .chain(spaces.iter())
            .filter_map(|r| r.downloads)
            .sum();

        // 2. Count libraries
        let mut lib_counts: HashMap<String, usize> = HashMap::new();
        for m in &models {
            if let Some(lib) = &m.library {
                *lib_counts.entry(lib.clone()).or_default() += 1;
            }
        }
        let mut libraries_used: Vec<(String, usize)> = lib_counts.into_iter().collect();
        libraries_used.sort_by(|a, b| b.1.cmp(&a.1));

        // 3. Count pipeline tags
        let mut tag_counts: HashMap<String, usize> = HashMap::new();
        for m in &models {
            if let Some(tag) = &m.pipeline_tag {
                *tag_counts.entry(tag.clone()).or_default() += 1;
            }
        }
        let mut pipeline_tags: Vec<(String, usize)> = tag_counts.into_iter().collect();
        pipeline_tags.sort_by(|a, b| b.1.cmp(&a.1));

        // 4. Fetch model cards for training signal detection
        let model_ids: Vec<String> = models.iter().filter_map(|m| m.repo_id.clone()).collect();

        let cards = if !model_ids.is_empty() {
            self.client
                .fetch_model_cards(&model_ids)
                .await
                .unwrap_or_default()
        } else {
            HashMap::new()
        };

        // 5. Parse training signals and arXiv links
        let mut training_signals = Vec::new();
        let mut arxiv_links = Vec::new();

        for (repo_id, card_text) in &cards {
            training_signals.extend(Self::parse_training_signals(repo_id, card_text));
            arxiv_links.extend(Self::extract_arxiv_links(card_text));
        }

        // Check card_data from RepoInfo for config-based signals
        for m in &models {
            if let (Some(repo_id), Some(card_data)) = (&m.repo_id, &m.card_data) {
                training_signals.extend(Self::parse_config_signals(repo_id, card_data));
            }
        }

        // Check siblings for training artifacts
        for m in &models {
            if let (Some(repo_id), Some(siblings)) = (&m.repo_id, &m.siblings) {
                training_signals.extend(Self::parse_file_signals(repo_id, siblings));
            }
        }

        arxiv_links.sort();
        arxiv_links.dedup();

        Ok(OrgProfile {
            org_name: org_name.to_owned(),
            models,
            datasets,
            spaces,
            total_downloads,
            libraries_used,
            pipeline_tags,
            training_signals,
            arxiv_links,
            model_configs: HashMap::new(),
        })
    }

    /// Like [`scan_org`] but also fetches `config.json` for each model.
    ///
    /// This correctly detects custom architectures, MoE patterns, NER labels,
    /// and large context windows that are invisible to the basic scan (which
    /// only sees README YAML frontmatter, not the actual model config).
    pub async fn scan_org_deep(&self, org_name: &str) -> Result<OrgProfile, Error> {
        let mut profile = self.scan_org(org_name).await?;

        let requests: Vec<FetchRequest> = profile
            .models
            .iter()
            .filter_map(|m| m.repo_id.as_ref())
            .map(|id| FetchRequest::model(id).with_path("config.json"))
            .collect();

        if requests.is_empty() {
            return Ok(profile);
        }

        let results = self.client.fetch_raw_files(&requests).await;

        for result in results {
            if let FetchResult::Ok { repo_id, data } = result {
                if let Ok(config) = serde_json::from_str::<serde_json::Value>(&data) {
                    profile
                        .training_signals
                        .extend(Self::parse_config_signals(&repo_id, &config));
                    profile.model_configs.insert(repo_id, config);
                }
            }
        }

        Ok(profile)
    }

    /// Parse training signals from a model card (README.md content).
    pub fn parse_training_signals(repo_id: &str, readme: &str) -> Vec<TrainingSignal> {
        let mut signals = Vec::new();
        let lower = readme.to_lowercase();

        // ArXiv citations
        for link in Self::extract_arxiv_links(readme) {
            signals.push(TrainingSignal {
                repo_id: repo_id.to_owned(),
                signal_type: TrainingSignalType::ArxivCitation,
                evidence: link,
            });
        }

        // Training indicators
        let training_patterns: &[(&str, &str)] = &[
            ("trainingarguments", "TrainingArguments usage"),
            ("trainer.train()", "Trainer.train() call"),
            ("learning_rate", "learning_rate parameter"),
            ("num_train_epochs", "num_train_epochs parameter"),
            ("training loss", "training loss reported"),
            ("training procedure", "training procedure documented"),
            ("we trained", "explicit training statement"),
            ("we train ", "explicit training statement"),
            ("trained from scratch", "trained from scratch"),
            ("pre-trained from scratch", "pre-trained from scratch"),
        ];

        for (pattern, evidence) in training_patterns {
            if lower.contains(pattern) {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: if pattern.contains("scratch") {
                        TrainingSignalType::PreTraining
                    } else {
                        TrainingSignalType::TrainingArgs
                    },
                    evidence: evidence.to_string(),
                });
            }
        }

        // Fine-tuning indicators
        let finetune_patterns = [
            "fine-tuned",
            "finetuned",
            "fine tuned",
            "fine-tuning",
            "finetuning",
        ];
        for pattern in &finetune_patterns {
            if lower.contains(pattern) {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::FineTuning,
                    evidence: format!("'{pattern}' mentioned in model card"),
                });
                break;
            }
        }

        // Custom dataset indicators
        let dataset_patterns = [
            "custom dataset",
            "our dataset",
            "proprietary data",
            "in-house data",
            "internal dataset",
            "curated dataset",
            "we collected",
            "we curated",
            "we gathered",
        ];
        for pattern in &dataset_patterns {
            if lower.contains(pattern) {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::CustomDataset,
                    evidence: format!("'{pattern}' in model card"),
                });
                break;
            }
        }

        // Large parameter count detection
        let has_large_params = lower.contains("billion") && lower.contains("param")
            || lower.contains("b parameters")
            || lower.contains("b params");
        if has_large_params {
            signals.push(TrainingSignal {
                repo_id: repo_id.to_owned(),
                signal_type: TrainingSignalType::LargeParamCount,
                evidence: "Large parameter count mentioned".to_string(),
            });
        }

        signals
    }

    /// Parse config.json for architecture signals.
    ///
    /// Detects: custom model_type, MoE routing, NER label schemes,
    /// large context windows, and custom attention patterns.
    pub fn parse_config_signals(
        repo_id: &str,
        config: &serde_json::Value,
    ) -> Vec<TrainingSignal> {
        let mut signals = Vec::new();

        // Custom model_type
        if let Some(model_type) = config.get("model_type").and_then(|v| v.as_str()) {
            let is_standard = STANDARD_MODEL_TYPES
                .iter()
                .any(|&std| model_type.eq_ignore_ascii_case(std));
            if !is_standard {
                let mut evidence = format!("Custom model_type: {model_type}");
                // Enrich with attention pattern details
                if let Some(k) = config.get("linear_conv_kernel_dim").and_then(|v| v.as_u64()) {
                    evidence.push_str(&format!(", hybrid linear+full attention (kernel_dim={k})"));
                }
                if let Some(mode) = config.get("attention_mode").and_then(|v| v.as_str()) {
                    if mode != "eager" {
                        evidence.push_str(&format!(", attention_mode={mode}"));
                    }
                }
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::CustomArchitecture,
                    evidence,
                });
            }
        }

        // MoE architecture
        let expert_keys = ["num_experts", "num_local_experts", "n_routed_experts"];
        for key in expert_keys {
            if let Some(n) = config.get(key).and_then(|v| v.as_u64()) {
                if n > 1 {
                    let active = config
                        .get("num_activated_experts")
                        .or(config.get("num_experts_per_tok"))
                        .and_then(|v| v.as_u64());
                    let evidence = match active {
                        Some(a) => format!("MoE: {n} experts, {a} active per token"),
                        None => format!("MoE: {n} experts"),
                    };
                    signals.push(TrainingSignal {
                        repo_id: repo_id.to_owned(),
                        signal_type: TrainingSignalType::MoEArchitecture,
                        evidence,
                    });
                    break;
                }
            }
        }

        // NER label scheme (BIO tagging)
        if let Some(id2label) = config.get("id2label").and_then(|v| v.as_object()) {
            let labels: Vec<&str> = id2label.values().filter_map(|v| v.as_str()).collect();
            let has_bio = labels.iter().any(|l| l.starts_with("B-") || l.starts_with("I-"));
            if has_bio {
                let mut label_strs: Vec<String> = labels.iter().map(|l| l.to_string()).collect();
                label_strs.sort();
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::NerLabels,
                    evidence: format!("BIO NER: {}", label_strs.join(", ")),
                });
            }
        }

        // Large context window (>= 128K)
        if let Some(ctx) = config
            .get("max_position_embeddings")
            .and_then(|v| v.as_u64())
        {
            if ctx >= 128_000 {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::LargeContext,
                    evidence: format!("{ctx} tokens"),
                });
            }
        }

        // Base model fine-tune detection via _name_or_path
        if let Some(base) = config.get("_name_or_path").and_then(|v| v.as_str()) {
            // If _name_or_path contains a slash (org/model) and differs from repo_id, it's a fine-tune
            if base.contains('/') && base != repo_id {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::FineTuning,
                    evidence: format!("fine-tuned from {base}"),
                });
            }
        }

        signals
    }

    /// Parse file listings for training artifact signals.
    pub fn parse_file_signals(repo_id: &str, siblings: &[SiblingFile]) -> Vec<TrainingSignal> {
        let mut signals = Vec::new();
        let filenames: Vec<&str> = siblings.iter().map(|s| s.filename.as_str()).collect();

        let training_files: &[(&str, TrainingSignalType, &str)] = &[
            (
                "training_args.bin",
                TrainingSignalType::TrainingArgs,
                "training_args.bin present",
            ),
            (
                "trainer_state.json",
                TrainingSignalType::TrainingLogs,
                "trainer_state.json present",
            ),
            (
                "optimizer.pt",
                TrainingSignalType::TrainingArgs,
                "optimizer checkpoint present",
            ),
            (
                "optimizer.safetensors",
                TrainingSignalType::TrainingArgs,
                "optimizer checkpoint present",
            ),
            (
                "scheduler.pt",
                TrainingSignalType::TrainingArgs,
                "scheduler checkpoint present",
            ),
            (
                "runs/",
                TrainingSignalType::TrainingLogs,
                "TensorBoard runs/ directory",
            ),
        ];

        for (file, signal_type, evidence) in training_files {
            if filenames.iter().any(|f| f.contains(file)) {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: *signal_type,
                    evidence: evidence.to_string(),
                });
            }
        }

        signals
    }

    /// Extract arXiv links from text (handles markdown, inline URLs, arXiv:ID notation).
    pub fn extract_arxiv_links(text: &str) -> Vec<String> {
        let mut links = Vec::new();

        // Extract arxiv.org URLs by scanning for the domain, then collecting the
        // full URL (handles markdown `[text](url)`, bare URLs, etc.)
        for prefix in ["arxiv.org/abs/", "arxiv.org/pdf/"] {
            let mut search_from = 0;
            while let Some(pos) = text[search_from..].find(prefix) {
                let abs_pos = search_from + pos;
                // Walk backwards to find "https://" or "http://"
                let url_start = text[..abs_pos]
                    .rfind("https://")
                    .or_else(|| text[..abs_pos].rfind("http://"))
                    .unwrap_or(abs_pos);
                // Walk forwards to end of URL (stop at whitespace, ), ], >, ")
                let url_end = text[abs_pos..]
                    .find(|c: char| c.is_whitespace() || c == ')' || c == ']' || c == '>' || c == '"')
                    .map(|i| abs_pos + i)
                    .unwrap_or(text.len());
                let url = &text[url_start..url_end];
                if url.contains("arxiv.org/") {
                    links.push(url.to_owned());
                }
                search_from = url_end;
            }
        }

        // Also match arXiv:XXXX.XXXXX patterns
        for part in text.split("arXiv:") {
            if part.len() > 4 {
                let id: String = part
                    .chars()
                    .take_while(|c| c.is_ascii_digit() || *c == '.')
                    .collect();
                if id.len() >= 7 && id.contains('.') {
                    links.push(format!("https://arxiv.org/abs/{id}"));
                }
            }
        }

        links.sort();
        links.dedup();
        links
    }

    /// Compute an overall HF depth score (0.0-1.0) from the org profile.
    ///
    /// Weights:
    /// - Model count:              0.10 (saturates at 20)
    /// - Dataset count:            0.10 (saturates at 5)
    /// - ArXiv links:              0.20 (saturates at 5)
    /// - Training signal diversity: 0.20 (saturates at 5 distinct types)
    /// - Pre-training / custom:    0.15 / 0.10
    /// - Architecture diversity:   0.15 (saturates at 4 distinct model_types)
    /// - Release cadence:          0.10 (saturates at 3 distinct year-months)
    pub fn compute_hf_score(profile: &OrgProfile) -> f32 {
        let mut score = 0.0f32;

        // Model count (up to 0.10)
        let model_count = profile.models.len() as f32;
        score += (model_count / 20.0).min(1.0) * 0.10;

        // Dataset count (up to 0.10)
        let dataset_count = profile.datasets.len() as f32;
        score += (dataset_count / 5.0).min(1.0) * 0.10;

        // ArXiv links (up to 0.20)
        let arxiv_count = profile.arxiv_links.len() as f32;
        score += (arxiv_count / 5.0).min(1.0) * 0.20;

        // Training signal diversity (up to 0.20)
        let signal_types: HashSet<_> = profile
            .training_signals
            .iter()
            .map(|s| std::mem::discriminant(&s.signal_type))
            .collect();
        score += (signal_types.len() as f32 / 5.0).min(1.0) * 0.20;

        // Pre-training / custom architecture (up to 0.15)
        let has_pretraining = profile
            .training_signals
            .iter()
            .any(|s| s.signal_type == TrainingSignalType::PreTraining);
        if has_pretraining {
            score += 0.15;
        } else {
            let has_custom = profile
                .training_signals
                .iter()
                .any(|s| s.signal_type == TrainingSignalType::CustomArchitecture);
            if has_custom {
                score += 0.10;
            }
        }

        // Architecture diversity — distinct model_types from config.json (up to 0.15)
        let arch_types: HashSet<&str> = profile
            .model_configs
            .values()
            .filter_map(|c| c.get("model_type").and_then(|v| v.as_str()))
            .collect();
        score += (arch_types.len() as f32 / 4.0).min(1.0) * 0.15;

        // Release cadence — distinct year-months across models (up to 0.10)
        let months: HashSet<&str> = profile
            .models
            .iter()
            .filter_map(|m| m.created_at.as_deref())
            .filter_map(|d| d.get(..7)) // "2025-01" from "2025-01-15T..."
            .collect();
        score += (months.len() as f32 / 3.0).min(1.0) * 0.10;

        score.min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_arxiv_abs() {
        let text = "See https://arxiv.org/abs/2301.12345 for details.";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links, vec!["https://arxiv.org/abs/2301.12345"]);
    }

    #[test]
    fn extract_arxiv_id_notation() {
        let text = "Based on arXiv:2301.12345 and arXiv:2305.67890";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links.len(), 2);
        assert!(links.contains(&"https://arxiv.org/abs/2301.12345".to_owned()));
        assert!(links.contains(&"https://arxiv.org/abs/2305.67890".to_owned()));
    }

    #[test]
    fn extract_arxiv_dedup() {
        let text = "arXiv:2301.12345 and https://arxiv.org/abs/2301.12345";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links.len(), 1);
    }

    #[test]
    fn parse_training_signals_finetuning() {
        let readme = "This model was fine-tuned on a custom dataset using learning_rate=2e-5.";
        let signals = OrgScanner::parse_training_signals("org/model", readme);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::TrainingArgs)); // learning_rate
        assert!(types.contains(&TrainingSignalType::FineTuning)); // fine-tuned
        assert!(types.contains(&TrainingSignalType::CustomDataset)); // custom dataset
    }

    #[test]
    fn parse_training_signals_pretraining() {
        let readme = "We trained from scratch on 1T tokens with 7B parameters.";
        let signals = OrgScanner::parse_training_signals("org/model", readme);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::PreTraining));
    }

    #[test]
    fn parse_config_custom_arch() {
        let config = serde_json::json!({ "model_type": "mamba2" });
        let signals = OrgScanner::parse_config_signals("org/model", &config);
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].signal_type, TrainingSignalType::CustomArchitecture);
    }

    #[test]
    fn parse_config_standard_arch() {
        let config = serde_json::json!({ "model_type": "llama" });
        let signals = OrgScanner::parse_config_signals("org/model", &config);
        assert!(signals.is_empty());
    }

    #[test]
    fn parse_file_signals_training_args() {
        let siblings = vec![
            SiblingFile {
                filename: "config.json".into(),
                size: Some(100),
            },
            SiblingFile {
                filename: "training_args.bin".into(),
                size: Some(5000),
            },
            SiblingFile {
                filename: "trainer_state.json".into(),
                size: Some(2000),
            },
        ];
        let signals = OrgScanner::parse_file_signals("org/model", &siblings);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::TrainingArgs));
        assert!(types.contains(&TrainingSignalType::TrainingLogs));
    }

    #[test]
    fn compute_score_empty() {
        let profile = OrgProfile {
            org_name: "empty".into(),
            models: vec![],
            datasets: vec![],
            spaces: vec![],
            total_downloads: 0,
            libraries_used: vec![],
            pipeline_tags: vec![],
            training_signals: vec![],
            arxiv_links: vec![],
            model_configs: HashMap::new(),
        };
        let score = OrgScanner::compute_hf_score(&profile);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn compute_score_research_heavy() {
        let mut model_configs = HashMap::new();
        model_configs.insert("r/a".into(), serde_json::json!({"model_type": "qwen3_next"}));
        model_configs.insert("r/b".into(), serde_json::json!({"model_type": "glm4_moe_lite"}));
        model_configs.insert("r/c".into(), serde_json::json!({"model_type": "llama"}));
        model_configs.insert("r/d".into(), serde_json::json!({"model_type": "qwen3_moe"}));

        let mut models: Vec<RepoInfo> = (0..25).map(|i| {
            let mut r = make_dummy_repo();
            r.created_at = Some(format!("2025-{:02}-15T00:00:00.000Z", (i % 6) + 1));
            r
        }).collect();
        // Ensure at least 3 distinct months for cadence
        models[0].created_at = Some("2025-01-15T00:00:00.000Z".into());
        models[1].created_at = Some("2025-04-15T00:00:00.000Z".into());
        models[2].created_at = Some("2025-08-15T00:00:00.000Z".into());

        let profile = OrgProfile {
            org_name: "research-lab".into(),
            models,
            datasets: vec![make_dummy_repo(); 10],
            spaces: vec![],
            total_downloads: 1_000_000,
            libraries_used: vec![("transformers".into(), 20)],
            pipeline_tags: vec![("text-generation".into(), 10)],
            training_signals: vec![
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::PreTraining,
                    evidence: "test".into(),
                },
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::CustomArchitecture,
                    evidence: "test".into(),
                },
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::ArxivCitation,
                    evidence: "test".into(),
                },
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::TrainingArgs,
                    evidence: "test".into(),
                },
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::CustomDataset,
                    evidence: "test".into(),
                },
            ],
            arxiv_links: vec![
                "https://arxiv.org/abs/2301.00001".into(),
                "https://arxiv.org/abs/2301.00002".into(),
                "https://arxiv.org/abs/2301.00003".into(),
                "https://arxiv.org/abs/2301.00004".into(),
                "https://arxiv.org/abs/2301.00005".into(),
            ],
            model_configs,
        };
        let score = OrgScanner::compute_hf_score(&profile);
        assert!(score >= 0.95, "research-heavy org should score near 1.0, got {score}");
    }

    #[test]
    fn parse_config_moe() {
        let config = serde_json::json!({
            "model_type": "qwen3_next",
            "num_experts": 512,
            "num_activated_experts": 10
        });
        let signals = OrgScanner::parse_config_signals("diffbot/model", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::CustomArchitecture));
        assert!(types.contains(&TrainingSignalType::MoEArchitecture));
        let moe = signals.iter().find(|s| s.signal_type == TrainingSignalType::MoEArchitecture).unwrap();
        assert!(moe.evidence.contains("512 experts"), "evidence: {}", moe.evidence);
        assert!(moe.evidence.contains("10 active"), "evidence: {}", moe.evidence);
    }

    #[test]
    fn parse_config_ner_labels() {
        let config = serde_json::json!({
            "model_type": "longformer",
            "id2label": {"0": "O", "1": "B-TEAM", "2": "I-TEAM", "3": "B-TECH", "4": "I-TECH"}
        });
        let signals = OrgScanner::parse_config_signals("sumble/ner", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::NerLabels));
        let ner = signals.iter().find(|s| s.signal_type == TrainingSignalType::NerLabels).unwrap();
        assert!(ner.evidence.contains("B-TEAM"), "evidence: {}", ner.evidence);
        assert!(ner.evidence.contains("B-TECH"), "evidence: {}", ner.evidence);
    }

    #[test]
    fn parse_config_large_context() {
        let config = serde_json::json!({
            "model_type": "qwen3_next",
            "max_position_embeddings": 262144
        });
        let signals = OrgScanner::parse_config_signals("diffbot/model", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::CustomArchitecture));
        assert!(types.contains(&TrainingSignalType::LargeContext));
        let ctx = signals.iter().find(|s| s.signal_type == TrainingSignalType::LargeContext).unwrap();
        assert!(ctx.evidence.contains("262144"), "evidence: {}", ctx.evidence);
    }

    #[test]
    fn parse_config_no_moe_for_dense() {
        let config = serde_json::json!({ "model_type": "llama", "num_experts": 1 });
        let signals = OrgScanner::parse_config_signals("org/model", &config);
        assert!(!signals.iter().any(|s| s.signal_type == TrainingSignalType::MoEArchitecture));
    }

    #[test]
    fn compute_score_arch_diversity() {
        let mut configs_single = HashMap::new();
        configs_single.insert("a".into(), serde_json::json!({"model_type": "llama"}));

        let mut configs_diverse = HashMap::new();
        configs_diverse.insert("a".into(), serde_json::json!({"model_type": "qwen3_next"}));
        configs_diverse.insert("b".into(), serde_json::json!({"model_type": "glm4_moe_lite"}));
        configs_diverse.insert("c".into(), serde_json::json!({"model_type": "qwen3_moe"}));
        configs_diverse.insert("d".into(), serde_json::json!({"model_type": "llama"}));

        let base = OrgProfile {
            org_name: "test".into(),
            models: vec![make_dummy_repo(); 5],
            datasets: vec![],
            spaces: vec![],
            total_downloads: 0,
            libraries_used: vec![],
            pipeline_tags: vec![],
            training_signals: vec![],
            arxiv_links: vec![],
            model_configs: HashMap::new(),
        };

        let single = OrgProfile { model_configs: configs_single, ..base.clone() };
        let diverse = OrgProfile { model_configs: configs_diverse, ..base };

        let score_single = OrgScanner::compute_hf_score(&single);
        let score_diverse = OrgScanner::compute_hf_score(&diverse);
        assert!(
            score_diverse > score_single,
            "diverse ({score_diverse}) should beat single ({score_single})"
        );
    }

    #[test]
    fn parse_config_moe_n_routed_experts() {
        // GLM4 (Coder-2602) uses n_routed_experts instead of num_experts
        let config = serde_json::json!({
            "model_type": "glm4_moe_lite",
            "n_routed_experts": 64
        });
        let signals = OrgScanner::parse_config_signals("diffbot/Coder-2602", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::MoEArchitecture));
        let moe = signals.iter().find(|s| s.signal_type == TrainingSignalType::MoEArchitecture).unwrap();
        assert!(moe.evidence.contains("64 experts"), "evidence: {}", moe.evidence);
    }

    #[test]
    fn parse_config_finetune_detection() {
        let config = serde_json::json!({
            "model_type": "llama",
            "_name_or_path": "meta-llama/Llama-3.1-8B-Instruct"
        });
        let signals = OrgScanner::parse_config_signals("diffbot/llama-ft", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(types.contains(&TrainingSignalType::FineTuning));
        let ft = signals.iter().find(|s| s.signal_type == TrainingSignalType::FineTuning).unwrap();
        assert!(ft.evidence.contains("meta-llama/Llama-3.1-8B-Instruct"), "evidence: {}", ft.evidence);
    }

    #[test]
    fn parse_config_no_finetune_for_original() {
        // _name_or_path matches repo_id — not a fine-tune
        let config = serde_json::json!({
            "model_type": "qwen3_next",
            "_name_or_path": "diffbot/Coder-2603"
        });
        let signals = OrgScanner::parse_config_signals("diffbot/Coder-2603", &config);
        let types: Vec<_> = signals.iter().map(|s| s.signal_type).collect();
        assert!(!types.contains(&TrainingSignalType::FineTuning));
    }

    fn make_dummy_repo() -> RepoInfo {
        RepoInfo {
            id: None,
            repo_id: Some("org/model".into()),
            model_id: None,
            author: Some("org".into()),
            sha: None,
            last_modified: None,
            created_at: None,
            tags: None,
            downloads: Some(100),
            likes: Some(10),
            library: None,
            pipeline_tag: None,
            private: None,
            gated: None,
            disabled: None,
            description: None,
            sdk: None,
            siblings: None,
            card_data: None,
            extra: serde_json::Value::Null,
        }
    }
}

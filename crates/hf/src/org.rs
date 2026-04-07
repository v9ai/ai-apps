//! Organization profiling — scan an org's HF presence and detect training signals.

use std::collections::{HashMap, HashSet};

use crate::client::HfClient;
use crate::error::Error;
use crate::types::*;

/// Well-known HF model types (standard architectures that indicate
/// fine-tuning rather than custom training when used as `model_type`).
const STANDARD_MODEL_TYPES: &[&str] = &[
    "bert",
    "roberta",
    "distilbert",
    "albert",
    "gpt2",
    "gpt_neo",
    "gpt_neox",
    "llama",
    "mistral",
    "gemma",
    "phi",
    "qwen2",
    "falcon",
    "mpt",
    "t5",
    "bart",
    "pegasus",
    "marian",
    "whisper",
    "wav2vec2",
    "vit",
    "clip",
    "deit",
    "swin",
    "resnet",
    "convnext",
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
        let expert_keys = ["num_experts", "num_local_experts"];
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
    /// - Model count: 0.15 (saturates at 20)
    /// - Dataset count: 0.15 (saturates at 5)
    /// - ArXiv links: 0.25 (saturates at 5)
    /// - Training signal diversity: 0.25 (saturates at 5 distinct types)
    /// - Pre-training / custom architecture: 0.20 / 0.15
    pub fn compute_hf_score(profile: &OrgProfile) -> f32 {
        let mut score = 0.0f32;

        // Model count signal (more models = more active, up to 0.15)
        let model_count = profile.models.len() as f32;
        score += (model_count / 20.0).min(1.0) * 0.15;

        // Dataset count (publishing datasets = research-oriented, up to 0.15)
        let dataset_count = profile.datasets.len() as f32;
        score += (dataset_count / 5.0).min(1.0) * 0.15;

        // ArXiv links (strong research signal, up to 0.25)
        let arxiv_count = profile.arxiv_links.len() as f32;
        score += (arxiv_count / 5.0).min(1.0) * 0.25;

        // Training signals diversity (up to 0.25)
        let signal_types: HashSet<_> = profile
            .training_signals
            .iter()
            .map(|s| std::mem::discriminant(&s.signal_type))
            .collect();
        score += (signal_types.len() as f32 / 5.0).min(1.0) * 0.25;

        // Pre-training signal (strongest indicator, up to 0.20)
        let has_pretraining = profile
            .training_signals
            .iter()
            .any(|s| s.signal_type == TrainingSignalType::PreTraining);
        if has_pretraining {
            score += 0.20;
        } else {
            // Custom architecture also strong
            let has_custom = profile
                .training_signals
                .iter()
                .any(|s| s.signal_type == TrainingSignalType::CustomArchitecture);
            if has_custom {
                score += 0.15;
            }
        }

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
        };
        let score = OrgScanner::compute_hf_score(&profile);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn compute_score_research_heavy() {
        let profile = OrgProfile {
            org_name: "research-lab".into(),
            models: vec![make_dummy_repo(); 25],
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
        };
        let score = OrgScanner::compute_hf_score(&profile);
        assert!(score >= 0.95, "research-heavy org should score near 1.0, got {score}");
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

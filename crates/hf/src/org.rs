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

        // 6. Per-model maturity assessment
        let model_maturity: Vec<ModelMaturity> = models
            .iter()
            .map(|m| {
                let repo_id = m.repo_id.as_deref().unwrap_or("");
                let readme = cards.get(repo_id).map(|s| s.as_str());
                let siblings = m.siblings.as_deref().unwrap_or(&[]);
                let tags: Vec<String> = m.tags.clone().unwrap_or_default();
                Self::assess_model_maturity(repo_id, m, readme, siblings, &tags)
            })
            .collect();

        // 7. Sales-adjacent signal detection
        let mut sales_signals = Vec::new();
        for (repo_id, card_text) in &cards {
            let tags: Vec<String> = models
                .iter()
                .find(|m| m.repo_id.as_deref() == Some(repo_id.as_str()))
                .and_then(|m| m.tags.clone())
                .unwrap_or_default();
            sales_signals.extend(Self::detect_sales_signals(repo_id, card_text, &tags));
        }
        // Also check repo names/tags for models without card text
        for m in &models {
            if let Some(repo_id) = &m.repo_id {
                if !cards.contains_key(repo_id.as_str()) {
                    let tags = m.tags.clone().unwrap_or_default();
                    sales_signals.extend(Self::detect_sales_signals(repo_id, "", &tags));
                }
            }
        }

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
            model_maturity,
            sales_signals,
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

        // Detect deployment-format files (GGUF, ONNX, MLX) — indicate production usage
        let deployment_extensions: &[(&str, &str)] = &[
            (".gguf", "GGUF quantized model file"),
            (".onnx", "ONNX exported model"),
        ];
        for (ext, evidence) in deployment_extensions {
            if filenames.iter().any(|f| f.ends_with(ext)) {
                signals.push(TrainingSignal {
                    repo_id: repo_id.to_owned(),
                    signal_type: TrainingSignalType::CustomArchitecture,
                    evidence: evidence.to_string(),
                });
            }
        }
        // MLX-converted models (filenames like mlx_model.safetensors, mlx_lm/)
        if filenames.iter().any(|f| f.starts_with("mlx") || f.contains("/mlx")) {
            signals.push(TrainingSignal {
                repo_id: repo_id.to_owned(),
                signal_type: TrainingSignalType::CustomArchitecture,
                evidence: "MLX-converted model files".to_string(),
            });
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
                    // Ensure URL has a protocol prefix
                    if url.starts_with("http://") || url.starts_with("https://") {
                        links.push(url.to_owned());
                    } else {
                        links.push(format!("https://{url}"));
                    }
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

    // ── Sales signal detection ───────────────────────────────────

    /// Detect sales-adjacent signals from README text, tags, and repo name.
    pub fn detect_sales_signals(
        repo_id: &str,
        readme: &str,
        tags: &[String],
    ) -> Vec<SalesSignal> {
        let mut signals = Vec::new();
        let lower = readme.to_lowercase();
        let repo_lower = repo_id.to_lowercase();
        let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();

        // Combine all text sources for scanning
        let all_text = format!("{lower} {repo_lower} {}", tags_lower.join(" "));

        // (patterns, category, evidence_label)
        let rules: &[(&[&str], SalesCategory, &str)] = &[
            // Email outreach
            (
                &["sales email", "email_sales", "outreach email", "cold email", "email personali"],
                SalesCategory::EmailOutreach,
                "sales email / outreach",
            ),
            // Sales conversation
            (
                &["sales conversation", "sales-conversation", "call coaching", "objection handl", "sales call", "conversation intelligence"],
                SalesCategory::SalesConversation,
                "sales conversation / coaching",
            ),
            // Forecasting
            (
                &["sales forecast", "revenue predict", "pipeline forecast", "deal predict", "revenue intelligence"],
                SalesCategory::Forecasting,
                "sales/revenue forecasting",
            ),
            // Intent scoring
            (
                &["intent signal", "intent-signal", "intent scoring", "intent classif", "b2b intent", "buyer intent", "lead scor"],
                SalesCategory::IntentScoring,
                "intent / lead scoring",
            ),
            // Enrichment
            (
                &["contact enrichment", "company enrichment", "lead enrichment", "technographic", "firmographic"],
                SalesCategory::Enrichment,
                "data enrichment / technographic",
            ),
            // Lead classification
            (
                &["lead classif", "company classif", "prospect classif", "lead generation", "lead-gen", "lead gen"],
                SalesCategory::LeadClassification,
                "lead / company classification",
            ),
            // CRM
            (
                &["crm intellig", "deal insight", "pipeline analyt", "revenue analyt"],
                SalesCategory::CrmIntelligence,
                "CRM / revenue analytics",
            ),
            // General sales mention (exclude "salesforce" — they publish general AI
            // research, not sales-specific models; only flag smaller sales platforms)
            (
                &["hubspot", "gong.io", "outreach.io", "apollo.io", "6sense", "zoominfo", "clearbit", "lusha"],
                SalesCategory::General,
                "sales platform brand",
            ),
        ];

        for (patterns, category, label) in rules {
            if patterns.iter().any(|p| all_text.contains(p)) {
                signals.push(SalesSignal {
                    repo_id: repo_id.to_owned(),
                    category: *category,
                    evidence: label.to_string(),
                });
            }
        }

        signals
    }

    // ── Model maturity assessment ─────────────────────────────────

    /// Detect boilerplate ratio in a model card README.
    /// Returns 0.0 (real content) to 1.0 (fully auto-generated placeholder).
    pub fn detect_boilerplate(readme: &str) -> f32 {
        let placeholder_count = readme.matches("[More Information Needed]").count();
        if placeholder_count == 0 {
            return 0.0;
        }
        // Count headings as a proxy for total sections
        let section_count = readme
            .lines()
            .filter(|l| l.starts_with('#'))
            .count()
            .max(1);
        (placeholder_count as f32 / section_count as f32).min(1.0)
    }

    /// Detect cookbook / template training tools from README text and tags.
    pub fn detect_cookbook_recipe(readme: &str, tags: &[String]) -> Option<String> {
        let lower = readme.to_lowercase();

        let recipes: &[(&[&str], &[&str], &str)] = &[
            (
                &["llamafactory", "llama-factory", "llama_factory"],
                &["llama-factory"],
                "LlamaFactory",
            ),
            (&["autotrain"], &["autotrain"], "AutoTrain"),
            (&["axolotl"], &["axolotl"], "Axolotl"),
            (&["unsloth"], &["unsloth"], "Unsloth"),
            (&["mergekit"], &["mergekit", "merge"], "MergeKit"),
            // TRL is HuggingFace's alignment toolkit — used for quick KTO/DPO/PPO recipes
            (&[], &["trl"], "TRL"),
        ];

        for (readme_pats, tag_pats, name) in recipes {
            if readme_pats.iter().any(|p| lower.contains(p)) {
                return Some(name.to_string());
            }
            if tag_pats
                .iter()
                .any(|tp| tags.iter().any(|t| t.contains(tp)))
            {
                return Some(name.to_string());
            }
        }
        None
    }

    /// Detect well-known generic public datasets used for training.
    /// Checks README text, cardData.datasets, and repo_id (repo names often encode the dataset).
    /// Returns the dataset name if found, None if training data appears custom.
    pub fn detect_generic_dataset(
        readme: &str,
        card_data: Option<&serde_json::Value>,
        repo_id: &str,
    ) -> Option<String> {
        let generic_datasets = [
            ("ultrafeedback", "UltraFeedback"),
            ("alpaca", "Alpaca"),
            ("open-orca", "OpenOrca"),
            ("slimorca", "SlimOrca"),
            ("oasst", "OASST"),
            ("sharegpt", "ShareGPT"),
            ("dolly", "Dolly"),
            ("wizardlm", "WizardLM"),
            ("openhermes", "OpenHermes"),
            ("capybara", "Capybara"),
            ("orca-math", "OrcaMath"),
            ("lima", "LIMA"),
        ];

        // Check README text
        let lower = readme.to_lowercase();
        for (pattern, name) in &generic_datasets {
            if lower.contains(pattern) {
                return Some(name.to_string());
            }
        }

        // Check cardData.datasets YAML field
        if let Some(cd) = card_data {
            if let Some(datasets) = cd.get("datasets").and_then(|v| v.as_array()) {
                for ds in datasets {
                    if let Some(ds_str) = ds.as_str() {
                        let ds_lower = ds_str.to_lowercase();
                        for (pattern, name) in &generic_datasets {
                            if ds_lower.contains(pattern) {
                                return Some(name.to_string());
                            }
                        }
                    }
                }
            }
        }

        // Check repo_id — names like "org/llama3-ultrafeedback-kto" encode the dataset
        let repo_lower = repo_id.to_lowercase();
        for (pattern, name) in &generic_datasets {
            if repo_lower.contains(pattern) {
                return Some(name.to_string());
            }
        }

        None
    }

    /// Check if a model repo contains LoRA / PEFT adapter files.
    pub fn has_lora_adapter(siblings: &[SiblingFile]) -> bool {
        siblings.iter().any(|f| {
            f.filename == "adapter_config.json"
                || f.filename == "adapter_model.safetensors"
                || f.filename == "adapter_model.bin"
        })
    }

    /// Detect alignment method from tags and README.
    /// Returns method name (KTO, DPO, RLHF, SFT, PPO) if detected.
    pub fn detect_alignment_method(readme: &str, tags: &[String]) -> Option<String> {
        let lower = readme.to_lowercase();

        // Check tags first (more reliable than README text)
        let tag_methods = [
            ("kto", "KTO"),
            ("dpo", "DPO"),
            ("rlhf", "RLHF"),
            ("sft", "SFT"),
            ("ppo", "PPO"),
            ("orpo", "ORPO"),
            ("simpo", "SimPO"),
        ];
        for (tag_pat, name) in &tag_methods {
            if tags.iter().any(|t| t.eq_ignore_ascii_case(tag_pat)) {
                return Some(name.to_string());
            }
        }

        // Check README text for alignment method mentions
        let text_methods = [
            ("kahneman-tversky", "KTO"),
            (" kto ", "KTO"),
            ("kto-aligned", "KTO"),
            ("direct preference optimization", "DPO"),
            (" dpo ", "DPO"),
            ("dpo-trained", "DPO"),
            ("reinforcement learning from human feedback", "RLHF"),
            (" rlhf ", "RLHF"),
            ("supervised fine-tun", "SFT"),
            (" sft ", "SFT"),
            ("proximal policy optimization", "PPO"),
            (" ppo ", "PPO"),
            (" orpo ", "ORPO"),
        ];
        for (pattern, name) in &text_methods {
            if lower.contains(pattern) {
                return Some(name.to_string());
            }
        }

        None
    }

    /// Detect arXiv citations that are likely auto-added by training frameworks
    /// rather than genuine research citations.
    /// Known auto-added papers:
    /// - 1910.09700 = Sentence-BERT (auto-added by LlamaFactory as citation template)
    /// - 2305.18290 = QLoRA (auto-added by some LoRA tools)
    pub fn detect_auto_arxiv(readme: &str) -> bool {
        // Known framework-default arXiv IDs
        const AUTO_ARXIV_IDS: &[&str] = &[
            "1910.09700", // Sentence-BERT — LlamaFactory default citation
            "2305.18290", // QLoRA — auto-added by QLoRA tools
        ];

        let lower = readme.to_lowercase();

        for id in AUTO_ARXIV_IDS {
            if lower.contains(id) {
                // Check if this is the ONLY arxiv reference — if there are others,
                // the auto-added one is less concerning
                let all_arxiv = Self::extract_arxiv_links(readme);
                if all_arxiv.len() <= 1 {
                    return true;
                }
            }
        }
        false
    }

    /// Assess a single model's maturity / seriousness level.
    pub fn assess_model_maturity(
        repo_id: &str,
        repo: &RepoInfo,
        readme: Option<&str>,
        siblings: &[SiblingFile],
        tags: &[String],
    ) -> ModelMaturity {
        let downloads = repo.downloads.unwrap_or(0);
        let boilerplate_ratio = readme.map(Self::detect_boilerplate).unwrap_or(0.0);
        let cookbook_tool = readme
            .map(|r| Self::detect_cookbook_recipe(r, tags))
            .unwrap_or(None);
        let generic_dataset = readme
            .map(|r| Self::detect_generic_dataset(r, repo.card_data.as_ref(), repo_id))
            .unwrap_or_else(|| Self::detect_generic_dataset("", repo.card_data.as_ref(), repo_id));
        let has_lora = Self::has_lora_adapter(siblings);
        let alignment_method = readme
            .map(|r| Self::detect_alignment_method(r, tags))
            .unwrap_or(None);
        let has_auto_arxiv = readme.is_some_and(Self::detect_auto_arxiv);

        // Check if model was updated after creation (compare created_at vs last_modified)
        let updated_after_creation = match (&repo.created_at, &repo.last_modified) {
            (Some(created), Some(modified)) => {
                // Compare first 10 chars (date portion) — if different day, it was updated
                let c = created.get(..10).unwrap_or("");
                let m = modified.get(..10).unwrap_or("");
                !c.is_empty() && !m.is_empty() && c != m
            }
            _ => false,
        };

        // Determine effort level from combined signals
        let effort_level = Self::classify_effort(
            downloads,
            boilerplate_ratio,
            cookbook_tool.is_some(),
            generic_dataset.is_some(),
            updated_after_creation,
            readme,
        );

        ModelMaturity {
            repo_id: repo_id.to_owned(),
            downloads,
            boilerplate_ratio,
            cookbook_tool,
            generic_dataset,
            alignment_method,
            has_lora_adapter: has_lora,
            has_auto_arxiv,
            updated_after_creation,
            effort_level,
        }
    }

    /// Classify effort level from maturity signals.
    fn classify_effort(
        downloads: u64,
        boilerplate_ratio: f32,
        is_cookbook: bool,
        is_generic_dataset: bool,
        updated: bool,
        readme: Option<&str>,
    ) -> EffortLevel {
        // Trivial: boilerplate README + zero downloads + no iteration
        if boilerplate_ratio > 0.5 && downloads == 0 && !updated {
            return EffortLevel::Trivial;
        }

        // Experiment: cookbook recipe + generic dataset + low downloads
        if is_cookbook && is_generic_dataset && downloads < 100 {
            return EffortLevel::Experiment;
        }

        // Experiment: boilerplate + cookbook, even with some downloads
        if boilerplate_ratio > 0.5 && is_cookbook {
            return EffortLevel::Experiment;
        }

        // Check for real documentation effort
        let has_real_docs = readme.is_some_and(|r| {
            let lower = r.to_lowercase();
            // Look for substantive content beyond boilerplate
            (lower.contains("we trained")
                || lower.contains("we fine-tuned")
                || lower.contains("training procedure")
                || lower.contains("evaluation")
                    && lower.contains("results"))
                && boilerplate_ratio < 0.3
        });

        // Production: high downloads + documentation + iteration
        if downloads >= 1000 && has_real_docs && updated {
            return EffortLevel::Production;
        }

        // Research: real documentation + custom data or novel approach
        if has_real_docs && !is_generic_dataset {
            return EffortLevel::Research;
        }

        // Moderate: some positive signals but not fully polished
        if downloads >= 100 || (updated && !is_cookbook) || (has_real_docs && is_generic_dataset) {
            return EffortLevel::Moderate;
        }

        // Default: experiment
        EffortLevel::Experiment
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

        // ── Maturity penalty ────────────────────────────────────────
        // Discount the score when models are low-effort experiments.
        if !profile.model_maturity.is_empty() {
            let maturity_scores: Vec<f32> = profile
                .model_maturity
                .iter()
                .map(|m| match m.effort_level {
                    EffortLevel::Production => 1.0,
                    EffortLevel::Research => 0.85,
                    EffortLevel::Moderate => 0.7,
                    EffortLevel::Experiment => 0.35,
                    EffortLevel::Trivial => 0.15,
                })
                .collect();
            let avg_maturity =
                maturity_scores.iter().sum::<f32>() / maturity_scores.len() as f32;
            // Apply as a multiplier: a fully trivial org gets ~15% of raw score
            score *= avg_maturity;
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
    fn extract_arxiv_without_protocol() {
        // Regression: bare "arxiv.org/abs/..." without https:// should get protocol added
        let text = "See the arxiv.org/abs/2301.12345 paper for details.";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0], "https://arxiv.org/abs/2301.12345");
    }

    #[test]
    fn extract_arxiv_pdf_link() {
        let text = "Download at https://arxiv.org/pdf/2301.12345";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links.len(), 1);
        assert!(links[0].contains("arxiv.org/pdf/2301.12345"));
    }

    #[test]
    fn extract_arxiv_markdown_link() {
        let text = "Based on [this paper](https://arxiv.org/abs/2401.54321) and others.";
        let links = OrgScanner::extract_arxiv_links(text);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0], "https://arxiv.org/abs/2401.54321");
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
            model_maturity: vec![],
            sales_signals: vec![],
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
            model_maturity: vec![], // no maturity data → no penalty
            sales_signals: vec![],
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
            model_maturity: vec![],
            sales_signals: vec![],
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

    // ── Boilerplate detection tests ────────────────────────────────

    #[test]
    fn detect_boilerplate_full() {
        let readme = r#"# Model Card for Model ID

## Model Details

### Model Description

- **Developed by:** [More Information Needed]
- **Funded by:** [More Information Needed]
- **Model type:** [More Information Needed]
- **Language(s):** [More Information Needed]
- **License:** [More Information Needed]
- **Finetuned from model:** [More Information Needed]

## Uses

### Direct Use

[More Information Needed]

### Out-of-Scope Use

[More Information Needed]

## Training Details

### Training Data

[More Information Needed]

### Training Procedure

[More Information Needed]

## Evaluation

[More Information Needed]
"#;
        let ratio = OrgScanner::detect_boilerplate(readme);
        assert!(ratio > 0.5, "fully boilerplate card should have high ratio, got {ratio}");
    }

    #[test]
    fn detect_boilerplate_none() {
        let readme = "# My Custom Model\n\nWe trained this model on our proprietary sales dataset.\n\n## Results\n\nAccuracy: 92.3%\n";
        let ratio = OrgScanner::detect_boilerplate(readme);
        assert_eq!(ratio, 0.0, "real content should have 0 boilerplate ratio");
    }

    // ── Cookbook recipe detection tests ──────────────────────────────

    #[test]
    fn detect_cookbook_llamafactory() {
        let readme = "Built with LlamaFactory using KTO alignment.";
        let tags = vec![];
        assert_eq!(
            OrgScanner::detect_cookbook_recipe(readme, &tags),
            Some("LlamaFactory".into())
        );
    }

    #[test]
    fn detect_cookbook_from_tags() {
        let readme = "A fine-tuned model.";
        let tags = vec!["text-generation".into(), "unsloth".into()];
        assert_eq!(
            OrgScanner::detect_cookbook_recipe(readme, &tags),
            Some("Unsloth".into())
        );
    }

    #[test]
    fn detect_cookbook_none() {
        let readme = "We trained this model with a custom training loop.";
        let tags = vec!["text-generation".into()];
        assert_eq!(OrgScanner::detect_cookbook_recipe(readme, &tags), None);
    }

    // ── Generic dataset detection tests ─────────────────────────────

    #[test]
    fn detect_generic_dataset_ultrafeedback() {
        let readme = "Trained on UltraFeedback preference data with KTO.";
        assert_eq!(
            OrgScanner::detect_generic_dataset(readme, None, "org/model"),
            Some("UltraFeedback".into())
        );
    }

    #[test]
    fn detect_generic_dataset_from_card_data() {
        let readme = "A fine-tuned model.";
        let card_data = serde_json::json!({"datasets": ["argilla/ultrafeedback-binarized"]});
        assert_eq!(
            OrgScanner::detect_generic_dataset(readme, Some(&card_data), "org/model"),
            Some("UltraFeedback".into())
        );
    }

    #[test]
    fn detect_generic_dataset_from_repo_name() {
        let readme = "# Model Card\n\n[More Information Needed]\n";
        assert_eq!(
            OrgScanner::detect_generic_dataset(readme, None, "acme-ai/llama3-8b-instruct-ultrafeedback-kto"),
            Some("UltraFeedback".into())
        );
    }

    #[test]
    fn detect_generic_dataset_custom() {
        let readme = "Trained on our proprietary sales conversation dataset.";
        assert_eq!(OrgScanner::detect_generic_dataset(readme, None, "org/custom-model"), None);
    }

    // ── LoRA adapter detection tests ────────────────────────────────

    #[test]
    fn detect_lora_present() {
        let siblings = vec![
            SiblingFile { filename: "config.json".into(), size: Some(100) },
            SiblingFile { filename: "adapter_config.json".into(), size: Some(500) },
            SiblingFile { filename: "adapter_model.safetensors".into(), size: Some(1000) },
        ];
        assert!(OrgScanner::has_lora_adapter(&siblings));
    }

    #[test]
    fn detect_lora_absent() {
        let siblings = vec![
            SiblingFile { filename: "config.json".into(), size: Some(100) },
            SiblingFile { filename: "model.safetensors".into(), size: Some(16_000_000_000) },
        ];
        assert!(!OrgScanner::has_lora_adapter(&siblings));
    }

    // ── Effort level classification tests ───────────────────────────

    #[test]
    fn effort_trivial_boilerplate_zero_downloads() {
        let mut repo = make_dummy_repo();
        repo.downloads = Some(0);
        repo.created_at = Some("2024-06-21T00:00:00.000Z".into());
        repo.last_modified = Some("2024-06-21T00:00:00.000Z".into());

        let readme = "# Model Card\n\n- **Developed by:** [More Information Needed]\n- **Model type:** [More Information Needed]\n## Uses\n[More Information Needed]\n## Training\n[More Information Needed]\n";
        let maturity = OrgScanner::assess_model_maturity(
            "acme-ai/model",
            &repo,
            Some(readme),
            &[],
            &[],
        );
        assert_eq!(maturity.effort_level, EffortLevel::Trivial);
        assert!(maturity.boilerplate_ratio > 0.5);
        assert_eq!(maturity.downloads, 0);
    }

    #[test]
    fn effort_experiment_cookbook_generic() {
        let mut repo = make_dummy_repo();
        repo.downloads = Some(5);
        repo.created_at = Some("2024-06-21T00:00:00.000Z".into());
        repo.last_modified = Some("2024-06-22T00:00:00.000Z".into());

        let readme = "Fine-tuned with LlamaFactory on UltraFeedback.";
        let maturity = OrgScanner::assess_model_maturity(
            "org/model",
            &repo,
            Some(readme),
            &[],
            &[],
        );
        assert_eq!(maturity.effort_level, EffortLevel::Experiment);
        assert_eq!(maturity.cookbook_tool.as_deref(), Some("LlamaFactory"));
        assert_eq!(maturity.generic_dataset.as_deref(), Some("UltraFeedback"));
    }

    #[test]
    fn effort_production_high_downloads_docs_iteration() {
        let mut repo = make_dummy_repo();
        repo.downloads = Some(50_000);
        repo.created_at = Some("2024-01-15T00:00:00.000Z".into());
        repo.last_modified = Some("2024-06-22T00:00:00.000Z".into());

        let readme = "# Our Sales Model\n\nWe trained this model on our proprietary dataset.\n\n## Evaluation\n\nExtensive results on held-out test set.\n";
        let maturity = OrgScanner::assess_model_maturity(
            "org/model",
            &repo,
            Some(readme),
            &[],
            &[],
        );
        assert_eq!(maturity.effort_level, EffortLevel::Production);
        assert!(maturity.updated_after_creation);
    }

    // ── Score with maturity penalty test ─────────────────────────────

    #[test]
    fn compute_score_penalizes_trivial_models() {
        let base = OrgProfile {
            org_name: "experiment-org".into(),
            models: vec![make_dummy_repo()],
            datasets: vec![],
            spaces: vec![],
            total_downloads: 0,
            libraries_used: vec![],
            pipeline_tags: vec![],
            training_signals: vec![
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::FineTuning,
                    evidence: "fine-tuned mentioned".into(),
                },
                TrainingSignal {
                    repo_id: "r".into(),
                    signal_type: TrainingSignalType::ArxivCitation,
                    evidence: "https://arxiv.org/abs/1910.09700".into(),
                },
            ],
            arxiv_links: vec!["https://arxiv.org/abs/1910.09700".into()],
            model_configs: HashMap::new(),
            model_maturity: vec![], // no maturity → no penalty (baseline)
            sales_signals: vec![],
        };

        let with_trivial = OrgProfile {
            model_maturity: vec![ModelMaturity {
                repo_id: "r".into(),
                downloads: 0,
                boilerplate_ratio: 0.8,
                cookbook_tool: Some("LlamaFactory".into()),
                generic_dataset: Some("UltraFeedback".into()),
                alignment_method: Some("KTO".into()),
                has_lora_adapter: false,
                has_auto_arxiv: true,
                updated_after_creation: false,
                effort_level: EffortLevel::Trivial,
            }],
            ..base.clone()
        };

        let score_base = OrgScanner::compute_hf_score(&base);
        let score_trivial = OrgScanner::compute_hf_score(&with_trivial);

        assert!(
            score_trivial < score_base * 0.3,
            "trivial maturity should heavily penalize score: base={score_base}, trivial={score_trivial}"
        );
    }

    #[test]
    fn trivial_cookbook_scenario() {
        // Simulate a trivial cookbook model:
        // 1 model, 0 downloads, boilerplate README, LlamaFactory+KTO+UltraFeedback
        let mut repo = make_dummy_repo();
        repo.downloads = Some(0);
        repo.likes = Some(0);
        repo.repo_id = Some("acme-ai/llama3-8b-instruct-ultrafeedback-kto".into());
        repo.created_at = Some("2024-06-21T00:00:00.000Z".into());
        repo.last_modified = Some("2024-06-21T00:00:00.000Z".into());

        let boilerplate_readme = r#"---
library_name: transformers
tags:
- trl
- kto
---

# Model Card for Model ID

## Model Details

### Model Description

- **Developed by:** [More Information Needed]
- **Funded by [optional]:** [More Information Needed]
- **Shared by [optional]:** [More Information Needed]
- **Model type:** [More Information Needed]
- **Language(s) (NLP):** [More Information Needed]
- **License:** [More Information Needed]
- **Finetuned from model [optional]:** [More Information Needed]

## Uses

[More Information Needed]

## Training Details

[More Information Needed]

## Evaluation

[More Information Needed]

## Citation

@misc{reimers2019sentencebert,
    title={Sentence-BERT},
    author={Nils Reimers and Iryna Gurevych},
    year={2019},
    eprint={1910.09700},
}
"#;

        let maturity = OrgScanner::assess_model_maturity(
            "acme-ai/llama3-8b-instruct-ultrafeedback-kto",
            &repo,
            Some(boilerplate_readme),
            &[],
            &["trl".into(), "kto".into()],
        );

        assert_eq!(maturity.effort_level, EffortLevel::Trivial,
            "Trivial cookbook model should be classified as Trivial, got {:?}", maturity.effort_level);
        assert!(maturity.boilerplate_ratio > 0.5);
        assert_eq!(maturity.downloads, 0);
        assert_eq!(maturity.generic_dataset.as_deref(), Some("UltraFeedback"));
        assert_eq!(maturity.alignment_method.as_deref(), Some("KTO"));
        assert_eq!(maturity.cookbook_tool.as_deref(), Some("TRL"));
        assert!(maturity.has_auto_arxiv, "Sentence-BERT citation should be detected as auto-added");
        assert!(!maturity.updated_after_creation);
    }

    // ── Alignment method detection tests ────────────────────────────

    #[test]
    fn detect_alignment_kto_from_tags() {
        let tags = vec!["trl".into(), "kto".into()];
        assert_eq!(OrgScanner::detect_alignment_method("", &tags), Some("KTO".into()));
    }

    #[test]
    fn detect_alignment_dpo_from_readme() {
        let readme = "This model was trained with DPO on preference data.";
        assert_eq!(OrgScanner::detect_alignment_method(readme, &[]), Some("DPO".into()));
    }

    #[test]
    fn detect_alignment_none() {
        let readme = "A standard fine-tuned model.";
        assert_eq!(OrgScanner::detect_alignment_method(readme, &[]), None);
    }

    // ── Auto-arXiv detection tests ──────────────────────────────────

    #[test]
    fn detect_auto_arxiv_sentence_bert() {
        let readme = "@misc{reimers2019sentencebert,\n    eprint={1910.09700},\n}";
        assert!(OrgScanner::detect_auto_arxiv(readme));
    }

    #[test]
    fn detect_auto_arxiv_not_when_other_citations() {
        let readme = "arXiv:1910.09700 and also https://arxiv.org/abs/2401.12345 (our paper)";
        assert!(!OrgScanner::detect_auto_arxiv(readme), "should not flag when other real citations exist");
    }

    #[test]
    fn detect_auto_arxiv_none() {
        let readme = "arXiv:2401.54321 — our novel contribution.";
        assert!(!OrgScanner::detect_auto_arxiv(readme));
    }

    // ── TRL cookbook detection ───────────────────────────────────────

    #[test]
    fn detect_cookbook_trl_from_tags() {
        let readme = "";
        let tags = vec!["trl".into(), "kto".into()];
        assert_eq!(OrgScanner::detect_cookbook_recipe(readme, &tags), Some("TRL".into()));
    }

    // ── Sales signal detection tests ──────────────────────────────

    #[test]
    fn sales_email_outreach_from_repo_name() {
        let signals = OrgScanner::detect_sales_signals("potbelly/email_sales", "", &[]);
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].category, SalesCategory::EmailOutreach);
    }

    #[test]
    fn sales_conversation_from_readme() {
        let readme = "This model was fine-tuned for sales conversation coaching.";
        let signals = OrgScanner::detect_sales_signals("org/model", readme, &[]);
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].category, SalesCategory::SalesConversation);
    }

    #[test]
    fn sales_intent_scoring() {
        let signals = OrgScanner::detect_sales_signals(
            "SrihariV/b2b-intent-signal-classifier",
            "B2B intent signal classification model.",
            &["text-classification".into()],
        );
        assert!(signals.iter().any(|s| s.category == SalesCategory::IntentScoring));
    }

    #[test]
    fn sales_enrichment_technographic() {
        let readme = "NER model for technographic intelligence from job postings.";
        let signals = OrgScanner::detect_sales_signals("sumble/ner-model", readme, &[]);
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].category, SalesCategory::Enrichment);
    }

    #[test]
    fn sales_general_from_platform_brand() {
        let signals = OrgScanner::detect_sales_signals("hubspot/some-model", "", &[]);
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].category, SalesCategory::General);
    }

    #[test]
    fn sales_forecasting_from_tags() {
        let signals = OrgScanner::detect_sales_signals(
            "org/model",
            "",
            &["sales forecasting".into()],
        );
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].category, SalesCategory::Forecasting);
    }

    #[test]
    fn no_sales_signal_for_generic_model() {
        let readme = "We trained a BERT model on Wikipedia for NER.";
        let signals = OrgScanner::detect_sales_signals("org/bert-ner", readme, &["ner".into()]);
        assert!(signals.is_empty());
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

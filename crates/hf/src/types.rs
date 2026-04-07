use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RepoType {
    Model,
    Dataset,
    Space,
}

impl RepoType {
    pub fn api_prefix(&self) -> &'static str {
        match self {
            Self::Model => "models",
            Self::Dataset => "datasets",
            Self::Space => "spaces",
        }
    }

    /// URL prefix for raw file access via `huggingface.co/{prefix}/{repo}/resolve/...`.
    /// Models are served at the root (`/{repo}`), datasets at `/datasets/{repo}`,
    /// spaces at `/spaces/{repo}`.
    pub fn raw_prefix(&self) -> &'static str {
        match self {
            Self::Model => "",
            Self::Dataset => "datasets",
            Self::Space => "spaces",
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Model => "model",
            Self::Dataset => "dataset",
            Self::Space => "space",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "model" => Some(Self::Model),
            "dataset" => Some(Self::Dataset),
            "space" => Some(Self::Space),
            _ => None,
        }
    }
}

/// Options for listing repos from the HF Hub API.
#[derive(Debug, Clone)]
pub struct ListOptions {
    pub repo_type: RepoType,
    /// Sort field: "downloads", "likes", "trending", "created"
    pub sort: String,
    /// "-1" for descending, "1" for ascending
    pub direction: String,
    /// Items per page (max 100)
    pub limit: usize,
    /// Max pages to fetch (0 = all until empty)
    pub max_pages: usize,
    /// Request full metadata (siblings, cardData, etc.)
    pub full: bool,
    /// Text search filter (matched against repo id, tags, etc.)
    pub search: Option<String>,
    /// Filter by author / organization
    pub author: Option<String>,
    /// Tag-based filters (e.g. `["task:text-generation", "language:en"]`)
    pub filter: Option<Vec<String>>,
    /// Filter by pipeline tag (e.g. "text-generation")
    pub pipeline_tag_filter: Option<String>,
    /// Filter by library (e.g. "transformers", "pytorch")
    pub library_filter: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FetchRequest {
    pub repo_id: String,
    pub repo_type: RepoType,
    pub path: Option<String>,
    pub revision: Option<String>,
}

impl FetchRequest {
    pub fn model(repo_id: impl Into<String>) -> Self {
        Self { repo_id: repo_id.into(), repo_type: RepoType::Model, path: None, revision: None }
    }

    pub fn dataset(repo_id: impl Into<String>) -> Self {
        Self { repo_id: repo_id.into(), repo_type: RepoType::Dataset, path: None, revision: None }
    }

    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn with_revision(mut self, rev: impl Into<String>) -> Self {
        self.revision = Some(rev.into());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoInfo {
    #[serde(rename = "_id")]
    pub id: Option<String>,
    /// The slug (`org/name`). `"id"` in listing responses.
    #[serde(rename = "id")]
    pub repo_id: Option<String>,
    /// Internal HF model identifier. Present in listing alongside `id`.
    #[serde(rename = "modelId")]
    pub model_id: Option<String>,
    pub author: Option<String>,
    pub sha: Option<String>,
    #[serde(rename = "lastModified")]
    pub last_modified: Option<String>,
    pub tags: Option<Vec<String>>,
    pub downloads: Option<u64>,
    pub likes: Option<u64>,
    #[serde(rename = "library_name")]
    pub library: Option<String>,
    #[serde(rename = "pipeline_tag")]
    pub pipeline_tag: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    pub private: Option<bool>,
    pub gated: Option<serde_json::Value>,
    pub disabled: Option<bool>,
    pub description: Option<String>,
    /// Spaces SDK (gradio, streamlit, docker, static)
    pub sdk: Option<String>,
    /// Files in the repo (only with `full=true`)
    pub siblings: Option<Vec<SiblingFile>>,
    /// Parsed YAML frontmatter from README (only with `full=true`)
    #[serde(rename = "cardData")]
    pub card_data: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiblingFile {
    #[serde(rename = "rfilename")]
    pub filename: String,
    pub size: Option<u64>,
}

#[derive(Debug)]
pub enum FetchResult<T> {
    Ok { repo_id: String, data: T },
    Err { repo_id: String, error: crate::Error },
}

impl<T> FetchResult<T> {
    pub fn is_ok(&self) -> bool {
        matches!(self, Self::Ok { .. })
    }
}

// ── Organization profiling types ──────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgProfile {
    pub org_name: String,
    pub models: Vec<RepoInfo>,
    pub datasets: Vec<RepoInfo>,
    pub spaces: Vec<RepoInfo>,
    pub total_downloads: u64,
    pub libraries_used: Vec<(String, usize)>,
    pub pipeline_tags: Vec<(String, usize)>,
    pub training_signals: Vec<TrainingSignal>,
    pub arxiv_links: Vec<String>,
    /// Raw config.json per model (repo_id → parsed JSON). Populated by `scan_org_deep`.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub model_configs: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingSignal {
    pub repo_id: String,
    pub signal_type: TrainingSignalType,
    pub evidence: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrainingSignalType {
    CustomArchitecture,
    TrainingLogs,
    TrainingArgs,
    CustomDataset,
    ArxivCitation,
    LargeParamCount,
    PreTraining,
    FineTuning,
    MoEArchitecture,
    NerLabels,
    LargeContext,
}

/// Per-model maturity assessment — distinguishes serious ML from one-afternoon experiments.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMaturity {
    pub repo_id: String,
    pub downloads: u64,
    /// 0.0 = real content, 1.0 = fully auto-generated placeholder card.
    pub boilerplate_ratio: f32,
    /// Detected cookbook/template tool (LlamaFactory, AutoTrain, Axolotl, etc.)
    pub cookbook_tool: Option<String>,
    /// Well-known generic public dataset used for training (UltraFeedback, Alpaca, etc.)
    pub generic_dataset: Option<String>,
    /// Whether the model is a LoRA/PEFT adapter (lighter than full fine-tune).
    pub has_lora_adapter: bool,
    /// Whether the model was updated after initial creation.
    pub updated_after_creation: bool,
    /// Overall assessment.
    pub effort_level: EffortLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EffortLevel {
    /// Serious production ML: custom data, iteration, documentation, adoption.
    Production,
    /// Real research: documented methodology, custom approach.
    Research,
    /// Moderate effort: some customization, some documentation.
    Moderate,
    /// Low effort: cookbook recipe, boilerplate README, no adoption.
    Experiment,
    /// Minimal: auto-generated everything, zero downloads.
    Trivial,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgSummary {
    pub author: String,
    pub model_count: usize,
    pub dataset_count: usize,
    pub space_count: usize,
    pub total_downloads: u64,
    pub total_likes: u64,
    pub libraries: Vec<String>,
    pub pipeline_tags: Vec<String>,
}

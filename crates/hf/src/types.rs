use std::collections::HashMap;
use std::fmt;
use std::str::FromStr;
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

}

impl FromStr for RepoType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "model" => Ok(Self::Model),
            "dataset" => Ok(Self::Dataset),
            "space" => Ok(Self::Space),
            _ => Err(format!("unknown repo type: {s}")),
        }
    }
}

impl fmt::Display for RepoType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
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

    pub fn space(repo_id: impl Into<String>) -> Self {
        Self { repo_id: repo_id.into(), repo_type: RepoType::Space, path: None, revision: None }
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

// ── Builder for ListOptions ─────────────────────────────────────

impl ListOptions {
    /// Sensible defaults for listing models (sorted by downloads, descending).
    pub fn models() -> Self {
        Self {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: true,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        }
    }

    /// Sensible defaults for listing datasets (sorted by downloads, descending).
    pub fn datasets() -> Self {
        Self {
            repo_type: RepoType::Dataset,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: true,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        }
    }

    /// Sensible defaults for listing spaces (sorted by likes, descending).
    pub fn spaces() -> Self {
        Self {
            repo_type: RepoType::Space,
            sort: "likes".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: true,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        }
    }

    pub fn search(mut self, q: impl Into<String>) -> Self {
        self.search = Some(q.into());
        self
    }

    pub fn author(mut self, a: impl Into<String>) -> Self {
        self.author = Some(a.into());
        self
    }

    pub fn library(mut self, l: impl Into<String>) -> Self {
        self.library_filter = Some(l.into());
        self
    }

    pub fn pipeline_tag(mut self, t: impl Into<String>) -> Self {
        self.pipeline_tag_filter = Some(t.into());
        self
    }

    pub fn max_pages(mut self, n: usize) -> Self {
        self.max_pages = n;
        self
    }

    pub fn limit(mut self, n: usize) -> Self {
        self.limit = n;
        self
    }

    pub fn full(mut self, f: bool) -> Self {
        self.full = f;
        self
    }

    pub fn filter(mut self, f: impl Into<String>) -> Self {
        self.filter.get_or_insert_with(Vec::new).push(f.into());
        self
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
    /// Per-model maturity assessments. Populated by `scan_org` / `scan_org_deep`.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub model_maturity: Vec<ModelMaturity>,
    /// Sales-adjacent signals found across the org's repos.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub sales_signals: Vec<SalesSignal>,
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
    /// Detected alignment method from tags/README (KTO, DPO, RLHF, SFT, etc.)
    pub alignment_method: Option<String>,
    /// Whether the model is a LoRA/PEFT adapter (lighter than full fine-tune).
    pub has_lora_adapter: bool,
    /// Whether arXiv citations appear to be auto-added by training frameworks.
    pub has_auto_arxiv: bool,
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

/// Sales-adjacent signal detected from model card, tags, or repo name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesSignal {
    pub repo_id: String,
    pub category: SalesCategory,
    pub evidence: String,
}

/// Broad sales-adjacent categories for HF models.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SalesCategory {
    /// Email generation, personalization, outreach drafting.
    EmailOutreach,
    /// Conversation coaching, call intelligence, objection handling.
    SalesConversation,
    /// Revenue prediction, pipeline forecasting.
    Forecasting,
    /// B2B intent scoring, lead scoring, qualification.
    IntentScoring,
    /// Contact or company enrichment, technographic data.
    Enrichment,
    /// Company or lead classification.
    LeadClassification,
    /// CRM intelligence, deal insights.
    CrmIntelligence,
    /// General sales mention without clear sub-category.
    General,
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── RepoType tests ─────────────────────────────────────────

    #[test]
    fn repo_type_api_prefix() {
        assert_eq!(RepoType::Model.api_prefix(), "models");
        assert_eq!(RepoType::Dataset.api_prefix(), "datasets");
        assert_eq!(RepoType::Space.api_prefix(), "spaces");
    }

    #[test]
    fn repo_type_raw_prefix() {
        assert_eq!(RepoType::Model.raw_prefix(), "");
        assert_eq!(RepoType::Dataset.raw_prefix(), "datasets");
        assert_eq!(RepoType::Space.raw_prefix(), "spaces");
    }

    #[test]
    fn repo_type_as_str() {
        assert_eq!(RepoType::Model.as_str(), "model");
        assert_eq!(RepoType::Dataset.as_str(), "dataset");
        assert_eq!(RepoType::Space.as_str(), "space");
    }

    #[test]
    fn repo_type_display() {
        assert_eq!(format!("{}", RepoType::Model), "model");
        assert_eq!(format!("{}", RepoType::Dataset), "dataset");
        assert_eq!(format!("{}", RepoType::Space), "space");
    }

    #[test]
    fn repo_type_from_str_valid() {
        assert_eq!("model".parse::<RepoType>().unwrap(), RepoType::Model);
        assert_eq!("dataset".parse::<RepoType>().unwrap(), RepoType::Dataset);
        assert_eq!("space".parse::<RepoType>().unwrap(), RepoType::Space);
    }

    #[test]
    fn repo_type_from_str_invalid() {
        assert!("unknown".parse::<RepoType>().is_err());
        assert!("Model".parse::<RepoType>().is_err());
    }

    #[test]
    fn repo_type_roundtrip() {
        for rt in [RepoType::Model, RepoType::Dataset, RepoType::Space] {
            let parsed: RepoType = rt.as_str().parse().unwrap();
            assert_eq!(parsed, rt);
        }
    }

    // ── FetchRequest tests ─────────────────────────────────────

    #[test]
    fn fetch_request_model() {
        let req = FetchRequest::model("org/name");
        assert_eq!(req.repo_id, "org/name");
        assert_eq!(req.repo_type, RepoType::Model);
        assert!(req.path.is_none());
        assert!(req.revision.is_none());
    }

    #[test]
    fn fetch_request_dataset() {
        let req = FetchRequest::dataset("org/ds");
        assert_eq!(req.repo_id, "org/ds");
        assert_eq!(req.repo_type, RepoType::Dataset);
    }

    #[test]
    fn fetch_request_builder_chain() {
        let req = FetchRequest::model("org/m")
            .with_path("config.json")
            .with_revision("v2");
        assert_eq!(req.path.as_deref(), Some("config.json"));
        assert_eq!(req.revision.as_deref(), Some("v2"));
    }

    // ── FetchResult tests ──────────────────────────────────────

    #[test]
    fn fetch_result_is_ok() {
        let ok: FetchResult<String> = FetchResult::Ok {
            repo_id: "a".into(),
            data: "hello".into(),
        };
        assert!(ok.is_ok());

        let err: FetchResult<String> = FetchResult::Err {
            repo_id: "a".into(),
            error: crate::Error::Api {
                repo: "a".into(),
                status: 404,
                body: "not found".into(),
            },
        };
        assert!(!err.is_ok());
    }

    // ── Serde tests ────────────────────────────────────────────

    #[test]
    fn repo_info_deserialize_listing() {
        let json = serde_json::json!({
            "_id": "abc123",
            "id": "meta-llama/Llama-3-8B",
            "modelId": "meta-llama/Llama-3-8B",
            "author": "meta-llama",
            "lastModified": "2024-06-01T00:00:00.000Z",
            "createdAt": "2024-01-15T00:00:00.000Z",
            "downloads": 5000000,
            "likes": 12000,
            "library_name": "transformers",
            "pipeline_tag": "text-generation",
            "tags": ["transformers", "pytorch"],
            "cardData": {"language": "en"}
        });
        let info: RepoInfo = serde_json::from_value(json).unwrap();
        assert_eq!(info.id.as_deref(), Some("abc123"));
        assert_eq!(info.repo_id.as_deref(), Some("meta-llama/Llama-3-8B"));
        assert_eq!(info.model_id.as_deref(), Some("meta-llama/Llama-3-8B"));
        assert_eq!(info.author.as_deref(), Some("meta-llama"));
        assert_eq!(info.last_modified.as_deref(), Some("2024-06-01T00:00:00.000Z"));
        assert_eq!(info.created_at.as_deref(), Some("2024-01-15T00:00:00.000Z"));
        assert_eq!(info.downloads, Some(5000000));
        assert_eq!(info.likes, Some(12000));
        assert_eq!(info.library.as_deref(), Some("transformers"));
        assert_eq!(info.pipeline_tag.as_deref(), Some("text-generation"));
        assert!(info.card_data.is_some());
    }

    #[test]
    fn repo_info_deserialize_minimal() {
        let json = serde_json::json!({"id": "org/model"});
        let info: RepoInfo = serde_json::from_value(json).unwrap();
        assert_eq!(info.repo_id.as_deref(), Some("org/model"));
        assert!(info.id.is_none());
        assert!(info.author.is_none());
        assert!(info.downloads.is_none());
        assert!(info.tags.is_none());
        assert!(info.siblings.is_none());
    }

    #[test]
    fn sibling_file_deserialize() {
        let json = serde_json::json!({"rfilename": "model.bin", "size": 100});
        let f: SiblingFile = serde_json::from_value(json).unwrap();
        assert_eq!(f.filename, "model.bin");
        assert_eq!(f.size, Some(100));
    }

    #[test]
    fn repo_info_serde_roundtrip() {
        let info = RepoInfo {
            id: Some("abc".into()),
            repo_id: Some("org/model".into()),
            model_id: None,
            author: Some("org".into()),
            sha: None,
            last_modified: Some("2024-01-01T00:00:00Z".into()),
            created_at: None,
            tags: Some(vec!["transformers".into()]),
            downloads: Some(1000),
            likes: Some(50),
            library: Some("transformers".into()),
            pipeline_tag: Some("text-generation".into()),
            private: Some(false),
            gated: None,
            disabled: None,
            description: Some("A test model".into()),
            sdk: None,
            siblings: None,
            card_data: None,
            extra: serde_json::Value::Null,
        };
        let json = serde_json::to_string(&info).unwrap();
        let back: RepoInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.repo_id, info.repo_id);
        assert_eq!(back.downloads, info.downloads);
        assert_eq!(back.author, info.author);
    }

    // ── ListOptions builder tests ──────────────────────────────

    #[test]
    fn list_options_models_defaults() {
        let opts = ListOptions::models();
        assert_eq!(opts.repo_type, RepoType::Model);
        assert_eq!(opts.sort, "downloads");
        assert_eq!(opts.direction, "-1");
        assert!(opts.full);
        assert!(opts.search.is_none());
    }

    #[test]
    fn list_options_builder_chain() {
        let opts = ListOptions::models()
            .search("llama")
            .author("meta-llama")
            .library("transformers")
            .pipeline_tag("text-generation")
            .max_pages(5)
            .limit(50);
        assert_eq!(opts.search.as_deref(), Some("llama"));
        assert_eq!(opts.author.as_deref(), Some("meta-llama"));
        assert_eq!(opts.library_filter.as_deref(), Some("transformers"));
        assert_eq!(opts.pipeline_tag_filter.as_deref(), Some("text-generation"));
        assert_eq!(opts.max_pages, 5);
        assert_eq!(opts.limit, 50);
    }

    #[test]
    fn list_options_datasets_defaults() {
        let opts = ListOptions::datasets();
        assert_eq!(opts.repo_type, RepoType::Dataset);
        assert_eq!(opts.sort, "downloads");
    }

    #[test]
    fn list_options_spaces_defaults() {
        let opts = ListOptions::spaces();
        assert_eq!(opts.repo_type, RepoType::Space);
        assert_eq!(opts.sort, "likes");
    }

    #[test]
    fn fetch_request_space() {
        let req = FetchRequest::space("org/demo");
        assert_eq!(req.repo_id, "org/demo");
        assert_eq!(req.repo_type, RepoType::Space);
        assert!(req.path.is_none());
    }

    #[test]
    fn list_options_filter_builder() {
        let opts = ListOptions::models()
            .filter("task:text-generation")
            .filter("language:en");
        let filters = opts.filter.unwrap();
        assert_eq!(filters.len(), 2);
        assert_eq!(filters[0], "task:text-generation");
        assert_eq!(filters[1], "language:en");
    }

    #[test]
    fn repo_type_is_copy() {
        let a = RepoType::Model;
        let b = a; // Copy
        assert_eq!(a, b);
    }
}

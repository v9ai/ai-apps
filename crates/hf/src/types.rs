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
    #[serde(rename = "modelId", alias = "id")]
    pub repo_id: Option<String>,
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

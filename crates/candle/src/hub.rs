//! Centralized HuggingFace Hub model loader.
//!
//! Provides a shared API client with:
//! - Configurable cache directory (`SALESCUE_MODEL_CACHE` env var)
//! - Token resolution from standard `HF_TOKEN` env var
//! - Model revision pinning via `models.lock` file
//!
//! All crates in the workspace should use `hub::api()` instead of
//! constructing `hf_hub::api::sync::Api` directly.

use std::path::PathBuf;

use hf_hub::api::sync::{Api, ApiBuilder};
use hf_hub::{Repo, RepoType};

use crate::{Error, Result};

/// Build a shared HF Hub API client with workspace-standard config.
///
/// - Cache dir: `SALESCUE_MODEL_CACHE` env var, or `~/.cache/salescue/models`
/// - Token: `HF_TOKEN` env var (optional)
pub fn api() -> Result<Api> {
    let mut builder = ApiBuilder::new().with_cache_dir(cache_dir());
    if let Ok(token) = std::env::var("HF_TOKEN") {
        builder = builder.with_token(Some(token));
    }
    builder.build().map_err(|e| Error::ModelNotFound(e.to_string()))
}

/// Resolve a model repo, optionally pinned to a specific revision.
///
/// If `revision` is `Some`, the repo is pinned to that git ref (commit SHA, tag, or branch).
/// Otherwise, uses the default branch (usually `main`).
pub fn repo(repo_id: &str, revision: Option<&str>) -> Repo {
    match revision {
        Some(rev) => Repo::with_revision(repo_id.to_string(), RepoType::Model, rev.to_string()),
        None => Repo::new(repo_id.to_string(), RepoType::Model),
    }
}

/// Get the model cache directory.
///
/// Priority:
/// 1. `SALESCUE_MODEL_CACHE` env var
/// 2. Platform cache dir + `salescue/models` (e.g., `~/.cache/salescue/models`)
/// 3. Fallback: `.cache/salescue/models` in home dir
pub fn cache_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("SALESCUE_MODEL_CACHE") {
        return PathBuf::from(dir);
    }

    // Use HF_HOME if set (standard HuggingFace convention)
    if let Ok(hf_home) = std::env::var("HF_HOME") {
        return PathBuf::from(hf_home);
    }

    // Default: ~/.cache/huggingface/hub (same as hf-hub default)
    let home = std::env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    home.join(".cache").join("huggingface").join("hub")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repo_without_revision() {
        let r = repo("BAAI/bge-small-en-v1.5", None);
        assert_eq!(r.url(), "https://huggingface.co/BAAI/bge-small-en-v1.5/resolve/main/");
    }

    #[test]
    fn repo_with_revision() {
        let r = repo("BAAI/bge-small-en-v1.5", Some("abc123"));
        assert_eq!(r.url(), "https://huggingface.co/BAAI/bge-small-en-v1.5/resolve/abc123/");
    }
}

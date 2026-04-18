//! Load Qwen agent bundles (system prompt + tool allow-list + generation config) by slug.
//!
//! Mirror of the Python `apps/hoa/backend/hf_agent.py` loader. Each bundle is
//! a small HuggingFace model repo under `vadimnicolai/qwen-hoa-<slug>` or
//! `vadimnicolai/qwen-course-<slug>` containing:
//!
//! ```text
//! system_prompt.txt   - stable persona for the agent
//! tools.json          - list of tool names the agent may call
//! generation.json     - {model, temperature, max_tokens, fallback_model}
//! README.md           - model card
//! ```
//!
//! The loader prefers a local checkout at `apps/hoa/agent-bundles/<slug>/`
//! (fast dev loop) and falls back to `hf_hub::api::sync::Api`.
//!
//! # Example
//!
//! ```no_run
//! use hf_agent::{load_agent, Family};
//!
//! let bundle = load_agent("pedagogy", Family::Course)?;
//! println!("{}", bundle.system_prompt);
//! # Ok::<(), hf_agent::Error>(())
//! ```

use std::path::{Path, PathBuf};

use hf_hub::api::sync::ApiBuilder;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("hf-hub: {0}")]
    HfHub(#[from] hf_hub::api::sync::ApiError),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("bundle '{0}' is missing system_prompt.txt")]
    MissingSystemPrompt(String),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Bundle family — determines the HF repo prefix and which source file
/// the persona was extracted from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Family {
    /// Research / debate personas extracted from `apps/hoa/backend/`.
    /// Repo naming: `<org>/qwen-hoa-<slug>`.
    Hoa,
    /// Course-review expert personas extracted from `crates/course-review/src/prompts.rs`.
    /// Repo naming: `<org>/qwen-course-<slug>`.
    Course,
}

impl Family {
    fn prefix(self) -> &'static str {
        match self {
            Family::Hoa => "qwen-hoa-",
            Family::Course => "qwen-course-",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Generation {
    pub model: Option<String>,
    pub fallback_model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct AgentBundle {
    pub slug: String,
    pub system_prompt: String,
    pub tools: Vec<String>,
    pub generation: Generation,
    /// `local:<path>` or `hf:<repo_id>` — for diagnostics.
    pub source: String,
}

fn default_org() -> String {
    std::env::var("HF_AGENT_ORG").unwrap_or_else(|_| "vadimnicolai".to_string())
}

fn repo_id(slug: &str, family: Family) -> String {
    format!("{}/{}{}", default_org(), family.prefix(), slug)
}

/// Walk up from the current crate to find `apps/hoa/agent-bundles/`.
/// Mirrors the Python loader's `LOCAL_BUNDLES_DIR` convention.
fn local_bundles_dir() -> Option<PathBuf> {
    // CARGO_MANIFEST_DIR for this crate is `<repo>/crates/hf-agent`.
    // Local bundles live at `<repo>/apps/hoa/agent-bundles`.
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest.parent()?.parent()?;
    let candidate = repo_root.join("apps").join("hoa").join("agent-bundles");
    if candidate.is_dir() {
        return Some(candidate);
    }
    // Fallback: current working dir heuristics.
    let cwd = std::env::current_dir().ok()?;
    for base in cwd.ancestors() {
        let c = base.join("apps").join("hoa").join("agent-bundles");
        if c.is_dir() {
            return Some(c);
        }
    }
    None
}

fn read_bundle(dir: &Path, slug: &str, source: String) -> Result<AgentBundle> {
    let sp = dir.join("system_prompt.txt");
    if !sp.is_file() {
        return Err(Error::MissingSystemPrompt(slug.to_string()));
    }
    let system_prompt = std::fs::read_to_string(&sp)?.trim().to_string();

    let tools = {
        let p = dir.join("tools.json");
        if p.is_file() {
            serde_json::from_str::<Vec<String>>(&std::fs::read_to_string(p)?)?
        } else {
            Vec::new()
        }
    };

    let generation = {
        let p = dir.join("generation.json");
        if p.is_file() {
            serde_json::from_str::<Generation>(&std::fs::read_to_string(p)?)?
        } else {
            Generation::default()
        }
    };

    Ok(AgentBundle {
        slug: slug.to_string(),
        system_prompt,
        tools,
        generation,
        source,
    })
}

/// Load an agent bundle by slug and family.
///
/// Tries a local checkout under `apps/hoa/agent-bundles/<slug>/` first, then
/// falls back to `huggingface_hub::snapshot_download`-equivalent via `hf-hub`.
/// Hyphens and underscores in the slug are normalized to hyphens.
pub fn load_agent(slug: &str, family: Family) -> Result<AgentBundle> {
    let slug = slug.replace('_', "-");

    if let Some(bundles) = local_bundles_dir() {
        let dir = bundles.join(&slug);
        if dir.is_dir() && dir.join("system_prompt.txt").is_file() {
            let src = format!("local:{}", dir.display());
            return read_bundle(&dir, &slug, src);
        }
    }

    let rid = repo_id(&slug, family);
    let mut builder = ApiBuilder::new();
    if let Ok(token) = std::env::var("HF_TOKEN") {
        builder = builder.with_token(Some(token));
    }
    let api = builder.build()?;
    let repo = api.model(rid.clone());

    // Download each file individually; hf-hub caches them under the
    // shared HF cache dir. All three files live in the same repo folder.
    let sp_path = repo.get("system_prompt.txt")?;
    let bundle_dir = sp_path
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    // Best-effort: pull optional files so read_bundle sees them locally.
    let _ = repo.get("tools.json");
    let _ = repo.get("generation.json");

    read_bundle(&bundle_dir, &slug, format!("hf:{rid}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repo_id_hoa() {
        std::env::set_var("HF_AGENT_ORG", "vadimnicolai");
        assert_eq!(repo_id("bio", Family::Hoa), "vadimnicolai/qwen-hoa-bio");
    }

    #[test]
    fn repo_id_course() {
        std::env::set_var("HF_AGENT_ORG", "vadimnicolai");
        assert_eq!(
            repo_id("pedagogy", Family::Course),
            "vadimnicolai/qwen-course-pedagogy"
        );
    }

    #[test]
    fn local_bundle_exists_for_pedagogy() {
        if let Some(dir) = local_bundles_dir() {
            assert!(dir.join("pedagogy").join("system_prompt.txt").is_file());
        }
    }

    #[test]
    fn load_pedagogy_locally() {
        let b = load_agent("pedagogy", Family::Course).expect("load");
        assert!(b.system_prompt.contains("instructional designer"));
        assert!(b.source.starts_with("local:"));
    }
}

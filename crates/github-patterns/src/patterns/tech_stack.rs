use crate::client::GhClient;
use crate::types::{GhRepo, TechStack};
use std::collections::HashMap;
use tracing::warn;

// Known AI/ML framework identifiers found in repo topics or names.
const AI_FRAMEWORKS: &[&str] = &[
    "transformers",
    "pytorch",
    "torch",
    "tensorflow",
    "jax",
    "langchain",
    "llamaindex",
    "llama-index",
    "openai",
    "anthropic",
    "huggingface",
    "diffusers",
    "sentence-transformers",
    "vllm",
    "ollama",
    "ggml",
    "gguf",
    "candle",
    "mlx",
    "deepspeed",
    "accelerate",
    "peft",
    "rlhf",
    "trl",
    "axolotl",
];

const INFRA_TOOLS: &[&str] = &[
    "kubernetes",
    "k8s",
    "terraform",
    "pulumi",
    "docker",
    "helm",
    "argo",
    "grafana",
    "prometheus",
];

const CLOUD_PROVIDERS: &[&str] = &["aws", "gcp", "azure", "cloudflare", "vercel", "fly"];

/// Aggregate language bytes and detect framework signals across repos.
pub async fn aggregate(client: &GhClient, org: &str, repos: &[GhRepo]) -> TechStack {
    let mut languages: HashMap<String, u64> = HashMap::new();
    let mut ai_frameworks: Vec<String> = Vec::new();
    let mut infra_tools: Vec<String> = Vec::new();
    let mut cloud_providers: Vec<String> = Vec::new();

    // Collect language bytes (limit to first 20 non-fork repos to save quota)
    let candidates: Vec<_> = repos.iter().filter(|r| !r.fork).take(20).collect();
    for repo in &candidates {
        match client.repo_languages(org, &repo.name).await {
            Ok(langs) => {
                for (lang, bytes) in langs {
                    *languages.entry(lang).or_default() += bytes;
                }
            }
            Err(e) => warn!("language fetch failed for {}/{}: {e}", org, repo.name),
        }
    }

    // Scan topics and repo names for framework / infra signals
    for repo in repos {
        let topics = repo.topics.as_deref().unwrap_or(&[]);
        let name_lower = repo.name.to_lowercase();
        let desc_lower = repo
            .description
            .as_deref()
            .unwrap_or("")
            .to_lowercase();

        for candidate in AI_FRAMEWORKS {
            if topics.iter().any(|t| t.contains(candidate))
                || name_lower.contains(candidate)
                || desc_lower.contains(candidate)
            {
                let s = candidate.to_string();
                if !ai_frameworks.contains(&s) {
                    ai_frameworks.push(s);
                }
            }
        }
        for candidate in INFRA_TOOLS {
            if topics.iter().any(|t| t.contains(candidate))
                || name_lower.contains(candidate)
            {
                let s = candidate.to_string();
                if !infra_tools.contains(&s) {
                    infra_tools.push(s);
                }
            }
        }
        for candidate in CLOUD_PROVIDERS {
            if topics.iter().any(|t| t.contains(candidate))
                || name_lower.contains(candidate)
            {
                let s = candidate.to_string();
                if !cloud_providers.contains(&s) {
                    cloud_providers.push(s);
                }
            }
        }
    }

    let primary_language = languages
        .iter()
        .max_by_key(|(_, &b)| b)
        .map(|(lang, _)| lang.clone());

    TechStack {
        languages,
        primary_language,
        ai_frameworks,
        infra_tools,
        cloud_providers,
    }
}

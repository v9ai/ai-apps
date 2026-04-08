use crate::client::GhClient;
use crate::deps;
use crate::readme;
use crate::types::{DepSignal, GhRepo, TechStack};
use futures::future::join_all;
use std::collections::HashMap;
use tracing::warn;

// Known AI/ML framework identifiers found in repo topics or names.
const AI_FRAMEWORKS: &[&str] = &[
    "transformers", "pytorch", "torch", "tensorflow", "jax", "langchain",
    "llamaindex", "llama-index", "openai", "anthropic", "huggingface",
    "diffusers", "sentence-transformers", "vllm", "ollama", "ggml", "gguf",
    "candle", "mlx", "deepspeed", "accelerate", "peft", "rlhf", "trl",
    "axolotl",
];

const INFRA_TOOLS: &[&str] = &[
    "kubernetes", "k8s", "terraform", "pulumi", "docker", "helm", "argo",
    "grafana", "prometheus",
];

const CLOUD_PROVIDERS: &[&str] = &[
    "aws", "gcp", "azure", "cloudflare", "vercel", "fly",
];

/// Aggregate language bytes, detect framework signals, scan dependency
/// manifests, and extract the primary repo's README signals.
pub async fn aggregate(client: &GhClient, org: &str, repos: &[GhRepo]) -> TechStack {
    let candidates: Vec<_> = repos.iter().filter(|r| !r.fork).take(20).collect();

    // ── parallel language fetch ───────────────────────────────────────────────
    let lang_futs: Vec<_> = candidates
        .iter()
        .map(|r| client.repo_languages(org, &r.name))
        .collect();
    let lang_results = join_all(lang_futs).await;

    let mut languages: HashMap<String, u64> = HashMap::new();
    for (repo, result) in candidates.iter().zip(lang_results) {
        match result {
            Ok(langs) => {
                for (lang, bytes) in langs {
                    *languages.entry(lang).or_default() += bytes;
                }
            }
            Err(e) => warn!("language fetch {}/{}: {e}", org, repo.name),
        }
    }

    // ── topic / name scan (topics + descriptions) ─────────────────────────────
    let mut ai_frameworks: Vec<String> = Vec::new();
    let mut infra_tools: Vec<String> = Vec::new();
    let mut cloud_providers: Vec<String> = Vec::new();

    for repo in repos {
        let topics   = repo.topics.as_deref().unwrap_or(&[]);
        let name_l   = repo.name.to_lowercase();
        let desc_l   = repo.description.as_deref().unwrap_or("").to_lowercase();

        push_unique(&mut ai_frameworks,   AI_FRAMEWORKS,    topics, &name_l, &desc_l);
        push_unique(&mut infra_tools,     INFRA_TOOLS,      topics, &name_l, &desc_l);
        push_unique(&mut cloud_providers, CLOUD_PROVIDERS,  topics, &name_l, &desc_l);
    }

    // ── parallel dep scanning (top 10 non-fork repos) ─────────────────────────
    let dep_candidates: Vec<_> = repos.iter().filter(|r| !r.fork).take(10).collect();
    let dep_futs: Vec<_> = dep_candidates
        .iter()
        .map(|r| deps::scan_repo(client, org, &r.name))
        .collect();
    let dep_results = join_all(dep_futs).await;

    let mut dep_signals: Vec<DepSignal> = dep_results.into_iter().flatten().collect();
    dep_signals.dedup_by(|a, b| dep_signal_name(a) == dep_signal_name(b));

    // ── README from the most-starred non-fork repo ────────────────────────────
    let primary_repo = repos
        .iter()
        .filter(|r| !r.fork)
        .max_by_key(|r| r.stargazers_count);

    let readme_signals = if let Some(repo) = primary_repo {
        readme::analyse(client, org, &repo.name).await
    } else {
        None
    };

    // Merge framework names surfaced by dep scan into ai_frameworks list
    for sig in &dep_signals {
        if let DepSignal::AiPackage { name, .. } = sig {
            let n = name.to_lowercase();
            if !ai_frameworks.contains(&n) {
                ai_frameworks.push(n);
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
        dep_signals,
        readme: readme_signals,
    }
}

fn push_unique(
    list: &mut Vec<String>,
    candidates: &[&str],
    topics: &[String],
    name_l: &str,
    desc_l: &str,
) {
    for candidate in candidates {
        let s = candidate.to_string();
        if !list.contains(&s)
            && (topics.iter().any(|t| t.contains(candidate))
                || name_l.contains(candidate)
                || desc_l.contains(candidate))
        {
            list.push(s);
        }
    }
}

fn dep_signal_name(s: &DepSignal) -> &str {
    match s {
        DepSignal::AiPackage { name, .. } => name,
        DepSignal::VectorDb { name }      => name,
    }
}

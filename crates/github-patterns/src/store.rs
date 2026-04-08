/// Neon PostgreSQL writer for org pattern results.
///
/// Writes `OrgPatterns` into the `companies` table, merging derived tags
/// into the existing `tags` JSON array.  All GitHub-sourced tags are
/// prefixed `github:` so they can be identified and refreshed cleanly.
use crate::error::{GhError, Result};
use crate::types::{DepSignal, OrgPatterns};
use sqlx::PgPool;
use tracing::info;

// ── Public API ────────────────────────────────────────────────────────────────

/// Upsert an org's pattern data into the `companies` table.
///
/// - If `company_id` is `Some`, updates that row.
/// - If `None`, inserts a new row (keyed by `company_key`) with
///   `ON CONFLICT (key) DO UPDATE` so re-runs are idempotent.
///
/// Returns the `id` of the affected row.
pub async fn save_org_patterns(
    pool: &PgPool,
    company_id: Option<i32>,
    company_key: &str,
    github_url: &str,
    patterns: &OrgPatterns,
    existing_tags_json: Option<&str>,
) -> Result<i32> {
    let new_tags      = derive_tags(patterns);
    let merged_tags   = merge_tags(existing_tags_json, &new_tags);
    let tags_json     = serde_json::to_string(&merged_tags).map_err(|e| GhError::Other(e.to_string()))?;
    let patterns_json = serde_json::to_string(patterns).map_err(|e| GhError::Other(e.to_string()))?;

    if let Some(id) = company_id {
        sqlx::query(
            r#"UPDATE companies SET
                 github_url            = $1,
                 github_org            = $2,
                 github_ai_score       = $3,
                 github_hiring_score   = $4,
                 github_activity_score = $5,
                 github_patterns       = $6,
                 github_analyzed_at    = now()::text,
                 tags                  = $7,
                 updated_at            = now()::text
               WHERE id = $8"#,
        )
        .bind(github_url)
        .bind(&patterns.org)
        .bind(patterns.ai_score)
        .bind(patterns.hiring_score)
        .bind(patterns.activity_score)
        .bind(&patterns_json)
        .bind(&tags_json)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| GhError::Other(e.to_string()))?;

        info!("updated company id={id} org={}", patterns.org);
        Ok(id)
    } else {
        let id: i32 = sqlx::query_scalar(
            r#"INSERT INTO companies
                 (key, name, github_url, github_org,
                  github_ai_score, github_hiring_score, github_activity_score,
                  github_patterns, github_analyzed_at, tags, category)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now()::text, $9, 'UNKNOWN')
               ON CONFLICT (key) DO UPDATE SET
                 github_url            = EXCLUDED.github_url,
                 github_org            = EXCLUDED.github_org,
                 github_ai_score       = EXCLUDED.github_ai_score,
                 github_hiring_score   = EXCLUDED.github_hiring_score,
                 github_activity_score = EXCLUDED.github_activity_score,
                 github_patterns       = EXCLUDED.github_patterns,
                 github_analyzed_at    = now()::text,
                 tags                  = EXCLUDED.tags,
                 updated_at            = now()::text
               RETURNING id"#,
        )
        .bind(company_key)
        .bind(&patterns.org)   // name = org login as fallback
        .bind(github_url)
        .bind(&patterns.org)
        .bind(patterns.ai_score)
        .bind(patterns.hiring_score)
        .bind(patterns.activity_score)
        .bind(&patterns_json)
        .bind(&tags_json)
        .fetch_one(pool)
        .await
        .map_err(|e| GhError::Other(e.to_string()))?;

        info!("upserted company key={company_key} org={}", patterns.org);
        Ok(id)
    }
}

// ── Tag derivation ────────────────────────────────────────────────────────────

/// Derive `github:*` tags from pattern scores and signals.
pub fn derive_tags(p: &OrgPatterns) -> Vec<String> {
    let mut tags: Vec<String> = vec!["github:analyzed".into()];

    // AI tier
    if p.ai_score > 0.60 {
        tags.push("github:ai-native".into());
    } else if p.ai_score > 0.25 {
        tags.push("github:ai-adjacent".into());
    }

    // Hiring
    if p.hiring_score > 0.30 {
        tags.push("github:hiring".into());
    }
    if p.tech_stack.readme.as_ref().map_or(false, |r| r.hiring) {
        tags.push("github:hiring-readme".into());
    }

    // Activity
    if p.activity_score > 0.50 {
        tags.push("github:active".into());
    }

    // Growth composite
    if p.activity_score > 0.50 && p.hiring_score > 0.20 {
        tags.push("github:growing".into());
    }

    // Language signals
    let total_bytes: u64 = p.tech_stack.languages.values().sum();
    if total_bytes > 0 {
        let python = p.tech_stack.languages.get("Python").copied().unwrap_or(0);
        if python as f64 / total_bytes as f64 > 0.60 {
            tags.push("github:python-heavy".into());
        }
    }
    if p.tech_stack.primary_language.as_deref() == Some("Rust") {
        tags.push("github:rust-native".into());
    }
    if p.tech_stack.primary_language.as_deref() == Some("Go") {
        tags.push("github:go-native".into());
    }
    if p.tech_stack.primary_language.as_deref() == Some("TypeScript") {
        tags.push("github:typescript-native".into());
    }

    // Dep-level signals
    let has_vector_db = p.tech_stack.dep_signals.iter().any(|s| matches!(s, DepSignal::VectorDb { .. }));
    if has_vector_db {
        tags.push("github:vector-db".into());
    }

    let has_ml_training = p.tech_stack.dep_signals.iter().any(|s| {
        if let DepSignal::AiPackage { name, .. } = s {
            matches!(name.as_str(), "torch" | "tensorflow" | "jax" | "deepspeed" | "accelerate" | "trl" | "peft")
        } else {
            false
        }
    });
    if has_ml_training {
        tags.push("github:ml-training".into());
    }

    let has_llm = p.tech_stack.dep_signals.iter().any(|s| {
        if let DepSignal::AiPackage { name, .. } = s {
            matches!(name.as_str(), "openai" | "anthropic" | "langchain" | "langchain-core" | "llamaindex" | "llama_index" | "litellm" | "vllm")
        } else {
            false
        }
    }) || p.tech_stack.ai_frameworks.iter().any(|f| {
        matches!(f.as_str(), "langchain" | "llamaindex" | "openai" | "anthropic")
    });
    if has_llm {
        tags.push("github:llm-consumer".into());
    }

    // Infra maturity
    if p.tech_stack.infra_tools.iter().any(|t| t == "kubernetes" || t == "k8s") {
        tags.push("github:k8s".into());
    }

    tags
}

/// Merge new `github:*` tags into the existing tag list.
/// Drops stale `github:*` tags first so scores stay fresh.
pub fn merge_tags(existing_json: Option<&str>, new_tags: &[String]) -> Vec<String> {
    let mut existing: Vec<String> = existing_json
        .and_then(|j| serde_json::from_str(j).ok())
        .unwrap_or_default();
    existing.retain(|t| !t.starts_with("github:"));
    existing.extend_from_slice(new_tags);
    existing
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Extract the GitHub org login from a URL.
/// `"https://github.com/openai"` → `Some("openai")`
pub fn extract_org_from_url(url: &str) -> Option<String> {
    let url = url.trim().trim_end_matches('/');
    url.split("github.com/")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .filter(|s| !s.is_empty() && !s.starts_with('?'))
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ActivitySummary, OrgPatterns, ReadmeSignals, TechStack};
    use std::collections::HashMap;

    fn bare_patterns(org: &str) -> OrgPatterns {
        OrgPatterns {
            org: org.to_string(),
            ai_score: 0.0,
            activity_score: 0.0,
            hiring_score: 0.0,
            tech_stack: TechStack::default(),
            ai_signals: vec![],
            hiring_signals: vec![],
            activity: ActivitySummary::default(),
        }
    }

    // ── extract_org_from_url ──────────────────────────────────────────────────

    #[test]
    fn extract_org_https() {
        assert_eq!(extract_org_from_url("https://github.com/openai"), Some("openai".into()));
    }

    #[test]
    fn extract_org_trailing_slash() {
        assert_eq!(extract_org_from_url("https://github.com/huggingface/"), Some("huggingface".into()));
    }

    #[test]
    fn extract_org_with_repo_path() {
        // Only the org segment, ignore repo
        assert_eq!(extract_org_from_url("https://github.com/mistralai/mistral-src"), Some("mistralai".into()));
    }

    #[test]
    fn extract_org_no_github_returns_none() {
        assert_eq!(extract_org_from_url("https://example.com/foo"), None);
    }

    #[test]
    fn extract_org_empty_segment_returns_none() {
        assert_eq!(extract_org_from_url("https://github.com/"), None);
    }

    // ── derive_tags ───────────────────────────────────────────────────────────

    #[test]
    fn derive_tags_always_includes_analyzed() {
        let p = bare_patterns("test-org");
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:analyzed".to_string()));
    }

    #[test]
    fn derive_tags_ai_native_above_0_60() {
        let mut p = bare_patterns("ai-org");
        p.ai_score = 0.75;
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:ai-native".to_string()));
        assert!(!tags.contains(&"github:ai-adjacent".to_string()));
    }

    #[test]
    fn derive_tags_ai_adjacent_between_0_25_and_0_60() {
        let mut p = bare_patterns("ai-org");
        p.ai_score = 0.40;
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:ai-adjacent".to_string()));
        assert!(!tags.contains(&"github:ai-native".to_string()));
    }

    #[test]
    fn derive_tags_no_ai_tag_below_0_25() {
        let p = bare_patterns("boring-org");
        let tags = derive_tags(&p);
        assert!(!tags.iter().any(|t| t.starts_with("github:ai")));
    }

    #[test]
    fn derive_tags_hiring_above_0_30() {
        let mut p = bare_patterns("growing");
        p.hiring_score = 0.50;
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:hiring".to_string()));
    }

    #[test]
    fn derive_tags_readme_hiring_adds_tag() {
        let mut p = bare_patterns("grows");
        p.tech_stack.readme = Some(ReadmeSignals { hiring: true, ..Default::default() });
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:hiring-readme".to_string()));
    }

    #[test]
    fn derive_tags_python_heavy() {
        let mut p = bare_patterns("ml-org");
        p.tech_stack.languages = HashMap::from([
            ("Python".to_string(), 700u64),
            ("Shell".to_string(), 300u64),
        ]);
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:python-heavy".to_string()));
    }

    #[test]
    fn derive_tags_rust_native() {
        let mut p = bare_patterns("ferrous");
        p.tech_stack.primary_language = Some("Rust".to_string());
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:rust-native".to_string()));
    }

    #[test]
    fn derive_tags_vector_db() {
        let mut p = bare_patterns("rag-org");
        p.tech_stack.dep_signals = vec![DepSignal::VectorDb { name: "chromadb".into() }];
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:vector-db".to_string()));
    }

    #[test]
    fn derive_tags_growing_composite() {
        let mut p = bare_patterns("rocket");
        p.activity_score = 0.70;
        p.hiring_score = 0.40;
        let tags = derive_tags(&p);
        assert!(tags.contains(&"github:growing".to_string()));
        assert!(tags.contains(&"github:active".to_string()));
        assert!(tags.contains(&"github:hiring".to_string()));
    }

    // ── merge_tags ────────────────────────────────────────────────────────────

    #[test]
    fn merge_tags_replaces_stale_github_tags() {
        let existing = r#"["customer","github:ai-adjacent","startup"]"#;
        let new_tags = vec!["github:ai-native".to_string(), "github:hiring".to_string()];
        let merged = merge_tags(Some(existing), &new_tags);
        assert!(merged.contains(&"customer".to_string()));
        assert!(merged.contains(&"startup".to_string()));
        assert!(merged.contains(&"github:ai-native".to_string()));
        assert!(merged.contains(&"github:hiring".to_string()));
        // Stale tag replaced
        assert!(!merged.contains(&"github:ai-adjacent".to_string()));
    }

    #[test]
    fn merge_tags_null_existing_uses_new_only() {
        let new_tags = vec!["github:analyzed".to_string()];
        let merged = merge_tags(None, &new_tags);
        assert_eq!(merged, vec!["github:analyzed"]);
    }

    #[test]
    fn merge_tags_preserves_non_github_tags() {
        let existing = r#"["icp","priority","discovery:ashby"]"#;
        let merged = merge_tags(Some(existing), &["github:analyzed".to_string()]);
        assert!(merged.contains(&"icp".to_string()));
        assert!(merged.contains(&"priority".to_string()));
        assert!(merged.contains(&"discovery:ashby".to_string()));
    }
}

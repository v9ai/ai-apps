/// AI consultancy discovery via GitHub GraphQL.
///
/// Strategy: for each AI-adjacent topic slice, search repos sorted by recent
/// activity; walk up to the owning Organization (skip personal accounts);
/// pull org metadata; score on partnership-fit heuristics; upsert to Neon.
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use std::time::Duration;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use futures::stream::{self, StreamExt};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::{info, warn};

use github_patterns::{GhClient, GhError};

use crate::db;
use crate::{Consultancy, ScoreReasons};

// ── Config ────────────────────────────────────────────────────────────────────

const TOPIC_SLICES: &[&str] = &[
    "topic:llm sort:updated-desc",
    "topic:rag sort:updated-desc",
    "topic:generative-ai sort:updated-desc",
    "topic:langchain sort:updated-desc",
    "topic:llamaindex sort:updated-desc",
    "topic:mlops sort:updated-desc",
    "topic:machine-learning-consulting sort:stars-desc",
    "topic:ai-consulting sort:stars-desc",
    "topic:ai-agents sort:updated-desc",
    "topic:vector-database sort:updated-desc",
    "topic:fine-tuning sort:updated-desc",
    "topic:prompt-engineering sort:stars-desc",
];

const MAX_PAGES_PER_SLICE: usize = 10;
const PER_PAGE: u32 = 50;
const PAGE_DELAY_MS: u64 = 500;
/// Minimum score to upsert into the DB (skips obvious non-consultancies).
const MIN_SCORE_TO_SAVE: i32 = 20;
/// Retry delays in seconds for rate-limit backoff (4 attempts total).
const RETRY_DELAYS_SECS: &[u64] = &[2, 4, 8, 16];

// ── GraphQL query ─────────────────────────────────────────────────────────────

const QUERY: &str = r#"
query FindAiOrgs($q: String!, $cursor: String, $perPage: Int!) {
  rateLimit { remaining resetAt cost }
  search(query: $q, type: REPOSITORY, first: $perPage, after: $cursor) {
    repositoryCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Repository {
        nameWithOwner
        stargazerCount
        pushedAt
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        owner {
          __typename
          login
          ... on Organization {
            name
            description
            websiteUrl
            location
            email
            twitterUsername
            createdAt
            repositories(privacy: PUBLIC) { totalCount }
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                  description
                  stargazerCount
                  repositoryTopics(first: 5) { nodes { topic { name } } }
                }
              }
            }
          }
        }
      }
    }
  }
}
"#;

// ── GraphQL response types ────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GqlData {
    rate_limit: RateLimit,
    search: SearchResult,
}

#[derive(Deserialize)]
struct RateLimit {
    remaining: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    page_info: PageInfo,
    nodes: Vec<Option<serde_json::Value>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    has_next_page: bool,
    end_cursor: Option<String>,
}

// ── Org candidate ─────────────────────────────────────────────────────────────

#[derive(Debug, Default, Serialize)]
pub struct OrgCandidate {
    pub login: String,
    pub name: String,
    pub description: String,
    pub website: String,
    pub location: String,
    pub email: String,
    pub created_at: String,
    pub public_repos: u32,
    pub ai_repo_count: u32,
    pub total_stars: u32,
    pub most_recent_push: String,
    pub pinned_summaries: Vec<String>,
    pub topics_seen: HashSet<String>,
    pub score: i32,
    pub reasons: Vec<String>,
}

// ── Regex patterns (compiled once) ───────────────────────────────────────────

fn consultancy_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?i)\b(consult|advisor|services|agency|studio|labs|partners?|solutions?|engineering\s+firm|boutique|we\s+help|we\s+build|we\s+design|client\s+work)\b",
        )
        .unwrap()
    })
}

fn ai_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?i)\b(AI|ML|LLM|machine\s+learning|artificial\s+intelligence|generative|NLP|computer\s+vision|MLOps|data\s+science|RAG|agents?)\b",
        )
        .unwrap()
    })
}

fn negative_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?i)\b(university|college|student|research\s+lab|personal|hobby|fork\s+of|awesome[-\s]list|tutorial|course|bootcamp)\b",
        )
        .unwrap()
    })
}

fn bad_login_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?ix)
              (^awesome-|-tutorial|-course|-examples$)
            | ^(oracle|adobe|google|microsoft|apple|meta|amazon|ibm|sap
                |salesforce|nvidia|samsung|bytedance|alibaba|tencent|baidu
                |cloudwego|kubeflow|mlflow|mariadb|redisearch
                |ragapp|mozilla|netflix|airbnb|spotify|shopify|atlassian
                |hashicorp|elastic|redis|mongodb|couchbase-ecosystem
                |google-marketing-solutions|google-cloud-platform
                |imbue-ai|gchq|edgeandnode|hkuds|smk-is)$
            ",
        )
        .unwrap()
    })
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/// Score an org on partnership-fit heuristics. Returns (score, reasons).
///
/// Scoring is additive — positive signals raise the score, negative signals
/// lower it. Callers should filter on `score >= MIN_SCORE_TO_SAVE` (20) to
/// avoid writing obvious non-consultancies to the DB.
pub fn score_org(org: &OrgCandidate) -> (i32, Vec<String>) {
    let mut s: i32 = 0;
    let mut reasons = Vec::new();

    let blob = format!(
        "{} {} {}",
        org.name,
        org.description,
        org.pinned_summaries.join(" "),
    );

    if consultancy_re().is_match(&blob) {
        s += 30;
        reasons.push("consultancy language in description/pinned".to_string());
    }

    if ai_re().is_match(&blob) {
        s += 15;
        reasons.push("AI language in description/pinned".to_string());
    }

    if org.website.starts_with("http") {
        s += 20;
        reasons.push("has website".to_string());
    }

    if org.ai_repo_count >= 3 {
        s += 15;
        reasons.push(format!("{} AI repos", org.ai_repo_count));
    } else if org.ai_repo_count >= 1 {
        s += 5;
    }

    if org.public_repos >= 5 && org.public_repos <= 80 {
        s += 10;
        reasons.push(format!("repo count {} in sweet spot", org.public_repos));
    } else if org.public_repos > 300 {
        s -= 10;
        reasons.push("very large org (likely product co / enterprise)".to_string());
    }

    if !org.most_recent_push.is_empty() {
        if let Ok(pushed_at) = DateTime::parse_from_rfc3339(&org.most_recent_push) {
            let age_days = (Utc::now() - pushed_at.with_timezone(&Utc)).num_days();
            if age_days < 120 {
                s += 10;
                reasons.push(format!("active ({age_days}d since push)"));
            }
        }
    }

    if negative_re().is_match(&blob) {
        s -= 25;
        reasons.push("negative keyword (academic/tutorial/personal)".to_string());
    }

    if bad_login_re().is_match(&org.login) {
        s -= 40;
        reasons.push("login pattern suggests curated list / tutorial".to_string());
    }

    (s, reasons)
}

// ── GraphQL with retry ────────────────────────────────────────────────────────

async fn gql_with_retry(client: &GhClient, vars: &serde_json::Value) -> Result<GqlData> {
    let mut last_err: Option<GhError> = None;
    for (attempt, &delay) in RETRY_DELAYS_SECS.iter().enumerate() {
        if attempt > 0 {
            warn!("Rate limited by GitHub GraphQL, retrying in {delay}s...");
            tokio::time::sleep(Duration::from_secs(delay)).await;
        }
        match client.graphql::<GqlData>(QUERY, Some(vars)).await {
            Ok(data) => return Ok(data),
            Err(GhError::RateLimit { .. }) => {
                last_err = Some(GhError::RateLimit { reset_at: "unknown".into() });
            }
            Err(e) => return Err(anyhow::anyhow!("GitHub GraphQL: {e}")),
        }
    }
    Err(anyhow::anyhow!(
        "GitHub GraphQL: rate limit persisted after all retries: {:?}",
        last_err
    ))
}

// ── Slice crawl ───────────────────────────────────────────────────────────────

async fn run_slice(
    client: &GhClient,
    query: &str,
) -> Result<HashMap<String, OrgCandidate>> {
    let mut orgs: HashMap<String, OrgCandidate> = HashMap::new();
    let mut cursor: Option<String> = None;

    for page in 0..MAX_PAGES_PER_SLICE {
        let vars = serde_json::json!({
            "q": query,
            "cursor": cursor,
            "perPage": PER_PAGE,
        });

        let data = gql_with_retry(client, &vars).await?;
        let rate = &data.rate_limit;
        let q_short = &query[..query.len().min(40)];
        info!("  [{q_short:<40}] page {} orgs={} rate_remaining={}", page + 1, orgs.len(), rate.remaining);

        for node_opt in &data.search.nodes {
            let Some(node) = node_opt else { continue };
            let owner = match node.get("owner") {
                Some(o) if !o.is_null() => o,
                _ => continue,
            };
            if owner.get("__typename").and_then(|v| v.as_str()) != Some("Organization") {
                continue;
            }
            let login = match owner.get("login").and_then(|v| v.as_str()) {
                Some(l) => l.to_string(),
                None => continue,
            };

            let cand = orgs.entry(login.clone()).or_insert_with(|| {
                let pinned: Vec<String> = owner
                    .get("pinnedItems")
                    .and_then(|pi| pi.get("nodes"))
                    .and_then(|n| n.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|p| {
                                let name = p.get("name")?.as_str().unwrap_or("");
                                let desc = p.get("description").and_then(|v| v.as_str()).unwrap_or("");
                                if name.is_empty() { None } else { Some(format!("{name}: {desc}")) }
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                OrgCandidate {
                    login: login.clone(),
                    name: owner.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    description: owner.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    website: owner.get("websiteUrl").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    location: owner.get("location").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    email: owner.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    created_at: owner.get("createdAt").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    public_repos: owner
                        .get("repositories")
                        .and_then(|r| r.get("totalCount"))
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0) as u32,
                    pinned_summaries: pinned,
                    ..Default::default()
                }
            });

            cand.ai_repo_count += 1;
            cand.total_stars += node.get("stargazerCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

            let pushed = node.get("pushedAt").and_then(|v| v.as_str()).unwrap_or("");
            if pushed > cand.most_recent_push.as_str() {
                cand.most_recent_push = pushed.to_string();
            }

            if let Some(topics) = node
                .get("repositoryTopics")
                .and_then(|rt| rt.get("nodes"))
                .and_then(|n| n.as_array())
            {
                for t in topics {
                    if let Some(name) = t.get("topic").and_then(|tp| tp.get("name")).and_then(|v| v.as_str()) {
                        cand.topics_seen.insert(name.to_string());
                    }
                }
            }
        }

        if !data.search.page_info.has_next_page {
            break;
        }
        cursor = data.search.page_info.end_cursor;
        tokio::time::sleep(Duration::from_millis(PAGE_DELAY_MS)).await;
    }

    Ok(orgs)
}

// ── Main entry point ──────────────────────────────────────────────────────────

pub async fn run(pool: &PgPool, dry_run: bool) -> Result<()> {
    let client = GhClient::from_env().context("GITHUB_TOKEN / GH_TOKEN not set")?;

    let slice_results: Vec<_> = stream::iter(TOPIC_SLICES)
        .map(|&query| {
            let c = &client;
            async move {
                info!("GitHub slice: {query}");
                let result = run_slice(c, query).await;
                (query, result)
            }
        })
        .buffer_unordered(4)
        .collect()
        .await;

    let mut orgs: HashMap<String, OrgCandidate> = HashMap::new();
    for (query, result) in slice_results {
        match result {
            Ok(slice_orgs) => {
                let before = orgs.len();
                for (k, v) in slice_orgs {
                    orgs.entry(k).or_insert(v);
                }
                info!("slice {query} contributed {} new orgs (total {})", orgs.len() - before, orgs.len());
            }
            Err(e) => warn!("slice {query} failed: {e:#}"),
        }
    }

    info!("Discovered {} unique orgs, scoring...", orgs.len());

    let mut candidates: Vec<OrgCandidate> = orgs
        .into_values()
        .map(|mut c| {
            let (score, reasons) = score_org(&c);
            c.score = score;
            c.reasons = reasons;
            c
        })
        .collect();

    candidates.sort_by(|a, b| b.score.cmp(&a.score));

    info!("Top 10 GitHub orgs:");
    for c in candidates.iter().take(10) {
        info!("  {:4}  {:30}  {}", c.score, c.login, c.website);
    }

    if dry_run {
        info!("[DRY] skipping DB upsert for {} orgs", candidates.len());
        return Ok(());
    }

    let mut inserted = 0usize;
    let mut skipped = 0usize;
    let mut skipped_offshore = 0usize;
    for c in &candidates {
        if c.score < MIN_SCORE_TO_SAVE {
            skipped += 1;
            continue;
        }
        if crate::classify::is_offshore_location(&c.location) {
            info!("[GH] {} skipped — offshore: {}", c.login, c.location);
            skipped_offshore += 1;
            continue;
        }
        let consultancy = candidate_to_consultancy(c);
        match db::upsert_company(pool, &consultancy).await {
            Ok(id) => {
                info!("[GH] {} → id={id} score={}", c.login, c.score);
                inserted += 1;
            }
            Err(e) => warn!("[GH-DB] {}: {e:#}", c.login),
        }
    }

    info!("──────────────────────────────────────────────");
    info!(
        "GitHub: total={} upserted={} skipped_low_score={} skipped_offshore={}",
        candidates.len(),
        inserted,
        skipped,
        skipped_offshore
    );

    Ok(())
}

fn candidate_to_consultancy(c: &OrgCandidate) -> Consultancy {
    let canonical_domain = if c.website.starts_with("http") {
        url::Url::parse(&c.website)
            .ok()
            .and_then(|u| u.host_str().map(|h| h.to_string()))
            .map(|h| h.strip_prefix("www.").unwrap_or(&h).to_string())
            .unwrap_or_else(|| c.login.clone())
    } else {
        c.login.clone()
    };
    let key = {
        let cleaned = canonical_domain.replace('.', "-").to_lowercase();
        regex::Regex::new(r"[^a-z0-9-]")
            .unwrap()
            .replace_all(&cleaned, "")
            .to_string()
    };

    let score_normalized = (c.score as f32 / 90.0).clamp(0.0, 1.0);
    let ai_tier = if c.score >= 60 { 2 } else if c.score >= 30 { 1 } else { 0 };

    let services: Vec<String> = c
        .topics_seen
        .iter()
        .filter_map(|t| {
            Some(match t.as_str() {
                "llm" | "large-language-models" => "LLM Development",
                "rag" | "retrieval-augmented-generation" => "RAG",
                "generative-ai" => "Generative AI",
                "machine-learning-consulting" | "ai-consulting" => "AI Consulting",
                "mlops" => "MLOps",
                "vector-database" | "vector-search" => "Vector Database",
                "fine-tuning" => "Fine-Tuning",
                "prompt-engineering" => "Prompt Engineering",
                "langchain" => "LangChain",
                "ai-agents" => "AI Agents",
                _ => return None,
            })
        })
        .map(String::from)
        .collect();

    Consultancy {
        key,
        name: if c.name.is_empty() { c.login.clone() } else { c.name.clone() },
        website: c.website.clone(),
        canonical_domain,
        description: c.description.clone(),
        location: c.location.clone(),
        size: String::new(),
        source: "github".to_string(),
        services: if services.is_empty() { vec!["AI/ML".to_string()] } else { services },
        industries: vec!["Technology".to_string()],
        is_ai_focused: c.score >= 15,
        score: score_normalized,
        score_reasons: ScoreReasons {
            method: "github-discover-v1",
            keyword_hits: c.reasons.clone(),
            ai_keyword_hits: c.topics_seen.iter().cloned().collect(),
            anti_hits: vec![],
            source_bonus: 0.6,
            ai_score: score_normalized,
            consultancy_score: score_normalized,
        },
        ai_tier,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn org(login: &str) -> OrgCandidate {
        OrgCandidate { login: login.to_string(), ..Default::default() }
    }

    #[test]
    fn consultancy_language_scores_30() {
        let mut c = org("acme");
        // "we help" matches the `we\s+help` branch; "solutions" matches `solutions?`
        c.description = "We help enterprises build AI solutions and services.".to_string();
        let (score, reasons) = score_org(&c);
        assert!(score >= 30, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("consultancy language")));
    }

    #[test]
    fn ai_language_scores_15() {
        let mut c = org("acme-ai");
        c.description = "We build machine learning solutions.".to_string();
        let (score, reasons) = score_org(&c);
        assert!(score >= 15, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("AI language")));
    }

    #[test]
    fn website_scores_20() {
        let mut c = org("acme");
        c.website = "https://acme.ai".to_string();
        let (score, reasons) = score_org(&c);
        assert!(score >= 20, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("website")));
    }

    #[test]
    fn no_http_website_no_bonus() {
        let mut c = org("acme");
        c.website = "acme.ai".to_string(); // no http prefix
        let (score, _) = score_org(&c);
        assert!(score < 20, "score={score}");
    }

    #[test]
    fn three_or_more_ai_repos_scores_15() {
        let mut c = org("acme-labs");
        c.ai_repo_count = 5;
        let (score, reasons) = score_org(&c);
        assert!(score >= 15, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("AI repos")));
    }

    #[test]
    fn one_ai_repo_scores_5_no_reasons_entry() {
        let mut c = org("acme-solo");
        c.ai_repo_count = 1;
        let (score, reasons) = score_org(&c);
        assert_eq!(score, 5);
        assert!(!reasons.iter().any(|r| r.contains("AI repos")));
    }

    #[test]
    fn sweet_spot_repo_count_scores_10() {
        let mut c = org("acme-mid");
        c.public_repos = 25;
        let (score, reasons) = score_org(&c);
        assert!(score >= 10, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("sweet spot")));
    }

    #[test]
    fn too_few_repos_no_sweet_spot() {
        let mut c = org("acme-tiny");
        c.public_repos = 2;
        let (score, reasons) = score_org(&c);
        assert!(!reasons.iter().any(|r| r.contains("sweet spot")));
        assert_eq!(score, 0);
    }

    #[test]
    fn too_many_repos_subtracts_10() {
        let mut c = org("mega-corp");
        c.public_repos = 500;
        let (score, reasons) = score_org(&c);
        assert!(score <= -10, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("very large org")));
    }

    #[test]
    fn negative_words_subtract_25() {
        let mut c = org("ml-bootcamp");
        c.description = "A bootcamp tutorial for students learning machine learning.".to_string();
        let (score, reasons) = score_org(&c);
        // AI language +15, negative -25 → net -10
        assert!(score <= 5, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("negative keyword")));
    }

    #[test]
    fn awesome_login_subtracts_40() {
        let c = org("awesome-llm-resources");
        let (score, reasons) = score_org(&c);
        assert!(score <= -40, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("login pattern")));
    }

    #[test]
    fn tutorial_login_subtracts_40() {
        let c = org("ml-tutorial");
        let (score, reasons) = score_org(&c);
        assert!(score <= -40, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("login pattern")));
    }

    #[test]
    fn course_suffix_subtracts_40() {
        let c = org("llm-course");
        let (score, reasons) = score_org(&c);
        assert!(score <= -40, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("login pattern")));
    }

    #[test]
    fn examples_suffix_subtracts_40() {
        let c = org("langchain-examples");
        let (score, reasons) = score_org(&c);
        assert!(score <= -40, "score={score}");
        assert!(reasons.iter().any(|r| r.contains("login pattern")));
    }

    #[test]
    fn high_scoring_org_all_signals() {
        let mut c = org("acme-ai-labs");
        c.description =
            "AI consulting firm — we help enterprises with LLM and machine learning.".to_string();
        c.website = "https://acme-ai.com".to_string();
        c.ai_repo_count = 10;
        c.public_repos = 30;
        // 15 days ago — within the 120-day window
        c.most_recent_push = "2026-04-01T00:00:00Z".to_string();
        let (score, _) = score_org(&c);
        // consultancy(30) + AI(15) + website(20) + ai_repos(15) + sweet_spot(10) + recent(10) = 100
        assert!(score >= 80, "score={score}");
    }

    #[test]
    fn pinned_summary_triggers_consultancy_signal() {
        let mut c = org("acme");
        c.pinned_summaries = vec!["client-portal: solutions for our clients".to_string()];
        let (score, reasons) = score_org(&c);
        assert!(reasons.iter().any(|r| r.contains("consultancy language")), "score={score}");
    }

    #[test]
    fn zero_score_on_empty_org() {
        let c = org("empty-org");
        let (score, reasons) = score_org(&c);
        assert_eq!(score, 0);
        assert!(reasons.is_empty());
    }
}

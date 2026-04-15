use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── GitHub API response types ────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct GhOrg {
    pub login: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub blog: Option<String>,
    pub location: Option<String>,
    pub email: Option<String>,
    pub public_repos: u32,
    pub followers: u32,
    pub following: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub stargazers_count: u32,
    pub forks_count: u32,
    pub open_issues_count: u32,
    pub topics: Option<Vec<String>>,
    pub pushed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub archived: bool,
    pub fork: bool,
    pub size: u64,
    pub default_branch: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhContributor {
    pub login: String,
    pub contributions: u32,
}

/// Full GitHub user profile from `/users/{login}`.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GhUser {
    pub login: String,
    pub id: u64,
    pub html_url: String,
    pub avatar_url: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub blog: Option<String>,
    pub twitter_username: Option<String>,
    pub public_repos: u32,
    pub public_gists: u32,
    pub followers: u32,
    pub following: u32,
    pub hireable: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // ── Enriched fields from GraphQL contributionsCollection ──────────
    #[serde(default)]
    pub total_commit_contributions: Option<u32>,
    #[serde(default)]
    pub total_pr_contributions: Option<u32>,
    #[serde(default)]
    pub total_review_contributions: Option<u32>,
    #[serde(default)]
    pub total_repos_contributed_to: Option<u32>,
    // ── JSON-serialized enrichment blobs ──────────────────────────────
    #[serde(default)]
    pub pinned_repos_json: Option<String>,
    #[serde(default)]
    pub contributed_repos_json: Option<String>,
    #[serde(default)]
    pub organizations_json: Option<String>,
    #[serde(default)]
    pub top_repos_json: Option<String>,
    #[serde(default)]
    pub status_message: Option<String>,
    // ── Enriched fields from contributionCalendar ────────────────
    #[serde(default)]
    pub has_any_contributions: Option<bool>,
    #[serde(default)]
    pub contribution_calendar_json: Option<String>,
    #[serde(default)]
    pub activity_profile: Option<ActivityProfile>,
}

/// Pre-computed activity metrics derived from GitHub contributionCalendar.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActivityProfile {
    /// Days since GitHub account creation.
    pub account_age_days: u32,
    /// Account age as fractional years.
    pub account_age_years: f32,
    /// Most recent date with at least 1 contribution ("YYYY-MM-DD"), or None.
    pub last_active_date: Option<String>,
    /// Days since last contribution. None if never contributed.
    pub days_since_last_active: Option<u32>,
    /// Total contributions in the last 30 days.
    pub contributions_30d: u32,
    /// Total contributions in the last 90 days.
    pub contributions_90d: u32,
    /// Total contributions in the last 365 days.
    pub contributions_365d: u32,
    /// Current consecutive-days streak of contributions.
    pub current_streak_days: u32,
    /// Longest streak in the calendar window.
    pub longest_streak_days: u32,
    /// Activity trend: "rising", "stable", "declining", "dormant", "new".
    pub activity_trend: String,
    /// Average daily contributions over the last 90 days.
    pub avg_daily_90d: f32,
}

/// Parsed contribution calendar from GitHub GraphQL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributionCalendar {
    #[serde(rename = "totalContributions")]
    pub total_contributions: u32,
    pub weeks: Vec<ContributionWeek>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributionWeek {
    #[serde(rename = "contributionDays")]
    pub contribution_days: Vec<ContributionDay>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributionDay {
    #[serde(rename = "contributionCount")]
    pub contribution_count: u32,
    pub date: String, // "YYYY-MM-DD"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinnedRepo {
    pub name: String,
    pub stars: u32,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributedRepo {
    pub name_with_owner: String,
    pub stars: u32,
    pub language: Option<String>,
    pub topics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgMembership {
    pub login: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhRelease {
    pub tag_name: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhCommitActivity {
    /// Unix timestamp for the week start
    pub week: i64,
    pub total: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchReposResponse {
    pub total_count: u32,
    pub items: Vec<GhRepo>,
}

/// Response from `GET /search/users`.
#[derive(Debug, Clone, Deserialize)]
pub struct SearchUsersResponse {
    pub total_count: u32,
    pub items: Vec<SearchUserItem>,
}

/// Minimal user from GitHub search results.
#[derive(Debug, Clone, Deserialize)]
pub struct SearchUserItem {
    pub login: String,
    pub id: u64,
    pub html_url: String,
    pub avatar_url: String,
    pub score: f64,
}

/// A stargazer entry — just a user login + id.
#[derive(Debug, Clone, Deserialize)]
pub struct StargazerItem {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhApiError {
    pub message: String,
    pub documentation_url: Option<String>,
}

// ── Pattern output types ─────────────────────────────────────────────────────

/// Final scored summary for a GitHub org — designed to feed the lead-gen DB.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgPatterns {
    pub org: String,
    /// 0.0–1.0: how deeply the org uses AI/ML tooling
    pub ai_score: f32,
    /// 0.0–1.0: recent commit/release velocity
    pub activity_score: f32,
    /// 0.0–1.0: signals of active hiring / team growth
    pub hiring_score: f32,
    pub tech_stack: TechStack,
    pub ai_signals: Vec<AiSignal>,
    pub hiring_signals: Vec<HiringSignal>,
    pub activity: ActivitySummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TechStack {
    /// language → byte count across all repos
    pub languages: HashMap<String, u64>,
    pub primary_language: Option<String>,
    /// AI/ML framework names surfaced from repo topics/names
    pub ai_frameworks: Vec<String>,
    /// infra signals (e.g. "kubernetes", "terraform", "docker")
    pub infra_tools: Vec<String>,
    /// cloud provider signals
    pub cloud_providers: Vec<String>,
    /// AI/ML packages found by scanning dependency manifests
    pub dep_signals: Vec<DepSignal>,
    /// Signals extracted from the org's primary repo README
    pub readme: Option<ReadmeSignals>,
}

/// A package-manager dependency that signals AI/ML work.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DepSignal {
    /// Package from pip / npm / cargo that is a known AI/ML library
    AiPackage { manager: String, name: String },
    /// Known vector-database client library
    VectorDb { name: String },
}

/// Signals extracted from a repo's README.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ReadmeSignals {
    /// README mentions hiring / open roles
    pub hiring: bool,
    /// AI/ML concepts mentioned (e.g. "large language model", "rag")
    pub ai_mentions: Vec<String>,
    /// Has a CI/build badge (quality proxy)
    pub has_ci_badge: bool,
    /// Mentions Docker / containers (infra maturity proxy)
    pub has_docker: bool,
    /// Total word count (docs depth proxy)
    pub word_count: usize,
    /// Mentions badges / CI / coverage / pypi / license
    pub has_quality_signals: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AiSignal {
    /// Known AI/ML topic on a repo (e.g. "machine-learning", "llm")
    Topic(String),
    /// Repo name strongly implies AI work
    RepoName { repo: String },
    /// AI framework found in repo description or topics
    Framework { name: String, repo: String },
    /// High Python ratio — common proxy for ML orgs
    PythonHeavy { python_bytes: u64, total_bytes: u64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HiringSignal {
    /// New public repo created recently (within `days_ago` days)
    NewRepo { name: String, days_ago: u32 },
    /// Growing contributor count relative to repo age
    GrowingContributors { repo: String, contributor_count: u32 },
    /// Frequent releases suggest active product iteration
    FrequentReleases { repo: String, releases_per_month: f32 },
    /// Recent tech migration inferred from new-language repos
    TechMigration { new_language: String, repo: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActivitySummary {
    pub total_repos: u32,
    pub active_repos: u32,          // pushed within last 90 days
    pub avg_weekly_commits: f32,    // across all repos (sampled)
    pub total_stars: u32,
    pub total_contributors: u32,
    pub last_push: Option<DateTime<Utc>>,
    pub releases_last_90d: u32,
}

// ── Search / ICP criteria ────────────────────────────────────────────────────

/// ICP filter for GitHub org search.
#[derive(Debug, Clone, Default)]
pub struct IcpCriteria {
    /// GitHub topics the org's repos must include (OR match)
    pub topics: Vec<String>,
    /// Min star count for at least one repo
    pub min_stars: Option<u32>,
    /// Require the primary language to be one of these
    pub languages: Vec<String>,
    /// Minimum public repo count
    pub min_repos: Option<u32>,
    /// Org must have been active within this many days
    pub active_within_days: Option<u32>,
}

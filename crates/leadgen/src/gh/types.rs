use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhRelease {
    pub tag_name: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhCommitActivity {
    pub week: i64,
    pub total: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchReposResponse {
    pub total_count: u32,
    pub items: Vec<GhRepo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhApiError {
    pub message: String,
    pub documentation_url: Option<String>,
}

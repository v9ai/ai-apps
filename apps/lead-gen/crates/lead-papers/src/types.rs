use serde::{Deserialize, Serialize};

pub const EMBED_DIM: usize = 384;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paper {
    pub id: String,
    pub title: String,
    pub abstract_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub affiliation: Option<String>,
    pub email: Option<String>,
    pub tags: Vec<String>,
    pub papers: Vec<Paper>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhCandidate {
    pub login: String,
    pub name: Option<String>,
    pub bio: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub email: Option<String>,
    pub website_url: Option<String>,
    pub twitter: Option<String>,
    pub pinned_repos: Vec<RepoInfo>,
    pub top_repos: Vec<RepoInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoInfo {
    pub name: String,
    pub description: Option<String>,
    pub primary_language: Option<String>,
    pub topics: Vec<String>,
    pub stargazers: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub name_sim: f32,
    pub affil_overlap: f32,
    pub topic_cos: f32,
    pub signal_match: f32,
    pub total: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub contact_id: String,
    pub login: Option<String>,
    pub score: f32,
    pub breakdown: Option<ScoreBreakdown>,
    pub evidence: serde_json::Value,
    pub arm_id: Option<String>,
    pub status: MatchStatus,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MatchStatus {
    Matched,
    NoGithub,
    NoRelevantPapers,
}

impl MatchStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Matched => "matched",
            Self::NoGithub => "no_github",
            Self::NoRelevantPapers => "no_relevant_papers",
        }
    }
}

use serde::{Deserialize, Serialize};

pub const EMBED_DIM: usize = 384;

pub use research::ResearchPaper;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub affiliation: Option<String>,
    pub email: Option<String>,
    pub tags: Vec<String>,
    #[serde(default)]
    pub papers: Vec<ResearchPaper>,
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

pub fn paper_stable_id(p: &ResearchPaper) -> String {
    if let Some(doi) = &p.doi {
        return format!("doi:{}", doi.to_lowercase());
    }
    if let Some(src_id) = find_arxiv_id(p) {
        return format!("arxiv:{}", src_id);
    }
    format!(
        "{}:{}",
        match p.source {
            research::paper::PaperSource::SemanticScholar => "s2",
            research::paper::PaperSource::OpenAlex => "openalex",
            research::paper::PaperSource::Crossref => "crossref",
            research::paper::PaperSource::Core => "core",
            research::paper::PaperSource::Arxiv => "arxiv",
            research::paper::PaperSource::Zenodo => "zenodo",
        },
        p.source_id
    )
}

fn find_arxiv_id(p: &ResearchPaper) -> Option<String> {
    if matches!(p.source, research::paper::PaperSource::Arxiv) {
        return Some(p.source_id.clone());
    }
    p.url.as_ref().and_then(|u| {
        let prefix = "arxiv.org/abs/";
        u.find(prefix).map(|i| u[i + prefix.len()..].trim_end_matches('/').to_string())
    })
}

pub fn paper_text_for_embedding(p: &ResearchPaper) -> String {
    let abs = p.abstract_text.as_deref().unwrap_or("");
    format!("{}. {}", p.title, abs)
}

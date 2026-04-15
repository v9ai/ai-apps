//! Core types for the 20-agent research pipeline.

use serde::{Deserialize, Serialize};

/// Input personality to research.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonInput {
    pub name: String,
    pub slug: String,
    pub role: String,
    pub org: String,
    pub description: String,
    #[serde(default)]
    pub github: Option<String>,
    #[serde(default)]
    pub orcid: Option<String>,
    #[serde(default)]
    pub blog_url: Option<String>,
    #[serde(default)]
    pub papers: Vec<PaperRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperRef {
    pub title: String,
    #[serde(default)]
    pub arxiv: Option<String>,
    #[serde(default)]
    pub doi: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
}

/// Accumulated state passed between pipeline phases.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ResearchState {
    pub person: PersonInput,
    // Phase 1 — raw intelligence
    #[serde(default)]
    pub web_data: String,
    #[serde(default)]
    pub github_data: String,
    #[serde(default)]
    pub orcid_data: String,
    #[serde(default)]
    pub arxiv_data: String,
    #[serde(default)]
    pub podcast_data: String,
    #[serde(default)]
    pub news_data: String,
    #[serde(default)]
    pub hf_data: String,
    #[serde(default)]
    pub blog_data: String,
    // Phase 2 — analysis
    #[serde(default)]
    pub bio: String,
    #[serde(default)]
    pub timeline: String,
    #[serde(default)]
    pub contributions: String,
    #[serde(default)]
    pub quotes: String,
    #[serde(default)]
    pub social: String,
    #[serde(default)]
    pub expertise: String,
    #[serde(default)]
    pub competitive: String,
    #[serde(default)]
    pub collaboration: String,
    #[serde(default)]
    pub funding: String,
    #[serde(default)]
    pub conference: String,
    #[serde(default)]
    pub philosophy: String,
    // Phase 3 — synthesis
    #[serde(default)]
    pub eval: String,
    #[serde(default)]
    pub executive: String,
    #[serde(default)]
    pub questions: String,
}

impl Default for PersonInput {
    fn default() -> Self {
        Self {
            name: String::new(),
            slug: String::new(),
            role: String::new(),
            org: String::new(),
            description: String::new(),
            github: None,
            orcid: None,
            blog_url: None,
            papers: Vec::new(),
        }
    }
}

/// A single interview question.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewQuestion {
    pub category: String,
    pub question: String,
    #[serde(default)]
    pub why_this_question: Option<String>,
    #[serde(default)]
    pub expected_insight: Option<String>,
}

/// Final research output compatible with the PersonResearch TS schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonResearch {
    pub slug: String,
    pub name: String,
    pub generated_at: String,
    pub bio: String,
    pub topics: Vec<String>,
    pub timeline: Vec<TimelineEvent>,
    pub key_contributions: Vec<Contribution>,
    pub quotes: Vec<Quote>,
    pub social: std::collections::HashMap<String, String>,
    pub sources: Vec<Source>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executive_summary: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub competitive_landscape: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub technical_philosophy: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub questions: Option<Vec<InterviewQuestion>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub date: String,
    pub event: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contribution {
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quote {
    pub text: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub title: String,
    pub url: String,
}

/// The 20 agent types organized by phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AgentType {
    // Phase 1 — Intelligence Gathering (tool-heavy)
    WebResearch,
    GitHubAnalyst,
    OrcidAnalyst,
    ArxivAnalyst,
    PodcastAnalyst,
    NewsAnalyst,
    HuggingFaceAnalyst,
    BlogAnalyst,
    // Phase 2 — Deep Analysis (synthesis-heavy)
    BiographyWriter,
    TimelineArchitect,
    ContributionsAnalyst,
    QuoteSpecialist,
    SocialMapper,
    ExpertiseDomainAnalyst,
    CompetitiveLandscape,
    CollaborationNetwork,
    FundingAnalyst,
    ConferenceAnalyst,
    PhilosophyAnalyst,
    // Phase 3 — Synthesis
    QualityEvaluator,
    ExecutiveSynthesizer,
    QuestionGenerator,
}

impl AgentType {
    /// Phase 1 agents — need tool calling (web search, HTTP fetch).
    pub const PHASE1: &'static [AgentType] = &[
        AgentType::WebResearch,
        AgentType::GitHubAnalyst,
        AgentType::OrcidAnalyst,
        AgentType::ArxivAnalyst,
        AgentType::PodcastAnalyst,
        AgentType::NewsAnalyst,
        AgentType::HuggingFaceAnalyst,
        AgentType::BlogAnalyst,
    ];

    /// Phase 2 agents — pure synthesis, no tool calls.
    pub const PHASE2: &'static [AgentType] = &[
        AgentType::BiographyWriter,
        AgentType::TimelineArchitect,
        AgentType::ContributionsAnalyst,
        AgentType::QuoteSpecialist,
        AgentType::SocialMapper,
        AgentType::ExpertiseDomainAnalyst,
        AgentType::CompetitiveLandscape,
        AgentType::CollaborationNetwork,
        AgentType::FundingAnalyst,
        AgentType::ConferenceAnalyst,
        AgentType::PhilosophyAnalyst,
    ];

    /// Whether this agent needs tool calling (Phase 1 agents do).
    pub fn needs_tools(&self) -> bool {
        matches!(
            self,
            AgentType::WebResearch
                | AgentType::GitHubAnalyst
                | AgentType::OrcidAnalyst
                | AgentType::ArxivAnalyst
                | AgentType::PodcastAnalyst
                | AgentType::NewsAnalyst
                | AgentType::HuggingFaceAnalyst
                | AgentType::BlogAnalyst
        )
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AgentType::WebResearch => "web_research",
            AgentType::GitHubAnalyst => "github_analyst",
            AgentType::OrcidAnalyst => "orcid_analyst",
            AgentType::ArxivAnalyst => "arxiv_analyst",
            AgentType::PodcastAnalyst => "podcast_analyst",
            AgentType::NewsAnalyst => "news_analyst",
            AgentType::HuggingFaceAnalyst => "huggingface_analyst",
            AgentType::BlogAnalyst => "blog_analyst",
            AgentType::BiographyWriter => "biography_writer",
            AgentType::TimelineArchitect => "timeline_architect",
            AgentType::ContributionsAnalyst => "contributions_analyst",
            AgentType::QuoteSpecialist => "quote_specialist",
            AgentType::SocialMapper => "social_mapper",
            AgentType::ExpertiseDomainAnalyst => "expertise_analyst",
            AgentType::CompetitiveLandscape => "competitive_landscape",
            AgentType::CollaborationNetwork => "collaboration_network",
            AgentType::FundingAnalyst => "funding_analyst",
            AgentType::ConferenceAnalyst => "conference_analyst",
            AgentType::PhilosophyAnalyst => "philosophy_analyst",
            AgentType::QualityEvaluator => "quality_evaluator",
            AgentType::ExecutiveSynthesizer => "executive_synthesizer",
            AgentType::QuestionGenerator => "question_generator",
        }
    }

    /// State key this agent writes to.
    pub fn state_key(&self) -> &'static str {
        match self {
            AgentType::WebResearch => "web_data",
            AgentType::GitHubAnalyst => "github_data",
            AgentType::OrcidAnalyst => "orcid_data",
            AgentType::ArxivAnalyst => "arxiv_data",
            AgentType::PodcastAnalyst => "podcast_data",
            AgentType::NewsAnalyst => "news_data",
            AgentType::HuggingFaceAnalyst => "hf_data",
            AgentType::BlogAnalyst => "blog_data",
            AgentType::BiographyWriter => "bio",
            AgentType::TimelineArchitect => "timeline",
            AgentType::ContributionsAnalyst => "contributions",
            AgentType::QuoteSpecialist => "quotes",
            AgentType::SocialMapper => "social",
            AgentType::ExpertiseDomainAnalyst => "expertise",
            AgentType::CompetitiveLandscape => "competitive",
            AgentType::CollaborationNetwork => "collaboration",
            AgentType::FundingAnalyst => "funding",
            AgentType::ConferenceAnalyst => "conference",
            AgentType::PhilosophyAnalyst => "philosophy",
            AgentType::QualityEvaluator => "eval",
            AgentType::ExecutiveSynthesizer => "executive",
            AgentType::QuestionGenerator => "questions",
        }
    }
}

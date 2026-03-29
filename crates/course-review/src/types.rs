//! Core types for the course-review pipeline.

use serde::{Deserialize, Serialize};

/// A single expert's evaluation of one dimension.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertScore {
    /// 0-10 integer rating
    pub score: u8,
    /// 2-3 sentence explanation
    pub reasoning: String,
    /// 2-3 positive observations
    pub strengths: Vec<String>,
    /// 1-2 negative observations
    pub weaknesses: Vec<String>,
}

/// Course metadata passed to the review pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseInput {
    pub course_id: String,
    pub title: String,
    pub url: String,
    pub provider: String,
    pub description: String,
    /// "Beginner" | "Intermediate" | "Advanced"
    pub level: String,
    /// 0.0–5.0 scale
    pub rating: f32,
    pub review_count: u32,
    pub duration_hours: f32,
    pub is_free: bool,
}

impl CourseInput {
    /// Formatted summary for expert prompts.
    pub fn summary(&self) -> String {
        let price = if self.is_free { "Free" } else { "Paid" };
        format!(
            "Title: {}\nProvider: {}\nURL: {}\nLevel: {}\nRating: {:.1}/5 ({} reviews)\nDuration: ~{:.0}h\nPrice: {}\nDescription: {}",
            self.title,
            self.provider,
            self.url,
            self.level,
            self.rating,
            self.review_count,
            self.duration_hours,
            price,
            if self.description.is_empty() { "N/A" } else { &self.description },
        )
    }
}

/// Overall verdict computed from weighted aggregate score.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Verdict {
    /// aggregate_score >= 8.5
    Excellent,
    /// aggregate_score >= 7.0
    Recommended,
    /// aggregate_score >= 5.5
    Average,
    /// aggregate_score < 5.5
    Skip,
}

impl Verdict {
    pub fn from_score(score: f32) -> Self {
        if score >= 8.5 {
            Verdict::Excellent
        } else if score >= 7.0 {
            Verdict::Recommended
        } else if score >= 5.5 {
            Verdict::Average
        } else {
            Verdict::Skip
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Verdict::Excellent    => "excellent",
            Verdict::Recommended  => "recommended",
            Verdict::Average      => "average",
            Verdict::Skip         => "skip",
        }
    }
}

impl std::fmt::Display for Verdict {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// The 10 expert dimensions. Used for prompt selection and result mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ExpertType {
    Pedagogy,
    TechnicalAccuracy,
    ContentDepth,
    PracticalApplication,
    InstructorClarity,
    CurriculumFit,
    Prerequisites,
    AiDomainRelevance,
    CommunityHealth,
    ValueProposition,
}

impl ExpertType {
    pub const ALL: [ExpertType; 10] = [
        ExpertType::Pedagogy,
        ExpertType::TechnicalAccuracy,
        ExpertType::ContentDepth,
        ExpertType::PracticalApplication,
        ExpertType::InstructorClarity,
        ExpertType::CurriculumFit,
        ExpertType::Prerequisites,
        ExpertType::AiDomainRelevance,
        ExpertType::CommunityHealth,
        ExpertType::ValueProposition,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            ExpertType::Pedagogy               => "pedagogy",
            ExpertType::TechnicalAccuracy      => "technical_accuracy",
            ExpertType::ContentDepth           => "content_depth",
            ExpertType::PracticalApplication   => "practical_application",
            ExpertType::InstructorClarity      => "instructor_clarity",
            ExpertType::CurriculumFit          => "curriculum_fit",
            ExpertType::Prerequisites          => "prerequisites",
            ExpertType::AiDomainRelevance      => "ai_domain_relevance",
            ExpertType::CommunityHealth        => "community_health",
            ExpertType::ValueProposition       => "value_proposition",
        }
    }

    /// Aggregation weight for computing aggregate_score.
    pub fn weight(&self) -> f32 {
        match self {
            ExpertType::Pedagogy               => 0.12,
            ExpertType::TechnicalAccuracy      => 0.15,
            ExpertType::ContentDepth           => 0.12,
            ExpertType::PracticalApplication   => 0.12,
            ExpertType::InstructorClarity      => 0.10,
            ExpertType::CurriculumFit          => 0.08,
            ExpertType::Prerequisites          => 0.08,
            ExpertType::AiDomainRelevance      => 0.15,
            ExpertType::CommunityHealth        => 0.04,
            ExpertType::ValueProposition       => 0.04,
        }
    }
}

/// Complete review produced by the 10-expert pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseReview {
    pub course_id: String,
    pub title: String,
    pub url: String,
    pub provider: String,
    pub level: String,
    pub rating: f32,
    pub review_count: u32,
    pub duration_hours: f32,
    pub is_free: bool,
    // ── Expert scores ─────────────────────────────────────────
    pub pedagogy: ExpertScore,
    pub technical_accuracy: ExpertScore,
    pub content_depth: ExpertScore,
    pub practical_application: ExpertScore,
    pub instructor_clarity: ExpertScore,
    pub curriculum_fit: ExpertScore,
    pub prerequisites: ExpertScore,
    pub ai_domain_relevance: ExpertScore,
    pub community_health: ExpertScore,
    pub value_proposition: ExpertScore,
    // ── Aggregated ────────────────────────────────────────────
    pub aggregate_score: f32,
    pub verdict: Verdict,
    pub summary: String,
    pub top_strengths: Vec<String>,
    pub key_weaknesses: Vec<String>,
    pub reviewed_at: String,      // ISO 8601
    pub model_version: String,    // GGUF filename used
}

impl CourseReview {
    /// Get a named expert score by ExpertType.
    pub fn get_score(&self, expert: ExpertType) -> &ExpertScore {
        match expert {
            ExpertType::Pedagogy               => &self.pedagogy,
            ExpertType::TechnicalAccuracy      => &self.technical_accuracy,
            ExpertType::ContentDepth           => &self.content_depth,
            ExpertType::PracticalApplication   => &self.practical_application,
            ExpertType::InstructorClarity      => &self.instructor_clarity,
            ExpertType::CurriculumFit          => &self.curriculum_fit,
            ExpertType::Prerequisites          => &self.prerequisites,
            ExpertType::AiDomainRelevance      => &self.ai_domain_relevance,
            ExpertType::CommunityHealth        => &self.community_health,
            ExpertType::ValueProposition       => &self.value_proposition,
        }
    }
}

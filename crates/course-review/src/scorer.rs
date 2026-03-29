//! Expert scorer: runs 10 LLM experts sequentially and aggregates results in pure Rust.

use std::collections::HashMap;

use tracing::info;

use crate::error::{Error, Result};
use crate::llm::LocalLlm;
use crate::prompts::expert_prompt;
use crate::types::{CourseInput, CourseReview, ExpertScore, ExpertType, Verdict};

pub struct ExpertScorer {
    llm: LocalLlm,
}

impl ExpertScorer {
    pub fn new(llm: LocalLlm) -> Self {
        Self { llm }
    }

    /// Run all 10 experts sequentially, then aggregate in Rust.
    pub fn review(&mut self, course: &CourseInput) -> Result<CourseReview> {
        let model_version = self.llm.model_name.clone();
        let course_info = course.summary();

        let mut scores: HashMap<ExpertType, ExpertScore> = HashMap::new();

        for expert in ExpertType::ALL {
            info!("Running expert: {}", expert.as_str());
            let prompt = expert_prompt(expert, &course_info);
            let raw = self.llm.generate(&prompt, 512)?;
            let score = parse_expert_score(&raw, expert)?;
            scores.insert(expert, score);
        }

        // Aggregate in Rust (no LLM needed)
        let aggregate_score = compute_aggregate(&scores);
        let verdict = Verdict::from_score(aggregate_score);
        let (top_strengths, key_weaknesses) = collect_top_feedback(&scores);
        let summary = build_summary(course, aggregate_score, &verdict, &scores);

        let reviewed_at = chrono::Utc::now().to_rfc3339();

        Ok(CourseReview {
            course_id: course.course_id.clone(),
            title: course.title.clone(),
            url: course.url.clone(),
            provider: course.provider.clone(),
            level: course.level.clone(),
            rating: course.rating,
            review_count: course.review_count,
            duration_hours: course.duration_hours,
            is_free: course.is_free,
            pedagogy: scores.remove(&ExpertType::Pedagogy).unwrap(),
            technical_accuracy: scores.remove(&ExpertType::TechnicalAccuracy).unwrap(),
            content_depth: scores.remove(&ExpertType::ContentDepth).unwrap(),
            practical_application: scores.remove(&ExpertType::PracticalApplication).unwrap(),
            instructor_clarity: scores.remove(&ExpertType::InstructorClarity).unwrap(),
            curriculum_fit: scores.remove(&ExpertType::CurriculumFit).unwrap(),
            prerequisites: scores.remove(&ExpertType::Prerequisites).unwrap(),
            ai_domain_relevance: scores.remove(&ExpertType::AiDomainRelevance).unwrap(),
            community_health: scores.remove(&ExpertType::CommunityHealth).unwrap(),
            value_proposition: scores.remove(&ExpertType::ValueProposition).unwrap(),
            aggregate_score,
            verdict,
            summary,
            top_strengths,
            key_weaknesses,
            reviewed_at,
            model_version,
        })
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Strip optional markdown code fences then deserialize into `ExpertScore`.
fn parse_expert_score(raw: &str, expert: ExpertType) -> Result<ExpertScore> {
    // Remove leading/trailing whitespace first.
    let trimmed = raw.trim();

    // Strip ```json ... ``` or ``` ... ``` fences if present.
    let json_str = if trimmed.starts_with("```") {
        // Drop the opening fence line.
        let after_open = trimmed
            .splitn(2, '\n')
            .nth(1)
            .unwrap_or(trimmed);
        // Drop the closing fence if it exists.
        if let Some(pos) = after_open.rfind("```") {
            after_open[..pos].trim()
        } else {
            after_open.trim()
        }
    } else {
        trimmed
    };

    serde_json::from_str::<ExpertScore>(json_str).map_err(|e| Error::MalformedOutput {
        expert: expert.as_str().to_owned(),
        reason: e.to_string(),
    })
}

/// Weighted sum of all expert scores, clamped to [0.0, 10.0].
fn compute_aggregate(scores: &HashMap<ExpertType, ExpertScore>) -> f32 {
    let weighted_sum: f32 = scores
        .iter()
        .map(|(expert, score)| score.score as f32 * expert.weight())
        .sum();

    weighted_sum.clamp(0.0, 10.0)
}

/// Collect strengths (first 3, deduplicated) and weaknesses (first 2)
/// by iterating over `ExpertType::ALL` to preserve a stable order.
fn collect_top_feedback(
    scores: &HashMap<ExpertType, ExpertScore>,
) -> (Vec<String>, Vec<String>) {
    let mut strengths: Vec<String> = Vec::new();
    let mut weaknesses: Vec<String> = Vec::new();

    for expert in ExpertType::ALL {
        if let Some(score) = scores.get(&expert) {
            for s in &score.strengths {
                let s = s.trim().to_owned();
                if !strengths.contains(&s) {
                    strengths.push(s);
                }
            }
            for w in &score.weaknesses {
                let w = w.trim().to_owned();
                if !weaknesses.contains(&w) {
                    weaknesses.push(w);
                }
            }
        }
    }

    strengths.truncate(3);
    weaknesses.truncate(2);

    (strengths, weaknesses)
}

/// One-line summary identifying the highest and lowest scoring experts.
fn build_summary(
    course: &CourseInput,
    score: f32,
    verdict: &Verdict,
    scores: &HashMap<ExpertType, ExpertScore>,
) -> String {
    // Find best and worst experts by raw score (ties broken by ALL order).
    let mut best_expert = ExpertType::ALL[0];
    let mut worst_expert = ExpertType::ALL[0];
    let mut best_score = scores
        .get(&best_expert)
        .map(|s| s.score)
        .unwrap_or(0);
    let mut worst_score = best_score;

    for expert in ExpertType::ALL {
        if let Some(s) = scores.get(&expert) {
            if s.score > best_score {
                best_score = s.score;
                best_expert = expert;
            }
            if s.score < worst_score {
                worst_score = s.score;
                worst_expert = expert;
            }
        }
    }

    format!(
        "{} scores {:.1}/10 ({}). Strongest: {}. Weakest: {}.",
        course.title,
        score,
        verdict,
        best_expert.as_str(),
        worst_expert.as_str(),
    )
}

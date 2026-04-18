//! Qwen2.5-Instruct chat prompts for the 10 expert course reviewers.
//!
//! Personas are loaded from HuggingFace bundles (`vadimnicolai/qwen-course-<slug>`)
//! with a local-dev fallback under `apps/hoa/agent-bundles/<slug>/`. See
//! `crates/hf-agent` for the loader.

use crate::types::ExpertType;

/// Format a Qwen2.5-Instruct chat prompt.
///
/// Template:
/// ```text
/// <|im_start|>system
/// {system}
/// <|im_end|>
/// <|im_start|>user
/// {user}
/// <|im_end|>
/// <|im_start|>assistant
/// ```
/// EOS token: `<|im_end|>`
pub fn qwen_chat(system: &str, user: &str) -> String {
    format!(
        "<|im_start|>system\n{system}\n<|im_end|>\n<|im_start|>user\n{user}\n<|im_end|>\n<|im_start|>assistant\n"
    )
}

/// Build a full Qwen2.5 chat prompt for the given expert.
pub fn expert_prompt(expert: ExpertType, course_info: &str) -> String {
    let system = expert_system(expert);
    let user = format!(
        "Review this course and output ONLY a JSON object with keys: score (integer 0-10), reasoning (string), strengths (array of strings), weaknesses (array of strings).\n\nCourse:\n{course_info}"
    );
    qwen_chat(&system, &user)
}

/// Build the aggregation summary (pure Rust — no LLM needed).
/// Returns a formatted display string of all 10 expert scores.
pub fn scores_display(review: &crate::types::CourseReview) -> String {
    use crate::types::ExpertType;
    let mut lines = Vec::new();
    for expert in ExpertType::ALL {
        let s = review.get_score(expert);
        lines.push(format!(
            "  {:25} {:2}/10  — {}",
            expert.as_str(),
            s.score,
            &s.reasoning[..s.reasoning.len().min(80)]
        ));
    }
    lines.join("\n")
}

/// Map an `ExpertType` to its HF bundle slug (also its local dir name).
fn expert_slug(expert: ExpertType) -> &'static str {
    match expert {
        ExpertType::Pedagogy             => "pedagogy",
        ExpertType::TechnicalAccuracy    => "technical-accuracy",
        ExpertType::ContentDepth         => "content-depth",
        ExpertType::PracticalApplication => "practical-application",
        ExpertType::InstructorClarity    => "instructor-clarity",
        ExpertType::CurriculumFit        => "curriculum-fit",
        ExpertType::Prerequisites        => "prerequisites",
        ExpertType::AiDomainRelevance    => "ai-domain-relevance",
        ExpertType::CommunityHealth      => "community-health",
        ExpertType::ValueProposition     => "value-proposition",
    }
}

/// Fetch the expert's system prompt. Panics on first use if the bundle cannot
/// load — the 10 bundles are a hard requirement of the pipeline, not optional.
fn expert_system(expert: ExpertType) -> String {
    let slug = expert_slug(expert);
    hf_agent::load_agent(slug, hf_agent::Family::Course)
        .unwrap_or_else(|e| panic!("load bundle '{slug}': {e}"))
        .system_prompt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_ten_experts_load() {
        for expert in ExpertType::ALL {
            let s = expert_system(*expert);
            assert!(
                !s.is_empty(),
                "{} bundle produced empty system prompt",
                expert_slug(*expert)
            );
        }
    }
}

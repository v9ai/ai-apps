use anyhow::Result;
use regex::Regex;
use serde_json::json;
use tracing::info;

use crate::d1::D1Client;
use crate::{Confidence, JobRow, RoleTagResult, status};

/// Non-target role pattern — prevents false positives from incidental ML mentions.
fn non_target_pattern() -> Regex {
    Regex::new(
        r"(?i)\b(backend engineer|java developer|\.net developer|devops engineer\
|data analyst|sre|site reliability)\b",
    )
    .unwrap()
}

/// Role tagging system prompt.
const ROLE_SYSTEM_PROMPT: &str = "\
You are a job-classification specialist. \
Analyze job postings to identify target roles: Frontend/React engineers and AI/ML/LLM engineers. \
Return structured JSON with clear confidence assessment.";

/// Role tagging user prompt template.
const ROLE_USER_PROMPT: &str = r#"Analyze this job posting and classify the role type.

JOB DETAILS:
- Title:       {title}
- Location:    {location}
- Description: {description}

CLASSIFICATION GUIDANCE:

FRONTEND/REACT INDICATOR:
- Look for: React, Vue, Angular, Next.js, TypeScript, JavaScript, HTML/CSS
- HIGH confidence if: Title explicitly mentions React/Frontend AND description has React/JS frameworks

AI/ML/LLM ENGINEER INDICATOR:
- Look for: AI, Machine Learning, LLM, RAG, embeddings, vector search, transformers, PyTorch
- Look for: "AI Engineer", "ML Engineer", "Data Scientist (ML-focused)", "LLM Engineer"
- Look for: "NLP", "computer vision", "deep learning", "GenAI", "Foundation Model"
- HIGH confidence if: Title or description explicitly includes AI/ML terminology

DUAL ROLES: Both can be true for "AI-powered React engineer" or "ML + Frontend" roles

CONFIDENCE LEVELS:
- HIGH: Role title clearly indicates specialization + skills match
- MEDIUM: Mixed signals, senior generalist with tech requirements
- LOW: Insufficient information, generic "engineer" title

Return ONLY valid JSON:
{{"isFrontendReact": boolean, "isAIEngineer": boolean, "confidence": "high" | "medium" | "low", "reason": "Brief explanation"}}"#;

/// Tier 1: Fast keyword heuristic — no LLM calls.
pub fn keyword_role_tag(job: &JobRow) -> Option<RoleTagResult> {
    let title = job.get_str("title").to_lowercase();
    let desc = &job.get_str("description").to_lowercase();
    let desc = &desc[..desc.len().min(5000)];
    let text = format!("{title}\n{desc}");

    // Hard exclusion — explicit non-target roles (title only)
    if non_target_pattern().is_match(&title) {
        return Some(RoleTagResult {
            frontend_react: false,
            ai_engineer: false,
            confidence: Confidence::High,
            reason: "Heuristic: explicit non-target role".to_string(),
            source: "heuristic".to_string(),
        });
    }

    // Frontend / React signals
    let has_react = Regex::new(r"(?i)\breact(\.js)?\b").unwrap().is_match(&text)
        || text.contains("next.js");
    let has_frontend = Regex::new(r"(?i)\b(frontend|ui engineer|web ui)\b")
        .unwrap()
        .is_match(&text);

    // AI Engineer signals
    let has_ai_title = Regex::new(
        r"(?i)\b(ai engineer|ml engineer|llm engineer|ai/ml|mlops\
|data scientist|applied scientist|research engineer|research scientist\
|nlp engineer|computer vision|genai|generative ai|prompt engineer\
|ai architect|ml platform|machine learning engineer\
|ai infrastructure|deep learning\
|foundation model|ai specialist|ml specialist|llm specialist\
|ai product|ai software|ml software|ai developer|ml developer\
|intelligence engineer|language model|model engineer\
|ai lead|ml lead|head of ai|head of ml)\b",
    )
    .unwrap()
    .is_match(&text);

    let ai_stack_keywords = [
        "machine learning", "llm", "rag", "embedding", "vector db", "fine-tun",
        "pytorch", "tensorflow", "langchain", "hugging face", "transformers",
        "openai", "anthropic", "claude", "gpt-", "neural network",
        "deep learning", "reinforcement learning", "natural language processing",
        "computer vision", "model training", "model serving", "mlflow",
        "weights & biases", "wandb", "feature store", "model deploy",
        "vllm", "ollama", "mistral", "llama", "gemini", "vertex ai",
        "sagemaker", "bedrock", "azure openai", "semantic kernel",
        "vector search", "retrieval augmented", "knowledge graph",
        "diffusion model", "stable diffusion", "multimodal",
    ];
    let has_ai_stack = ai_stack_keywords.iter().any(|kw| text.contains(kw));

    if has_react && has_frontend {
        return Some(RoleTagResult {
            frontend_react: true,
            ai_engineer: has_ai_title && has_ai_stack,
            confidence: Confidence::High,
            reason: "Heuristic: React + frontend keywords".to_string(),
            source: "heuristic".to_string(),
        });
    }

    if has_ai_title && has_ai_stack {
        return Some(RoleTagResult {
            frontend_react: false,
            ai_engineer: true,
            confidence: Confidence::High,
            reason: "Heuristic: AI engineer title + stack keywords".to_string(),
            source: "heuristic".to_string(),
        });
    }

    None // Ambiguous — escalate to LLM
}

/// Run role tagging via DeepSeek for a single job.
pub async fn tag_with_deepseek(
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<RoleTagResult> {
    let title = job.title.as_deref().unwrap_or("N/A");
    let location = job.location.as_deref().unwrap_or("Not specified");
    let desc = job.description.as_deref().unwrap_or("");
    let desc_truncated = &desc[..desc.len().min(6000)];

    let user_prompt = ROLE_USER_PROMPT
        .replace("{title}", title)
        .replace("{location}", location)
        .replace("{description}", desc_truncated);

    let request = deepseek::ChatRequest {
        model: crate::DEFAULT_MODEL.to_string(),
        messages: vec![
            deepseek::system_msg(ROLE_SYSTEM_PROMPT),
            deepseek::user_msg(&user_prompt),
        ],
        tools: None,
        tool_choice: None,
        temperature: Some(0.1),
        max_tokens: Some(300),
        stream: Some(false),
    };

    let response = deepseek.chat(&request).await?;
    let content = response
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    if content.is_empty() {
        anyhow::bail!("Empty content in DeepSeek role tag response");
    }

    let json_str = crate::classifier::extract_json_object(content)?;
    let raw: serde_json::Value = serde_json::from_str(json_str)?;

    Ok(RoleTagResult {
        frontend_react: raw.get("isFrontendReact")
            .or_else(|| raw.get("frontend_react"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        ai_engineer: raw.get("isAIEngineer")
            .or_else(|| raw.get("ai_engineer"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        confidence: match raw.get("confidence").and_then(|v| v.as_str()).unwrap_or("low") {
            "high" => Confidence::High,
            "medium" => Confidence::Medium,
            _ => Confidence::Low,
        },
        reason: raw.get("reason").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        source: "deepseek".to_string(),
    })
}

/// Run the full role tagging pipeline (heuristic -> DeepSeek) for a single job.
pub async fn tag_role(
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> RoleTagResult {
    // Tier 1 — Keyword heuristic
    if let Some(result) = keyword_role_tag(job) {
        if result.confidence == Confidence::High {
            return result;
        }
    }

    // Tier 2 — DeepSeek
    match tag_with_deepseek(job, deepseek).await {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("DeepSeek role tag failed: {e}");
            RoleTagResult {
                frontend_react: false,
                ai_engineer: false,
                confidence: Confidence::Low,
                reason: format!("All tagging tiers failed: {e}"),
                source: "none".to_string(),
            }
        }
    }
}

/// Persist role tags to D1 and advance job status.
pub async fn persist_role_tags(
    db: &D1Client,
    job_id: i64,
    tags: &RoleTagResult,
) -> Result<()> {
    let is_target = tags.frontend_react || tags.ai_engineer;
    let next_status = if is_target || tags.confidence != Confidence::High {
        status::ROLE_MATCH // fail-open: uncertain jobs proceed
    } else {
        status::ROLE_NOMATCH
    };

    db.execute(
        "UPDATE jobs SET role_frontend_react = ?, role_ai_engineer = ?, \
         role_confidence = ?, role_reason = ?, role_source = ?, \
         status = ?, updated_at = datetime('now') WHERE id = ?",
        Some(vec![
            json!(tags.frontend_react as i32),
            json!(tags.ai_engineer as i32),
            json!(tags.confidence.as_str()),
            json!(tags.reason),
            json!(tags.source),
            json!(next_status),
            json!(job_id),
        ]),
    )
    .await
}

/// Batch tag all jobs at status='enhanced'.
pub async fn tag_roles_batch(
    db: &D1Client,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    limit: u32,
) -> Result<RoleTagStats> {
    info!("Finding jobs with status='enhanced' for role tagging...");

    let jobs: Vec<JobRow> = db
        .query_as(
            "SELECT id, title, location, description FROM jobs \
             WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            Some(vec![json!(status::ENHANCED), json!(limit)]),
        )
        .await?;

    info!("Found {} jobs to role-tag", jobs.len());

    let mut stats = RoleTagStats::default();

    for job in &jobs {
        info!("Role-tagging job {}: {:?}", job.id, job.title);

        let result = tag_role(job, deepseek).await;
        let is_target = result.frontend_react || result.ai_engineer;

        match persist_role_tags(db, job.id, &result).await {
            Ok(()) => {
                stats.processed += 1;
                if is_target {
                    stats.target_role += 1;
                } else {
                    stats.irrelevant += 1;
                }
                match result.source.as_str() {
                    "heuristic" => stats.heuristic += 1,
                    "deepseek" => stats.deepseek += 1,
                    _ => {}
                }
            }
            Err(e) => {
                tracing::error!("Error persisting role tags for job {}: {e}", job.id);
                stats.errors += 1;
            }
        }

        if result.source == "deepseek" {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }

    Ok(stats)
}

#[derive(Debug, Default)]
pub struct RoleTagStats {
    pub processed: u32,
    pub target_role: u32,
    pub irrelevant: u32,
    pub errors: u32,
    pub heuristic: u32,
    pub deepseek: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_job(title: &str, desc: &str) -> JobRow {
        JobRow {
            id: 1,
            title: Some(title.to_string()),
            description: Some(desc.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn detects_ai_engineer() {
        let job = make_job(
            "Senior AI Engineer",
            "Build RAG pipelines with LLMs, PyTorch, and vector search for our machine learning platform",
        );
        let result = keyword_role_tag(&job).unwrap();
        assert!(result.ai_engineer);
        assert_eq!(result.confidence, Confidence::High);
    }

    #[test]
    fn detects_frontend() {
        let job = make_job(
            "Frontend Engineer",
            "Build UI components with React and Next.js",
        );
        let result = keyword_role_tag(&job).unwrap();
        assert!(result.frontend_react);
    }

    #[test]
    fn rejects_backend() {
        let job = make_job("Backend Engineer", "Build APIs with Java Spring");
        let result = keyword_role_tag(&job).unwrap();
        assert!(!result.frontend_react);
        assert!(!result.ai_engineer);
    }

    #[test]
    fn escalates_ambiguous() {
        let job = make_job("Software Engineer", "Join our team to build great products.");
        assert!(keyword_role_tag(&job).is_none());
    }
}

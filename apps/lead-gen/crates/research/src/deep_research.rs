/// Dual-model deep research for application interview prep.
///
/// Phase 1: DeepSeek Chat generates targeted research questions from job context.
/// Phase 2: For each question, DeepSeek Reasoner + Qwen Max run in parallel
///          via the shared `DualModelResearcher`.
///
/// Writes JSON result to `ai_deep_research` column in D1.
use crate::app_context::AppContext;
use crate::d1::D1Client;
use anyhow::{Context, Result};
use research::DualModelResearcher;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

// ─── JSON shape (matches GraphQL schema) ────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeepResearch {
    pub questions: Vec<ResearchQuestion>,
    pub generated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchQuestion {
    pub question: String,
    pub category: String,
    pub deepseek: ModelResponse,
    pub qwen: ModelResponse,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelResponse {
    pub model: String,
    pub content: String,
    pub reasoning: Option<String>,
}

// ─── Question generation (Phase 1) ─────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct GeneratedQuestions {
    questions: Vec<QuestionDef>,
}

#[derive(Debug, Deserialize)]
struct QuestionDef {
    question: String,
    category: String,
}

async fn generate_questions(
    ds_client: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    ctx: &AppContext,
) -> Result<Vec<QuestionDef>> {
    let plain_desc = ctx.plain_job_description(8000);

    let system_msg = deepseek::ChatMessage {
        role: "system".into(),
        content: deepseek::ChatContent::Text(
            "You are a senior technical interview researcher. Return ONLY valid JSON — no markdown fences.".into()
        ),
        reasoning_content: None,
        tool_calls: None,
        tool_call_id: None,
        name: None,
    };

    let user_msg = deepseek::ChatMessage {
        role: "user".into(),
        content: deepseek::ChatContent::Text(format!(
            r#"I'm preparing for a technical interview at {} for the role of {}.

Job description:
{}

Generate 5-6 targeted deep research questions that would help me prepare thoroughly. Each question should require multi-paragraph expert-level analysis. Categorize each as one of: Architecture, Domain, System Design, Production, Testing, Performance, or Security.

Return JSON:
{{
  "questions": [
    {{ "question": "...", "category": "Architecture|Domain|System Design|Production|Testing|Performance|Security" }}
  ]
}}"#,
            ctx.company_name, ctx.job_title, plain_desc
        )),
        reasoning_content: None,
        tool_calls: None,
        tool_call_id: None,
        name: None,
    };

    let response = ds_client
        .chat(&deepseek::ChatRequest {
            model: "deepseek-chat".into(),
            messages: vec![system_msg, user_msg],
            tools: None,
            tool_choice: None,
            temperature: Some(0.3),
            max_tokens: Some(1500),
            stream: None,
        })
        .await
        .context("Question generation DeepSeek call failed")?;

    let content = response
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    // Strip markdown fences if present
    let clean = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let parsed: GeneratedQuestions =
        serde_json::from_str(clean).context("Failed to parse question generation response")?;

    if parsed.questions.is_empty() {
        anyhow::bail!("No research questions generated");
    }

    info!(count = parsed.questions.len(), "Generated research questions");
    Ok(parsed.questions)
}

// ─── Main entry point ───────────────────────────────────────────────────────

pub async fn run(ctx: &AppContext, d1: &D1Client) -> Result<()> {
    let app_id = ctx.app_id;
    info!(
        app_id,
        job_title = %ctx.job_title,
        company = %ctx.company_name,
        "Starting deep research"
    );

    // Phase 1: Generate questions
    let ds_client = deepseek::client_from_env()
        .context("Failed to create DeepSeek client")?;

    let questions = generate_questions(&ds_client, ctx).await?;

    // Phase 2: Dual-model research
    let researcher = DualModelResearcher::from_env()
        .context("Failed to init dual-model researcher")?;

    let plain_desc = ctx.plain_job_description(4000);
    let system_prompt = format!(
        "You are a senior staff engineer preparing a candidate for a technical interview \
         at {} ({}). Provide a thorough, expert-level answer covering:\n\
         - Core concepts and mechanisms\n\
         - Trade-offs and design decisions\n\
         - Real-world examples and production considerations\n\
         - How to articulate this in an interview setting\n\n\
         Write in markdown. Be concrete and specific — no generic advice.\n\n\
         Job context:\n{}",
        ctx.company_name, ctx.job_title, plain_desc
    );

    let mut research_questions = Vec::with_capacity(questions.len());

    for (i, q) in questions.iter().enumerate() {
        eprintln!(
            "\n[{}/{}] {} — {}",
            i + 1,
            questions.len(),
            q.category,
            &q.question[..q.question.len().min(80)]
        );

        match researcher.query(&system_prompt, &q.question).await {
            Ok(dual) => {
                research_questions.push(ResearchQuestion {
                    question: q.question.clone(),
                    category: q.category.clone(),
                    deepseek: ModelResponse {
                        model: dual.deepseek.model,
                        content: dual.deepseek.content,
                        reasoning: if dual.deepseek.reasoning.is_empty() {
                            None
                        } else {
                            Some(dual.deepseek.reasoning)
                        },
                    },
                    qwen: ModelResponse {
                        model: dual.qwen.model,
                        content: dual.qwen.content,
                        reasoning: None,
                    },
                });
            }
            Err(e) => {
                eprintln!("  ERROR on question {}: {e:#}", i + 1);
            }
        }
    }

    if research_questions.is_empty() {
        anyhow::bail!("All research queries failed — nothing to save");
    }

    let data = DeepResearch {
        questions: research_questions,
        generated_at: chrono::Utc::now().to_rfc3339(),
    };

    let json_str = serde_json::to_string(&data)?;
    info!(app_id, bytes = json_str.len(), questions = data.questions.len(), "Writing deep research to D1");

    d1.execute(
        "UPDATE applications SET ai_deep_research = ?1, updated_at = datetime('now') WHERE id = ?2",
        vec![json_str.into(), json!(app_id)],
    )
    .await
    .context("writing deep research data to D1")?;

    info!(app_id, "Deep research data saved to D1");
    Ok(())
}

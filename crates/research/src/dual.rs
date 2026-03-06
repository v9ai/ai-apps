use anyhow::{Context, Result};
use tracing::info;

/// Response from a single model for a research question.
#[derive(Debug, Clone)]
pub struct ModelResponse {
    pub model: String,
    pub content: String,
    /// DeepSeek Reasoner chain-of-thought (empty for Qwen).
    pub reasoning: String,
}

/// Combined response from both models for a single question.
#[derive(Debug, Clone)]
pub struct DualResponse {
    pub question: String,
    pub deepseek: ModelResponse,
    pub qwen: ModelResponse,
}

/// Dual-model researcher: queries DeepSeek Reasoner and Qwen in parallel.
pub struct DualModelResearcher {
    deepseek_client: deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    qwen_client: qwen::Client,
    qwen_model: String,
}

impl DualModelResearcher {
    pub fn from_env() -> Result<Self> {
        let deepseek_client = deepseek::client_from_env()
            .context("Failed to create DeepSeek client from env")?;

        let qwen_key = std::env::var("DASHSCOPE_API_KEY")
            .context("DASHSCOPE_API_KEY must be set for Qwen")?;
        let qwen_client = qwen::Client::new(qwen_key);
        let qwen_model = std::env::var("QWEN_MODEL")
            .unwrap_or_else(|_| "qwen-max".into());

        Ok(Self { deepseek_client, qwen_client, qwen_model })
    }

    /// Query both models in parallel for a single question.
    pub async fn query(
        &self,
        system: &str,
        question: &str,
    ) -> Result<DualResponse> {
        info!(question = &question[..question.len().min(80)], "dual-model query");

        let ds_system = system.to_string();
        let ds_question = question.to_string();
        let ds_client = &self.deepseek_client;

        let qwen_model = self.qwen_model.clone();
        let qwen_client = &self.qwen_client;
        let q_system = system.to_string();
        let q_question = question.to_string();

        let (ds_result, qwen_result) = tokio::join!(
            async {
                deepseek::reason(ds_client, &ds_system, &ds_question)
                    .await
                    .context("DeepSeek Reasoner call failed")
            },
            async {
                let req = qwen::ChatRequest::new(
                    &qwen_model,
                    vec![
                        qwen::ChatMessage::system(&q_system),
                        qwen::ChatMessage::user(&q_question),
                    ],
                );
                qwen_client.chat(req).await
                    .map_err(|e| anyhow::anyhow!("Qwen call failed: {e}"))
            }
        );

        let ds = match ds_result {
            Ok(output) => ModelResponse {
                model: "deepseek-reasoner".into(),
                content: output.content,
                reasoning: output.reasoning,
            },
            Err(e) => {
                tracing::warn!("DeepSeek failed: {e:#}");
                ModelResponse {
                    model: "deepseek-reasoner".into(),
                    content: format!("[DeepSeek error: {e}]"),
                    reasoning: String::new(),
                }
            }
        };

        let qw = match qwen_result {
            Ok(resp) => ModelResponse {
                model: qwen_model,
                content: resp.text().unwrap_or("").to_string(),
                reasoning: String::new(),
            },
            Err(e) => {
                tracing::warn!("Qwen failed: {e:#}");
                ModelResponse {
                    model: qwen_model,
                    content: format!("[Qwen error: {e}]"),
                    reasoning: String::new(),
                }
            }
        };

        Ok(DualResponse {
            question: question.to_string(),
            deepseek: ds,
            qwen: qw,
        })
    }

    /// Query both models for multiple questions (sequentially to avoid rate limits).
    pub async fn query_all(
        &self,
        system: &str,
        questions: &[&str],
    ) -> Vec<DualResponse> {
        let mut results = Vec::with_capacity(questions.len());
        for (i, q) in questions.iter().enumerate() {
            eprintln!("\n[{}/{}] {}", i + 1, questions.len(), &q[..q.len().min(80)]);
            match self.query(system, q).await {
                Ok(r) => results.push(r),
                Err(e) => eprintln!("  ERROR: {e:#}"),
            }
        }
        results
    }
}

/// Format dual responses into a Markdown prep document.
pub fn format_prep_document(title: &str, responses: &[DualResponse]) -> String {
    let mut doc = format!("# {title}\n\n");
    doc.push_str(&format!("Generated: {}\n\n", chrono_now()));
    doc.push_str("---\n\n");

    for (i, resp) in responses.iter().enumerate() {
        doc.push_str(&format!("## Q{}: {}\n\n", i + 1, resp.question));

        doc.push_str("### DeepSeek Reasoner\n\n");
        if !resp.deepseek.reasoning.is_empty() {
            doc.push_str("<details><summary>Chain of Thought</summary>\n\n");
            doc.push_str(&resp.deepseek.reasoning);
            doc.push_str("\n\n</details>\n\n");
        }
        doc.push_str(&resp.deepseek.content);
        doc.push_str("\n\n");

        doc.push_str("### Qwen\n\n");
        doc.push_str(&resp.qwen.content);
        doc.push_str("\n\n---\n\n");
    }

    doc
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now} (unix)")
}

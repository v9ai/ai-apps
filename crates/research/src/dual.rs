use anyhow::{bail, Context, Result};
use tracing::info;

/// Response from a single model for a research question.
#[derive(Debug, Clone)]
pub struct ModelResponse {
    pub model: String,
    pub content: String,
    /// DeepSeek Reasoner chain-of-thought (empty for other providers).
    pub reasoning: String,
}

/// Combined response from both models for a single question.
#[derive(Debug, Clone)]
pub struct DualResponse {
    pub question: String,
    pub deepseek: ModelResponse,
    pub qwen: ModelResponse,
}

/// Combined response from N models for a single question.
#[derive(Debug, Clone)]
pub struct MultiResponse {
    pub question: String,
    pub responses: Vec<ModelResponse>,
}

// ─── Provider enum ───────────────────────────────────────────────────────────

enum Provider {
    DeepSeek(deepseek::DeepSeekClient<deepseek::ReqwestClient>),
    Qwen { client: qwen::Client, model: String },
}

impl Provider {
    fn name(&self) -> &str {
        match self {
            Provider::DeepSeek(_) => "DeepSeek",
            Provider::Qwen { .. } => "Qwen",
        }
    }
}

// ─── MultiModelResearcher ────────────────────────────────────────────────────

/// Multi-model researcher: queries all available providers in parallel.
pub struct MultiModelResearcher {
    providers: Vec<Provider>,
}

impl MultiModelResearcher {
    /// Probe env vars and add only available providers.
    /// Returns error only if zero providers are configured.
    pub fn from_env() -> Result<Self> {
        let mut providers = Vec::new();

        if std::env::var("DEEPSEEK_API_KEY").is_ok() {
            match deepseek::client_from_env() {
                Ok(client) => providers.push(Provider::DeepSeek(client)),
                Err(e) => tracing::warn!("DeepSeek env present but client init failed: {e:#}"),
            }
        }

        if let Ok(key) = std::env::var("DASHSCOPE_API_KEY") {
            let client = qwen::Client::new(key);
            let model = std::env::var("QWEN_MODEL").unwrap_or_else(|_| "qwen-max".into());
            providers.push(Provider::Qwen { client, model });
        }

        if providers.is_empty() {
            bail!(
                "No LLM providers configured. Set at least one of: \
                 DEEPSEEK_API_KEY, DASHSCOPE_API_KEY"
            );
        }

        Ok(Self { providers })
    }

    /// Human-readable names of configured providers.
    pub fn provider_names(&self) -> Vec<&str> {
        self.providers.iter().map(|p| p.name()).collect()
    }

    /// Query all providers in parallel for a single question.
    pub async fn query(&self, system: &str, question: &str) -> Result<MultiResponse> {
        info!(
            question = {
                let max = question.len().min(80);
                let mut end = max;
                while !question.is_char_boundary(end) && end > 0 { end -= 1; }
                &question[..end]
            },
            providers = ?self.provider_names(),
            "multi-model query"
        );

        let mut handles: Vec<tokio::task::JoinHandle<ModelResponse>> =
            Vec::with_capacity(self.providers.len());

        for provider in &self.providers {
            let sys = system.to_string();
            let q = question.to_string();

            match provider {
                Provider::DeepSeek(client) => {
                    let client = client.clone();
                    handles.push(tokio::spawn(async move {
                        match deepseek::reason(&client, &sys, &q).await {
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
                        }
                    }));
                }
                Provider::Qwen { client, model } => {
                    let client = client.clone();
                    let model = model.clone();
                    handles.push(tokio::spawn(async move {
                        let req = qwen::ChatRequest::new(
                            &model,
                            vec![
                                qwen::ChatMessage::system(&sys),
                                qwen::ChatMessage::user(&q),
                            ],
                        );
                        match client.chat(req).await {
                            Ok(resp) => ModelResponse {
                                model,
                                content: resp.text().unwrap_or("").to_string(),
                                reasoning: String::new(),
                            },
                            Err(e) => {
                                tracing::warn!("Qwen failed: {e:#}");
                                ModelResponse {
                                    model,
                                    content: format!("[Qwen error: {e}]"),
                                    reasoning: String::new(),
                                }
                            }
                        }
                    }));
                }
            }
        }

        let mut responses = Vec::with_capacity(handles.len());
        for handle in handles {
            responses.push(handle.await.context("Provider task panicked")?);
        }

        Ok(MultiResponse {
            question: question.to_string(),
            responses,
        })
    }
}

/// Pick the best synthesis from N model responses.
/// Uses the longest successful response as the richest synthesis.
pub fn format_multi_unified_synthesis(resp: &MultiResponse) -> String {
    let successful: Vec<&ModelResponse> = resp
        .responses
        .iter()
        .filter(|r| !is_error_content(&r.content))
        .collect();

    match successful.len() {
        0 => "Research synthesis could not be generated — all models failed.".into(),
        _ => successful
            .iter()
            .max_by_key(|r| r.content.len())
            .unwrap()
            .content
            .clone(),
    }
}

fn is_error_content(content: &str) -> bool {
    content.starts_with("[DeepSeek error:")
        || content.starts_with("[Qwen error:")
}

// ─── DualModelResearcher (backward compat) ───────────────────────────────────

/// Dual-model researcher: backward-compatible wrapper around `MultiModelResearcher`.
pub struct DualModelResearcher {
    inner: MultiModelResearcher,
}

impl DualModelResearcher {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            inner: MultiModelResearcher::from_env()?,
        })
    }

    /// Query models in parallel, returning a DualResponse for backward compat.
    pub async fn query(&self, system: &str, question: &str) -> Result<DualResponse> {
        let multi = self.inner.query(system, question).await?;

        // Find DeepSeek and Qwen responses, or use placeholders
        let deepseek = multi
            .responses
            .iter()
            .find(|r| r.model == "deepseek-reasoner")
            .cloned()
            .unwrap_or_else(|| ModelResponse {
                model: "deepseek-reasoner".into(),
                content: "[DeepSeek error: not configured]".into(),
                reasoning: String::new(),
            });

        let qwen = multi
            .responses
            .iter()
            .find(|r| r.model != "deepseek-reasoner")
            .cloned()
            .unwrap_or_else(|| ModelResponse {
                model: "qwen-max".into(),
                content: "[Qwen error: not configured]".into(),
                reasoning: String::new(),
            });

        Ok(DualResponse {
            question: multi.question,
            deepseek,
            qwen,
        })
    }

    /// Query models for multiple questions (sequentially to avoid rate limits).
    pub async fn query_all(
        &self,
        system: &str,
        questions: &[&str],
    ) -> Vec<DualResponse> {
        let mut results = Vec::with_capacity(questions.len());
        for (i, q) in questions.iter().enumerate() {
            let mut end = q.len().min(80);
            while !q.is_char_boundary(end) && end > 0 { end -= 1; }
            eprintln!("\n[{}/{}] {}", i + 1, questions.len(), &q[..end]);
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

/// Pick the best unified synthesis from a dual-model response.
pub fn format_unified_synthesis(resp: &DualResponse) -> String {
    let ds_ok = !resp.deepseek.content.starts_with("[DeepSeek error:");
    let qw_ok = !resp.qwen.content.starts_with("[Qwen error:");

    match (ds_ok, qw_ok) {
        (true, true) => {
            if resp.deepseek.content.len() >= resp.qwen.content.len() {
                resp.deepseek.content.clone()
            } else {
                resp.qwen.content.clone()
            }
        }
        (true, false) => resp.deepseek.content.clone(),
        (false, true) => resp.qwen.content.clone(),
        (false, false) => {
            "Research synthesis could not be generated — both models failed. \
             Please try again later."
                .to_string()
        }
    }
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now} (unix)")
}

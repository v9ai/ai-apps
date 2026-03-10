use std::sync::Arc;

use anyhow::{Context, Result};
use tokio::sync::Semaphore;
use tracing::info;

use crate::agent::agent_builder;
use crate::code::CodeAnalysisConfig;
use crate::code::tools::{AnalyzeStructure, FindAntiPatterns, SearchPattern};
use crate::tools::{FallbackClients, GetPaperDetail, GetRecommendations, SearchPapers, SearchToolConfig};
use crate::SemanticScholarClient;

use super::mailbox::{Mailbox, MessageKind, TeamMessage};
use super::task::SharedTaskList;

/// Maximum total characters for injected context (~100K tokens, safe under DeepSeek's 131K limit).
pub(crate) const MAX_CONTEXT_CHARS: usize = 400_000;

/// Configuration passed to each teammate.
pub struct TeammateConfig {
    pub api_key: String,
    pub base_url: String,
    pub scholar_key: Option<String>,
    /// When `Some`, code analysis tools are attached to the agent.
    pub code_analysis: Option<CodeAnalysisConfig>,
    /// When `Some`, overrides the default search tool configuration.
    pub tool_config: Option<SearchToolConfig>,
    /// Shared semaphore for Semantic Scholar rate limiting across workers.
    pub scholar_rate_limiter: Option<Arc<Semaphore>>,
    /// Fallback clients for when Semantic Scholar is rate-limited.
    pub fallback: Option<FallbackClients>,
}

/// A teammate agent that claims tasks, injects prior findings, and runs the
/// DeepSeek tool-use loop.
pub struct Teammate {
    pub worker_id: String,
    config: TeammateConfig,
    tasks: SharedTaskList,
    mailbox: Mailbox,
}

impl Teammate {
    pub fn new(
        worker_id: String,
        config: TeammateConfig,
        tasks: SharedTaskList,
        mailbox: Mailbox,
    ) -> Self {
        Self {
            worker_id,
            config,
            tasks,
            mailbox,
        }
    }

    /// Run the work loop: claim → inject context → run agent → report → loop.
    pub async fn run(self) -> Result<()> {
        loop {
            // Try to claim a task.
            let task = match self.tasks.claim(&self.worker_id) {
                Some(t) => t,
                None => {
                    if self.tasks.all_done() {
                        info!(worker = %self.worker_id, "all tasks done, exiting");
                        return Ok(());
                    }
                    // All unclaimed tasks are dependency-blocked; wait and retry.
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    continue;
                }
            };

            info!(
                worker = %self.worker_id,
                task_id = task.id,
                subject = %task.subject,
                "claimed task"
            );

            self.mailbox.send(TeamMessage {
                from: self.worker_id.clone(),
                kind: MessageKind::StatusUpdate(format!(
                    "Starting task {}: {}",
                    task.id, task.subject
                )),
                timestamp: std::time::Instant::now(),
            });

            // Build context from dependency findings only (not all completed tasks).
            let prior = truncate_context(
                self.tasks.completed_findings_for(&task.dependencies),
                MAX_CONTEXT_CHARS,
            );
            let context_section = if prior.is_empty() {
                String::new()
            } else {
                let mut ctx = String::from(
                    "\n\n## Prior Findings from Teammates\n\
                     Use these to build on earlier work and avoid redundancy:\n\n",
                );
                for (subject, result) in &prior {
                    ctx.push_str(&format!("### {subject}\n{result}\n\n---\n\n"));
                }
                ctx
            };

            // Build and run the agent.
            let scholar = match &self.config.scholar_rate_limiter {
                Some(limiter) => SemanticScholarClient::with_rate_limiter(
                    self.config.scholar_key.as_deref(),
                    Arc::clone(limiter),
                ),
                None => SemanticScholarClient::new(self.config.scholar_key.as_deref()),
            };
            let tool_config = self.config.tool_config.clone().unwrap_or(SearchToolConfig {
                default_limit: 10,
                abstract_max_chars: 500,
                max_authors: 5,
                include_fields_of_study: true,
                include_venue: true,
                search_description: None,
                detail_description: None,
            });

            let search_tool = match &self.config.fallback {
                Some(fb) => SearchPapers::with_fallback(scholar.clone(), tool_config.clone(), fb.clone()),
                None => SearchPapers::with_config(scholar.clone(), tool_config.clone()),
            };
            let detail_tool = match &self.config.fallback {
                Some(fb) => GetPaperDetail::with_fallback(scholar.clone(), tool_config.clone(), fb.clone()),
                None => GetPaperDetail::with_config(scholar.clone(), tool_config.clone()),
            };

            let mut builder = agent_builder(&self.config.api_key, "deepseek-chat")
                .preamble(&task.preamble)
                .tool(search_tool)
                .tool(detail_tool)
                .tool(GetRecommendations::with_config(scholar, tool_config))
                .base_url(&self.config.base_url)
                .worker_id(&self.worker_id);

            if let Some(code_cfg) = &self.config.code_analysis {
                builder = builder
                    .tool(SearchPattern::new(code_cfg.clone()))
                    .tool(AnalyzeStructure::new(code_cfg.clone()))
                    .tool(FindAntiPatterns::new(code_cfg.clone()));
            }

            let agent = builder.build();

            let prompt = format!("{}{context_section}", task.description);

            match agent
                .prompt(prompt)
                .await
                .with_context(|| format!("[{}] task {} failed", self.worker_id, task.id))
            {
                Ok(result) => {
                    let summary = result.chars().take(200).collect::<String>();
                    self.tasks.complete(task.id, result);
                    self.mailbox.send(TeamMessage {
                        from: self.worker_id.clone(),
                        kind: MessageKind::Finding {
                            task_id: task.id,
                            summary,
                        },
                        timestamp: std::time::Instant::now(),
                    });
                    info!(worker = %self.worker_id, task_id = task.id, "completed task");
                }
                Err(e) => {
                    let err_msg = format!("{e:#}");
                    self.tasks.fail(task.id, err_msg.clone());
                    self.mailbox.send(TeamMessage {
                        from: self.worker_id.clone(),
                        kind: MessageKind::Error(format!(
                            "Task {} failed: {err_msg}",
                            task.id
                        )),
                        timestamp: std::time::Instant::now(),
                    });
                    info!(worker = %self.worker_id, task_id = task.id, "task failed: {e:#}");
                }
            }
        }
    }
}

/// Truncate context entries so their combined size stays within `max_chars`.
/// Each entry that exceeds its proportional budget is trimmed with a suffix.
pub(crate) fn truncate_context(
    entries: Vec<(String, String)>,
    max_chars: usize,
) -> Vec<(String, String)> {
    if entries.is_empty() {
        return entries;
    }
    let total: usize = entries.iter().map(|(s, r)| s.len() + r.len()).sum();
    if total <= max_chars {
        return entries;
    }
    let per_entry = max_chars / entries.len();
    entries
        .into_iter()
        .map(|(subject, result)| {
            let budget = per_entry.saturating_sub(subject.len());
            if result.len() <= budget {
                (subject, result)
            } else {
                let truncated: String = result.chars().take(budget).collect();
                (
                    subject,
                    format!("{truncated}\n\n[...truncated to fit context window...]"),
                )
            }
        })
        .collect()
}

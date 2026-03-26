use std::sync::Arc;

use anyhow::{Context, Result};
use tokio::sync::Semaphore;
use tracing::info;

use crate::agent::{provider_agent_builder, LlmProvider};
use crate::code::CodeAnalysisConfig;
use crate::code::tools::{AnalyzeStructure, FindAntiPatterns, SearchPattern};
use crate::embeddings::Ranker;
use crate::tools::{FallbackClients, GetPaperDetail, GetRecommendations, SearchPapers, SearchToolConfig};
use crate::SemanticScholarClient;

use super::mailbox::{Mailbox, MessageKind, StatusPhase, StatusReport, TeamMessage};
use super::task::SharedTaskList;

/// Maximum total characters for injected context (~100K tokens, safe under DeepSeek's 131K limit).
pub(crate) const MAX_CONTEXT_CHARS: usize = 400_000;

/// Configuration passed to each teammate.
pub struct TeammateConfig {
    pub provider: LlmProvider,
    pub scholar_key: Option<String>,
    /// When `Some`, code analysis tools are attached to the agent.
    pub code_analysis: Option<CodeAnalysisConfig>,
    /// When `Some`, overrides the default search tool configuration.
    pub tool_config: Option<SearchToolConfig>,
    /// Shared semaphore for Semantic Scholar rate limiting across workers.
    pub scholar_rate_limiter: Option<Arc<Semaphore>>,
    /// Fallback clients for when Semantic Scholar is rate-limited.
    pub fallback: Option<FallbackClients>,
    /// Semantic ranker for re-ranking search results (local Candle or API-based).
    pub ranker: Option<Arc<dyn Ranker>>,
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

    /// Run the work loop: claim -> inject context -> run agent -> report -> loop.
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
                priority = ?task.priority,
                attempt = task.attempt,
                "claimed task"
            );

            self.mailbox.send_status(&self.worker_id, StatusReport {
                task_id: task.id,
                phase: StatusPhase::Started,
                message: format!("Starting task {}: {}", task.id, task.subject),
            });

            // Also send the legacy StatusUpdate for backward compatibility with lead monitor.
            self.mailbox.send(TeamMessage {
                from: self.worker_id.clone(),
                kind: MessageKind::StatusUpdate(format!(
                    "Starting task {}: {}",
                    task.id, task.subject
                )),
                timestamp: std::time::Instant::now(),
            });

            // Report progress: building context
            self.tasks.update_progress(task.id, 10, Some("building context".into()));

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

            // Report progress: running agent
            self.tasks.update_progress(task.id, 20, Some("running agent".into()));
            self.mailbox.send_status(&self.worker_id, StatusReport {
                task_id: task.id,
                phase: StatusPhase::Progress { percent: 20 },
                message: "Running LLM agent".into(),
            });

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

            let mut search_tool = match &self.config.fallback {
                Some(fb) => SearchPapers::with_fallback(scholar.clone(), tool_config.clone(), fb.clone()),
                None => SearchPapers::with_config(scholar.clone(), tool_config.clone()),
            };
            if let Some(ranker) = &self.config.ranker {
                search_tool = search_tool.with_ranker(Arc::clone(ranker));
            }
            let detail_tool = match &self.config.fallback {
                Some(fb) => GetPaperDetail::with_fallback(scholar.clone(), tool_config.clone(), fb.clone()),
                None => GetPaperDetail::with_config(scholar.clone(), tool_config.clone()),
            };

            let mut builder = provider_agent_builder(&self.config.provider)
                .preamble(&task.preamble)
                .tool(search_tool)
                .tool(detail_tool)
                .tool(GetRecommendations::with_config(scholar, tool_config))
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
                            summary: summary.clone(),
                        },
                        timestamp: std::time::Instant::now(),
                    });
                    self.mailbox.send_status(&self.worker_id, StatusReport {
                        task_id: task.id,
                        phase: StatusPhase::Completed,
                        message: summary,
                    });
                    info!(worker = %self.worker_id, task_id = task.id, "completed task");
                }
                Err(e) => {
                    let err_msg = format!("{e:#}");
                    let retry_backoff = self.tasks.fail(task.id, err_msg.clone());
                    if let Some(backoff) = retry_backoff {
                        let backoff_secs = backoff.as_secs();
                        self.mailbox.send_status(&self.worker_id, StatusReport {
                            task_id: task.id,
                            phase: StatusPhase::Retrying {
                                attempt: task.attempt + 1,
                                backoff_secs,
                            },
                            message: format!("Retrying after {backoff_secs}s: {err_msg}"),
                        });
                        self.mailbox.send(TeamMessage {
                            from: self.worker_id.clone(),
                            kind: MessageKind::Error(format!(
                                "Task {} failed (will retry in {backoff_secs}s): {err_msg}",
                                task.id
                            )),
                            timestamp: std::time::Instant::now(),
                        });
                        info!(
                            worker = %self.worker_id,
                            task_id = task.id,
                            backoff_secs,
                            "task failed, retrying after backoff"
                        );
                        tokio::time::sleep(backoff).await;
                    } else {
                        self.mailbox.send_status(&self.worker_id, StatusReport {
                            task_id: task.id,
                            phase: StatusPhase::Failed,
                            message: err_msg.clone(),
                        });
                        self.mailbox.send(TeamMessage {
                            from: self.worker_id.clone(),
                            kind: MessageKind::Error(format!(
                                "Task {} permanently failed: {err_msg}",
                                task.id
                            )),
                            timestamp: std::time::Instant::now(),
                        });
                        info!(worker = %self.worker_id, task_id = task.id, "task permanently failed: {e:#}");
                    }
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

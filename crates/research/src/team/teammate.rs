use anyhow::{Context, Result};
use tracing::info;

use crate::agent::agent_builder;
use crate::code::CodeAnalysisConfig;
use crate::code::tools::{AnalyzeStructure, FindAntiPatterns, SearchPattern};
use crate::tools::{GetPaperDetail, SearchPapers, SearchToolConfig};
use crate::SemanticScholarClient;

use super::mailbox::{Mailbox, MessageKind, TeamMessage};
use super::task::SharedTaskList;

/// Configuration passed to each teammate.
pub struct TeammateConfig {
    pub api_key: String,
    pub base_url: String,
    pub scholar_key: Option<String>,
    /// When `Some`, code analysis tools are attached to the agent.
    pub code_analysis: Option<CodeAnalysisConfig>,
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

            // Build context from prior findings.
            let prior = self.tasks.completed_findings();
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
            let scholar = SemanticScholarClient::new(self.config.scholar_key.as_deref());
            let tool_config = SearchToolConfig {
                default_limit: 10,
                abstract_max_chars: 500,
                max_authors: 5,
                include_fields_of_study: true,
                include_venue: true,
                search_description: None,
                detail_description: None,
            };

            let mut builder = agent_builder(&self.config.api_key, "deepseek-chat")
                .preamble(&task.preamble)
                .tool(SearchPapers::with_config(
                    scholar.clone(),
                    tool_config.clone(),
                ))
                .tool(GetPaperDetail::with_config(scholar, tool_config))
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

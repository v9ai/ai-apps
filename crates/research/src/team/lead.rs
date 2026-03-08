use anyhow::{Context, Result};
use std::path::PathBuf;
use tokio::task::JoinSet;
use tracing::info;

use crate::agent::agent_builder;
use crate::code::CodeAnalysisConfig;

use super::mailbox::{Mailbox, MessageKind, TeamMessage};
use super::task::{ResearchTask, SharedTaskList};
use crate::tools::SearchToolConfig;

use super::teammate::{Teammate, TeammateConfig};

/// Configuration for the research team.
pub struct TeamConfig {
    pub team_size: usize,
    pub api_key: String,
    pub base_url: String,
    pub scholar_key: Option<String>,
    /// When `Some`, enables code analysis tools on each teammate.
    pub code_root: Option<PathBuf>,
    /// Custom preamble for the synthesis agent. Falls back to a default if `None`.
    pub synthesis_preamble: Option<String>,
    /// Custom synthesis prompt template. Use `{count}` and `{combined}` placeholders.
    /// Falls back to the default SDD-oriented prompt if `None`.
    pub synthesis_prompt_template: Option<String>,
    /// When `Some`, overrides the default search tool configuration for all teammates.
    pub tool_config: Option<SearchToolConfig>,
}

/// Result of a full team research run.
pub struct TeamResult {
    /// Per-task findings: (task_id, subject, result).
    pub findings: Vec<(usize, String, String)>,
    /// Cross-cutting synthesis report.
    pub synthesis: String,
}

/// The team lead: creates the task list, spawns teammates, monitors, synthesises.
pub struct TeamLead {
    config: TeamConfig,
}

impl TeamLead {
    pub fn new(config: TeamConfig) -> Self {
        Self { config }
    }

    pub async fn run(self, tasks: Vec<ResearchTask>) -> Result<TeamResult> {
        let task_count = tasks.len();
        let task_list = SharedTaskList::new(tasks);
        let mailbox = Mailbox::new(128);

        info!(
            team_size = self.config.team_size,
            tasks = task_count,
            "team lead starting"
        );

        // Spawn teammates.
        let mut join_set: JoinSet<Result<()>> = JoinSet::new();
        let code_analysis = self.config.code_root.as_ref().map(|root| CodeAnalysisConfig {
            root_path: root.clone(),
            ..CodeAnalysisConfig::default()
        });

        for i in 0..self.config.team_size {
            let worker_id = format!("worker-{:02}", i + 1);
            let teammate = Teammate::new(
                worker_id,
                TeammateConfig {
                    api_key: self.config.api_key.clone(),
                    base_url: self.config.base_url.clone(),
                    scholar_key: self.config.scholar_key.clone(),
                    code_analysis: code_analysis.clone(),
                    tool_config: self.config.tool_config.clone(),
                },
                task_list.clone(),
                mailbox.clone(),
            );
            join_set.spawn(teammate.run());
        }

        // Monitor mailbox in the background.
        let monitor_mailbox = mailbox.clone();
        let monitor_handle = tokio::spawn(async move {
            let mut rx = monitor_mailbox.subscribe();
            loop {
                match rx.recv().await {
                    Ok(TeamMessage { from, kind, .. }) => match &kind {
                        MessageKind::Finding { task_id, summary } => {
                            eprintln!("[lead] {from} completed task {task_id}: {summary}");
                        }
                        MessageKind::StatusUpdate(msg) => {
                            eprintln!("[lead] {from}: {msg}");
                        }
                        MessageKind::Error(msg) => {
                            eprintln!("[lead] ERROR from {from}: {msg}");
                        }
                    },
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                        eprintln!("[lead] mailbox lagged, missed {n} messages");
                    }
                }
            }
        });

        // Wait for all teammates to finish.
        while let Some(result) = join_set.join_next().await {
            match result {
                Ok(Ok(())) => {}
                Ok(Err(e)) => eprintln!("[lead] teammate error: {e:#}"),
                Err(e) => eprintln!("[lead] teammate panicked: {e}"),
            }
        }

        // Stop monitor.
        monitor_handle.abort();

        // Collect findings.
        let mut findings = task_list.completed_tasks();
        findings.sort_by_key(|(id, _, _)| *id);

        let successful = findings.len();
        eprintln!(
            "\n[lead] All teammates done ({successful}/{task_count} succeeded). Running synthesis…\n"
        );

        if findings.is_empty() {
            anyhow::bail!("All tasks failed — nothing to synthesise");
        }

        let synthesis = self.synthesize(&findings).await?;

        Ok(TeamResult {
            findings,
            synthesis,
        })
    }

    async fn synthesize(&self, findings: &[(usize, String, String)]) -> Result<String> {
        info!("running synthesis across {} findings", findings.len());

        let combined: String = findings
            .iter()
            .map(|(id, subject, content)| {
                format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n")
            })
            .collect();

        let default_preamble = "You are a principal researcher synthesising findings from specialist \
                 research agents into a coherent, actionable report. Write in Markdown. \
                 Be concise but comprehensive. Identify cross-cutting themes, convergences, \
                 and contradictions across the findings.";

        let preamble = self
            .config
            .synthesis_preamble
            .as_deref()
            .unwrap_or(default_preamble);

        let agent = agent_builder(&self.config.api_key, "deepseek-chat")
            .preamble(preamble)
            .base_url(&self.config.base_url)
            .worker_id("synthesis")
            .build();

        let prompt = if let Some(template) = &self.config.synthesis_prompt_template {
            template
                .replace("{count}", &findings.len().to_string())
                .replace("{combined}", &combined)
        } else {
            format!(
                r#"# Synthesis Request: Parallel Spec-Driven Development

You have received findings from {count} parallel research agents, each covering a different
angle of **Parallel Spec-Driven Development (SDD)**.

Your task: produce a **master synthesis report** with:

1. **Executive Summary** (3-5 key insights)
2. **Cross-Cutting Themes** — patterns that appear across multiple agents
3. **Convergent Evidence** — where multiple agents agree on a finding
4. **Tensions & Trade-offs** — where findings conflict or have nuance
5. **Recommended SDD Patterns for Parallel Teams** — concrete, actionable patterns
6. **Open Research Questions** — gaps the literature has not resolved
7. **Top 10 Must-Read Papers** — synthesised from all agent recommendations

## Agent Findings

{combined}
"#,
                count = findings.len(),
            )
        };

        agent
            .prompt(prompt)
            .await
            .context("[synthesis] DeepSeek call failed")
    }
}

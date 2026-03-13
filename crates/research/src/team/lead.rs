use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tracing::info;

use crate::agent::{provider_agent_builder, LlmProvider};
use crate::code::CodeAnalysisConfig;
use crate::crossref::CrossrefClient;
use crate::openalex::OpenAlexClient;
use crate::tools::FallbackClients;

use super::mailbox::{Mailbox, MessageKind, TeamMessage};
use super::task::{ResearchTask, SharedTaskList};
use crate::tools::SearchToolConfig;

use super::teammate::{Teammate, TeammateConfig, truncate_context};

/// Configuration for the research team.
pub struct TeamConfig {
    pub team_size: usize,
    pub provider: LlmProvider,
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
    /// Max concurrent Semantic Scholar requests. `Some(3)` recommended with API key.
    pub scholar_concurrency: Option<usize>,
    /// Polite-pool email for OpenAlex/Crossref. Enables provider fallback when set.
    pub mailto: Option<String>,
    /// Output directory for incremental saving. When set, each task result is written
    /// to disk as it completes, and on startup previously completed results are loaded
    /// to resume from the failure point.
    pub output_dir: Option<String>,
    /// Optional separate provider for synthesis. Falls back to `provider` if `None`.
    pub synthesis_provider: Option<LlmProvider>,
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
        let team_start = Instant::now();
        let task_count = tasks.len();
        let task_list = SharedTaskList::new(tasks);
        let mailbox = Mailbox::new(128);

        // Resume from previously saved results if output_dir exists.
        if let Some(ref dir) = self.config.output_dir {
            let resumed = task_list.resume_from_dir(dir);
            if resumed > 0 {
                info!(resumed, "resumed tasks from {dir}");
                eprintln!("[lead] Resumed {resumed}/{task_count} tasks from {dir}");
            }
        }

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

        // Create shared rate limiter.
        let scholar_rate_limiter = self
            .config
            .scholar_concurrency
            .map(|n| Arc::new(Semaphore::new(n)));

        // Always create fallback clients (OpenAlex + Crossref are primary providers).
        // Mailto enables the polite pool but is optional.
        let mailto = self.config.mailto.as_deref();
        info!(mailto = mailto, "fallback clients enabled (OpenAlex + Crossref)");
        let fallback = Some(FallbackClients {
            openalex: OpenAlexClient::new(mailto),
            crossref: CrossrefClient::new(mailto),
        });

        for i in 0..self.config.team_size {
            let worker_id = format!("worker-{:02}", i + 1);
            let teammate = Teammate::new(
                worker_id,
                TeammateConfig {
                    provider: self.config.provider.clone(),
                    scholar_key: self.config.scholar_key.clone(),
                    code_analysis: code_analysis.clone(),
                    tool_config: self.config.tool_config.clone(),
                    scholar_rate_limiter: scholar_rate_limiter.clone(),
                    fallback: fallback.clone(),
                },
                task_list.clone(),
                mailbox.clone(),
            );
            join_set.spawn(teammate.run());
        }

        // Track task start times for duration measurement.
        let task_start_times: std::sync::Arc<std::sync::Mutex<HashMap<usize, Instant>>> =
            std::sync::Arc::new(std::sync::Mutex::new(HashMap::new()));

        // Monitor mailbox in the background.
        let monitor_mailbox = mailbox.clone();
        let monitor_times = task_start_times.clone();
        let monitor_task_list = task_list.clone();
        let monitor_output_dir = self.config.output_dir.clone();
        let monitor_handle = tokio::spawn(async move {
            let mut rx = monitor_mailbox.subscribe();
            loop {
                match rx.recv().await {
                    Ok(TeamMessage { from, kind, .. }) => match &kind {
                        MessageKind::Finding { task_id, summary } => {
                            let duration_ms = {
                                let times = monitor_times.lock().unwrap();
                                times.get(task_id).map(|start| start.elapsed().as_millis() as u64)
                            };
                            if let Some(dur) = duration_ms {
                                info!(
                                    task_id = task_id,
                                    worker = %from,
                                    summary = %summary,
                                    duration_ms = dur,
                                    status = "completed",
                                    "task completed"
                                );
                            } else {
                                info!(
                                    task_id = task_id,
                                    worker = %from,
                                    summary = %summary,
                                    status = "completed",
                                    "task completed"
                                );
                            }
                            // Incrementally save to disk if output_dir is set.
                            if let Some(ref dir) = monitor_output_dir {
                                let findings = monitor_task_list.completed_tasks();
                                if let Some((_, subject, content)) = findings.iter().find(|(id, _, _)| id == task_id) {
                                    let path = format!("{dir}/agent-{task_id:02}-{subject}.md");
                                    if let Err(e) = std::fs::write(&path, content) {
                                        eprintln!("[lead] failed to save {path}: {e}");
                                    } else {
                                        eprintln!("[lead] saved {path} ({} bytes)", content.len());
                                    }
                                }
                            }
                            eprintln!("[lead] {from} completed task {task_id}: {summary}");
                        }
                        MessageKind::StatusUpdate(msg) => {
                            // Record task start time when a StatusUpdate indicates task start
                            if msg.starts_with("Starting task ") {
                                if let Some(task_id_str) = msg
                                    .strip_prefix("Starting task ")
                                    .and_then(|s| s.split(':').next())
                                {
                                    if let Ok(task_id) = task_id_str.trim().parse::<usize>() {
                                        let mut times = monitor_times.lock().unwrap();
                                        times.insert(task_id, Instant::now());
                                        info!(
                                            task_id = task_id,
                                            worker = %from,
                                            status = "started",
                                            "task started"
                                        );
                                    }
                                }
                            }
                            eprintln!("[lead] {from}: {msg}");
                        }
                        MessageKind::Error(msg) => {
                            info!(worker = %from, error = %msg, "task error");
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
        let team_elapsed_ms = team_start.elapsed().as_millis() as u64;

        info!(
            tasks_completed = successful,
            tasks_total = task_count,
            total_duration_ms = team_elapsed_ms,
            "team completed"
        );

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
        info!(finding_count = findings.len(), "starting synthesis");

        // Truncate findings to fit within context window.
        let truncated = truncate_context(
            findings
                .iter()
                .map(|(_, subject, content)| (subject.clone(), content.clone()))
                .collect(),
            super::teammate::MAX_CONTEXT_CHARS,
        );
        let combined: String = findings
            .iter()
            .zip(truncated.iter())
            .map(|((id, _, _), (subject, content))| {
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

        let synthesis_provider = self
            .config
            .synthesis_provider
            .as_ref()
            .unwrap_or(&self.config.provider);
        let agent = provider_agent_builder(synthesis_provider)
            .preamble(preamble)
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

        let synthesis = agent
            .prompt(prompt)
            .await
            .context("[synthesis] DeepSeek call failed")?;

        info!(synthesis_len = synthesis.len(), "synthesis complete");
        Ok(synthesis)
    }
}

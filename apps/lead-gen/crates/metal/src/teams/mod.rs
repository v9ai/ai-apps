//! B2B lead generation team orchestrator.
//!
//! Replaces Claude Code agent teams with native Rust async tasks.
//! Pipeline: meta -> discover -> enrich -> (contacts | qa) -> outreach

pub mod contacts;
pub mod discover;
pub mod enrich;
pub mod llm;
pub mod outreach;
pub mod qa;
pub mod state;

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use anyhow::Result;

use crate::Pipeline;

// ── Stage report ──────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct StageReport {
    pub stage: String,
    pub status: StageStatus,
    pub processed: usize,
    pub created: usize,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum StageStatus {
    Success,
    Partial,
    Failed,
    Skipped,
}

impl std::fmt::Display for StageStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Success => write!(f, "OK"),
            Self::Partial => write!(f, "PARTIAL"),
            Self::Failed => write!(f, "FAIL"),
            Self::Skipped => write!(f, "SKIP"),
        }
    }
}

// ── Shared context ────────────────────────────────────────────

pub struct TeamContext {
    pub pipeline: Arc<Pipeline>,
    pub http: reqwest::Client,
    pub data_dir: PathBuf,
    pub llm_api_key: Option<String>,
    pub llm_base_url: String,
    pub batch: BatchSizes,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BatchSizes {
    pub discover: usize,
    pub enrich: usize,
    pub contacts: usize,
    pub outreach: usize,
}

impl Default for BatchSizes {
    fn default() -> Self {
        Self { discover: 50, enrich: 30, contacts: 20, outreach: 10 }
    }
}

impl TeamContext {
    pub fn new(pipeline: Pipeline, data_dir: PathBuf) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("leadgen-metal/0.1")
            .build()
            .expect("http client");

        let llm_api_key = std::env::var("DEEPSEEK_API_KEY").ok();
        let llm_base_url = std::env::var("LLM_BASE_URL")
            .unwrap_or_else(|_| "https://api.deepseek.com".into());

        Self {
            pipeline: Arc::new(pipeline),
            http,
            data_dir,
            llm_api_key,
            llm_base_url,
            batch: BatchSizes::default(),
        }
    }

    pub fn reports_dir(&self) -> PathBuf {
        self.data_dir.join("reports")
    }
}

// ── Pipeline orchestrator ─────────────────────────────────────

pub async fn run_pipeline(
    ctx: Arc<TeamContext>,
    domains_file: Option<&Path>,
    auto_confirm: bool,
) -> Result<Vec<StageReport>> {
    std::fs::create_dir_all(ctx.reports_dir())?;
    let mut reports = Vec::new();

    // Phase 1: Meta — assess pipeline state, produce action plan
    let plan = state::assess(&ctx)?;
    eprintln!("{plan}");

    if !auto_confirm {
        eprintln!("\n  Press Enter to execute, or Ctrl+C to abort...");
        let mut buf = String::new();
        std::io::stdin().read_line(&mut buf)?;
    }

    // Phase 2: Discover
    if plan.run_discover {
        reports.push(run_stage("discover", discover::run(&ctx, domains_file)).await);
    }

    // Phase 3: Enrich
    if plan.run_enrich {
        reports.push(run_stage("enrich", enrich::run(&ctx)).await);
    }

    // Phase 4: Contacts + QA (parallel via tokio::join)
    {
        let do_contacts = plan.run_contacts;
        let do_qa = plan.run_qa;
        let ctx_c = Arc::clone(&ctx);
        let ctx_q = Arc::clone(&ctx);

        let (cr, qr) = tokio::join!(
            async {
                if do_contacts {
                    Some(run_stage("contacts", contacts::run(&ctx_c)).await)
                } else {
                    None
                }
            },
            async {
                if do_qa {
                    Some(run_stage("qa", qa::run(&ctx_q)).await)
                } else {
                    None
                }
            }
        );
        if let Some(r) = cr { reports.push(r); }
        if let Some(r) = qr { reports.push(r); }
    }

    // Phase 5: Outreach (approval gate inside)
    if plan.run_outreach {
        reports.push(run_stage("outreach", outreach::run(&ctx)).await);
    }

    // Flush storage
    ctx.pipeline.flush()?;

    // Persist run report
    let report_path = ctx.reports_dir().join("run.json");
    std::fs::write(&report_path, serde_json::to_string_pretty(&reports)?)?;

    print_summary(&reports);
    Ok(reports)
}

async fn run_stage(
    name: &str,
    fut: impl std::future::Future<Output = Result<StageReport>>,
) -> StageReport {
    let t = Instant::now();
    match fut.await {
        Ok(mut r) => {
            r.duration_ms = t.elapsed().as_millis() as u64;
            log_stage(&r);
            r
        }
        Err(e) => {
            let r = StageReport {
                stage: name.into(),
                status: StageStatus::Failed,
                processed: 0,
                created: 0,
                errors: vec![e.to_string()],
                duration_ms: t.elapsed().as_millis() as u64,
            };
            log_stage(&r);
            r
        }
    }
}

fn log_stage(r: &StageReport) {
    eprintln!(
        "  [{:>7}] {:<10} processed={:<4} created={:<4} errors={} ({:.1}s)",
        r.status, r.stage, r.processed, r.created, r.errors.len(),
        r.duration_ms as f64 / 1000.0,
    );
}

fn print_summary(reports: &[StageReport]) {
    eprintln!();
    eprintln!("  ── Pipeline Summary ──────────────────────────");
    for r in reports {
        eprintln!(
            "  {:<10} {:>4} processed  {:>4} created  [{}]",
            r.stage, r.processed, r.created, r.status,
        );
    }
    let total: u64 = reports.iter().map(|r| r.duration_ms).sum();
    eprintln!("  ──────────────────────────────────────────────");
    eprintln!("  Total: {:.1}s", total as f64 / 1000.0);
}

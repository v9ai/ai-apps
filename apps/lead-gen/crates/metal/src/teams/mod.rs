//! B2B lead generation team orchestrator.
//!
//! Replaces Claude Code agent teams with native Rust async tasks.
//! Pipeline: meta -> discover -> enrich -> (contacts | qa) -> outreach

pub mod contacts;
pub mod discover;
pub mod enrich;
pub mod intent;
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
    pub llm_model: String,
    /// Extraction model endpoint (sgai-qwen3-1.7b on port 8081).
    pub extract_base_url: String,
    /// Extraction model name.
    pub extract_model: String,
    pub icp_vertical: String,
    pub batch: BatchSizes,
    pub auto_confirm: bool,
    pub run_all: bool,
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

        let llm_api_key = std::env::var("LLM_API_KEY").ok();
        let llm_base_url = std::env::var("LLM_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:8080/v1".into());
        let llm_model = std::env::var("LLM_MODEL")
            .unwrap_or_else(|_| "mlx-community/Qwen2.5-3B-Instruct-4bit".into());

        let extract_base_url = std::env::var("EXTRACT_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:8081/v1".into());
        let extract_model = std::env::var("EXTRACT_MODEL")
            .unwrap_or_else(|_| "scrapegraphai/sgai-qwen3-1.7b-gguf".into());

        let icp_vertical = std::env::var("ICP_VERTICAL")
            .unwrap_or_else(|_| "consultancy".into());

        let valid = ["consultancy", "agency", "staffing", "product"];
        if !valid.contains(&icp_vertical.to_lowercase().as_str()) {
            eprintln!(
                "  WARNING: ICP_VERTICAL='{}' is not a known category (expected: {})",
                icp_vertical,
                valid.join(", "),
            );
        }

        Self {
            pipeline: Arc::new(pipeline),
            http,
            data_dir,
            llm_api_key,
            llm_base_url,
            llm_model,
            extract_base_url,
            extract_model,
            icp_vertical,
            batch: BatchSizes::default(),
            auto_confirm: false,
            run_all: false,
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
) -> Result<Vec<StageReport>> {
    std::fs::create_dir_all(ctx.reports_dir())?;
    let mut reports = Vec::new();
    let pipeline_start = Instant::now();

    // Load progress history + check for crash resume
    let mut progress = state::PipelineProgress::load(&ctx.data_dir);
    let run_id = progress.next_run_id();
    let existing_checkpoint = state::StageCheckpoint::load(&ctx.data_dir);
    let resuming = existing_checkpoint
        .as_ref()
        .map_or(false, |cp| cp.current_stage.is_some());
    let mut checkpoint = existing_checkpoint.unwrap_or_else(|| state::StageCheckpoint::new(run_id));

    if resuming {
        eprintln!(
            "\n  RESUME: Previous run #{} crashed during '{}'. Skipping completed stages.",
            checkpoint.run_id,
            checkpoint.current_stage.as_deref().unwrap_or("unknown"),
        );
    }

    // Phase 1: Meta — assess pipeline state, produce action plan
    let plan = if ctx.run_all {
        state::all_stages(&ctx)?
    } else {
        state::assess(&ctx)?
    };
    eprintln!("{plan}");

    if !ctx.auto_confirm {
        eprintln!("\n  Press Enter to execute, or Ctrl+C to abort...");
        let mut buf = String::new();
        std::io::stdin().read_line(&mut buf)?;
    }

    // Start tracking this run in progress
    let mut run_record = state::RunRecord {
        run_id,
        started_at: chrono::Utc::now()
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        finished_at: String::new(),
        duration_ms: 0,
        phase: plan.phase,
        stages_completed: Vec::new(),
        stages_failed: Vec::new(),
        counts: state::RunCounts::default(),
        exit_status: "running".into(),
    };

    // Phase 2: Discover
    if plan.run_discover {
        if let Some(r) = run_checked_stage(
            &ctx, &mut checkpoint, &mut run_record, "discover",
            discover::run(&ctx, domains_file),
        ).await? {
            reports.push(r);
        }
    }

    // Phase 3: Enrich
    if plan.run_enrich {
        if let Some(r) = run_checked_stage(
            &ctx, &mut checkpoint, &mut run_record, "enrich",
            enrich::run(&ctx),
        ).await? {
            reports.push(r);
        }
    }

    // Phase 3.5: Intent signal detection
    if plan.run_intent {
        if let Some(r) = run_checked_stage(
            &ctx, &mut checkpoint, &mut run_record, "intent",
            intent::run(&ctx),
        ).await? {
            reports.push(r);
        }
    }

    // Phase 4: Contacts + QA (parallel via tokio::join)
    {
        let do_contacts = plan.run_contacts
            && !checkpoint.is_stage_done("contacts");
        let do_qa = plan.run_qa
            && !checkpoint.is_stage_done("qa");
        let ctx_c = Arc::clone(&ctx);
        let ctx_q = Arc::clone(&ctx);

        if do_contacts || do_qa {
            // Mark both as current for checkpoint
            if do_contacts && do_qa {
                checkpoint.mark_started("contacts+qa");
            } else if do_contacts {
                checkpoint.mark_started("contacts");
            } else {
                checkpoint.mark_started("qa");
            }
            checkpoint.save(&ctx.data_dir)?;

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

            if let Some(r) = cr {
                update_run_record(&mut run_record, &r);
                checkpoint.mark_done("contacts", r.status.clone());
                reports.push(r);
            }
            if let Some(r) = qr {
                update_run_record(&mut run_record, &r);
                checkpoint.mark_done("qa", r.status.clone());
                reports.push(r);
            }
            checkpoint.save(&ctx.data_dir)?;
        } else if plan.run_contacts || plan.run_qa {
            eprintln!("  [   SKIP] contacts+qa (completed in previous run)");
        }
    }

    // Phase 5: Outreach (approval gate inside)
    if plan.run_outreach {
        if let Some(r) = run_checked_stage(
            &ctx, &mut checkpoint, &mut run_record, "outreach",
            outreach::run(&ctx),
        ).await? {
            reports.push(r);
        }
    }

    // Flush storage
    ctx.pipeline.flush()?;

    // Finalize progress
    run_record.finished_at = chrono::Utc::now()
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    run_record.duration_ms = pipeline_start.elapsed().as_millis() as u64;
    run_record.exit_status = if run_record.stages_failed.is_empty() {
        "success".into()
    } else if !run_record.stages_completed.is_empty() {
        "partial".into()
    } else {
        "failed".into()
    };
    progress.runs.push(run_record);
    progress.last_updated = chrono::Utc::now()
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    progress.save(&ctx.data_dir)?;

    // Clear checkpoint on success (next run starts fresh)
    state::StageCheckpoint::clear(&ctx.data_dir)?;

    // Persist run report
    let report_path = ctx.reports_dir().join("run.json");
    std::fs::write(&report_path, serde_json::to_string_pretty(&reports)?)?;

    print_summary(&reports, &progress);
    Ok(reports)
}

/// Run a stage with checkpoint tracking, verification, and progress updates.
/// Returns None if the stage was already completed in a previous (crashed) run.
async fn run_checked_stage(
    ctx: &TeamContext,
    checkpoint: &mut state::StageCheckpoint,
    run_record: &mut state::RunRecord,
    name: &str,
    fut: impl std::future::Future<Output = Result<StageReport>>,
) -> Result<Option<StageReport>> {
    // Skip if already done in a resumed run
    if checkpoint.is_stage_done(name) {
        eprintln!("  [   SKIP] {name:<10} (completed in previous run)");
        return Ok(None);
    }

    // Write checkpoint before stage starts
    checkpoint.mark_started(name);
    checkpoint.save(&ctx.data_dir)?;

    // Run the stage
    let report = run_stage(name, fut).await;

    // Verify output
    if let Err(reason) = verify_stage_output(&report) {
        eprintln!("  VERIFY: {reason}");
    }

    // Update checkpoint + progress
    checkpoint.mark_done(name, report.status.clone());
    checkpoint.save(&ctx.data_dir)?;
    update_run_record(run_record, &report);

    Ok(Some(report))
}

/// Check stage output for sanity before proceeding.
fn verify_stage_output(report: &StageReport) -> std::result::Result<(), String> {
    match report.stage.as_str() {
        "discover" => {
            if report.created == 0 && matches!(report.status, StageStatus::Success) {
                return Err("discover succeeded but created 0 companies — check domains file".into());
            }
            if report.processed > 0 && report.errors.len() > report.processed / 2 {
                return Err(format!(
                    "discover: {} errors out of {} processed (>50%)",
                    report.errors.len(), report.processed,
                ));
            }
        }
        "enrich" => {
            if report.created == 0 && matches!(report.status, StageStatus::Success) {
                return Err("enrich created 0 enriched companies — LLM may be unresponsive".into());
            }
        }
        "qa" => {
            if matches!(report.status, StageStatus::Failed) {
                return Err("qa audit failed — data may be corrupted".into());
            }
        }
        _ => {}
    }
    Ok(())
}

fn update_run_record(record: &mut state::RunRecord, report: &StageReport) {
    match report.status {
        StageStatus::Success | StageStatus::Partial => {
            record.stages_completed.push(report.stage.clone());
        }
        StageStatus::Failed => {
            record.stages_failed.push(report.stage.clone());
        }
        StageStatus::Skipped => {}
    }
    record.counts.errors += report.errors.len();
    // Stage-specific counts
    match report.stage.as_str() {
        "discover" => record.counts.discovered += report.created,
        "enrich" => record.counts.enriched += report.created,
        "intent" => record.counts.intent_detected += report.created,
        "contacts" => record.counts.contacts_found += report.created,
        "outreach" => record.counts.outreach_drafted += report.created,
        _ => {}
    }
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

fn print_summary(reports: &[StageReport], progress: &state::PipelineProgress) {
    eprintln!();
    eprintln!(
        "  ── Run #{} Summary ───────────────────────────",
        progress.runs.len(),
    );
    for r in reports {
        eprintln!(
            "  {:<10} {:>4} processed  {:>4} created  [{}]",
            r.stage, r.processed, r.created, r.status,
        );
    }
    let total: u64 = reports.iter().map(|r| r.duration_ms).sum();
    eprintln!("  ──────────────────────────────────────────────");
    eprintln!("  This run:  {:.1}s", total as f64 / 1000.0);

    // Accumulated totals
    if progress.runs.len() > 1 {
        let t = progress.totals();
        eprintln!("  ── Totals ({} runs) ──────────────────────────", progress.runs.len());
        eprintln!("  Discovered:  {}", t.discovered);
        eprintln!("  Enriched:    {}", t.enriched);
        eprintln!("  Contacts:    {}", t.contacts_found);
        eprintln!("  Outreach:    {}", t.outreach_drafted);
        let total_time: u64 = progress.runs.iter().map(|r| r.duration_ms).sum();
        eprintln!("  Total time:  {:.0}s", total_time as f64 / 1000.0);

        // Last 5 runs trend
        eprintln!("  ── Recent ───────────────────────────────────");
        for run in progress.runs.iter().rev().take(5).collect::<Vec<_>>().into_iter().rev() {
            eprintln!(
                "  #{:<3} {} {:>3}d {:>3}e {:>3}c [{}]",
                run.run_id,
                &run.started_at[..10],
                run.counts.discovered,
                run.counts.enriched,
                run.counts.contacts_found,
                run.exit_status,
            );
        }
    }
    eprintln!("  ──────────────────────────────────────────────");
}

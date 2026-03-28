use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;
use clap::{Parser, Subcommand};

use leadgen_metal::teams;
use leadgen_metal::Pipeline;

#[derive(Parser)]
#[command(name = "leadgen", about = "B2B lead generation pipeline — Rust-native teams")]
struct Cli {
    /// Data directory for pipeline storage + reports
    #[arg(short = 'D', long, default_value = "data", global = true)]
    data_dir: PathBuf,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run the full B2B lead generation pipeline
    /// (discover -> enrich -> contacts+qa -> outreach)
    Pipeline {
        /// Domains file (one domain per line)
        #[arg(short, long)]
        domains: Option<PathBuf>,

        /// Skip confirmation prompt
        #[arg(short, long)]
        yes: bool,
    },

    /// Show pipeline status and phase detection
    Status,

    /// Show top N discovered companies by ICP score
    Top {
        /// Number of companies to show
        #[arg(default_value = "20")]
        n: usize,
    },

    /// Run a single stage
    Stage {
        /// Stage name: discover, enrich, contacts, qa, outreach
        name: String,

        /// Domains file (for discover stage)
        #[arg(short, long)]
        domains: Option<PathBuf>,
    },

    /// Generate synthetic ML training data
    MlDatagen {
        /// Output JSONL file path
        #[arg(short, long)]
        output: PathBuf,

        /// Number of contact label samples (default: 330)
        #[arg(short, long, default_value = "330")]
        count: usize,
    },

    /// Run ML eval harness on labeled data
    MlEval {
        /// Path to labeled JSONL file
        #[arg(short, long)]
        labels: PathBuf,

        /// Directory for eval report output
        #[arg(short, long)]
        report_dir: PathBuf,

        /// Only evaluate scoring (skip NER)
        #[arg(long)]
        scoring_only: bool,
    },

    /// Optimize ML weights (grid search + SGD + calibration)
    MlOptimize {
        /// Path to labeled JSONL file
        #[arg(short, long)]
        labels: PathBuf,

        /// Directory to write optimized model files
        #[arg(short, long)]
        output: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();
    let data_dir = &cli.data_dir;
    std::fs::create_dir_all(data_dir)?;

    match cli.command {
        Command::Pipeline { domains, yes } => {
            let pipeline = Pipeline::open(&data_dir.join("pipeline"))?;
            let mut ctx = teams::TeamContext::new(pipeline, data_dir.clone());
            ctx.auto_confirm = yes;
            let ctx = Arc::new(ctx);
            teams::run_pipeline(ctx, domains.as_deref()).await?;
        }

        Command::Status => {
            let pipeline = Pipeline::open(&data_dir.join("pipeline"))?;
            let ctx = teams::TeamContext::new(pipeline, data_dir.clone());
            let plan = teams::state::assess(&ctx)?;
            eprintln!("{plan}");
        }

        Command::Top { n } => {
            show_top(data_dir, n)?;
        }

        Command::MlDatagen { output, count } => {
            use leadgen_metal::kernel::data_gen;

            eprintln!("  Generating {count} contact label samples...");
            let contact_samples = data_gen::generate_contact_labels(count);
            data_gen::write_labels(&contact_samples, &output)?;
            eprintln!("  Wrote {} samples → {}", contact_samples.len(), output.display());

            // Also generate Remote Worldwide samples alongside
            let rw_path = output.with_file_name("remote_worldwide_labels.jsonl");
            let rw_samples = data_gen::generate_remote_worldwide_labels();
            data_gen::write_remote_worldwide_labels(&rw_samples, &rw_path)?;
            eprintln!("  Wrote {} Remote Worldwide samples → {}", rw_samples.len(), rw_path.display());
        }

        Command::MlEval { labels, report_dir, scoring_only: _ } => {
            use leadgen_metal::kernel::ml_eval;
            use leadgen_metal::kernel::scoring::LogisticScorer;

            // Try to load optimized scorer, fall back to pretrained
            let models_dir = data_dir.join("models");
            let scorer_path = models_dir.join("logistic_scorer.json");
            let scorer = if scorer_path.exists() {
                eprintln!("  Loading optimized scorer from {}", scorer_path.display());
                LogisticScorer::from_json(&scorer_path)
            } else {
                LogisticScorer::default_pretrained()
            };

            // Find next iteration number
            let iteration = std::fs::read_dir(&report_dir)
                .ok()
                .map(|entries| {
                    entries.filter_map(|e| e.ok())
                        .filter_map(|e| {
                            let name = e.file_name().to_string_lossy().to_string();
                            name.strip_prefix("eval_iter_")
                                .and_then(|s| s.strip_suffix(".json"))
                                .and_then(|s| s.parse::<u32>().ok())
                        })
                        .max()
                        .unwrap_or(0) + 1
                })
                .unwrap_or(0);

            let report_path = report_dir.join(format!("eval_iter_{iteration}.json"));
            let report = ml_eval::run_eval(&scorer, &labels, &report_path, iteration)?;

            eprintln!("  ── Scoring Eval (iter {iteration}) ──");
            eprintln!("  Samples:   {} ({} positive)", report.scoring.sample_count, report.scoring.positive_count);
            eprintln!("  F1:        {:.3}", report.scoring.f1);
            eprintln!("  Precision: {:.3}", report.scoring.precision);
            eprintln!("  Recall:    {:.3}", report.scoring.recall);
            eprintln!("  AUC-ROC:   {:.3}", report.scoring.auc_roc);
            eprintln!("  NDCG@10:   {:.3}", report.scoring.ndcg_at_10);
            eprintln!("  Threshold: {:.2}", report.scoring.threshold);
            eprintln!("  Report:    {}", report_path.display());
        }

        Command::MlOptimize { labels, output } => {
            use leadgen_metal::kernel::ml_eval;
            use leadgen_metal::kernel::weight_optimizer;

            let samples = ml_eval::load_labels(&labels)?;
            eprintln!("  Loaded {} labeled samples", samples.len());

            let (result, scorer, _calibrator) = weight_optimizer::optimize(&samples);

            // Save optimized weights
            let icp_path = output.join("icp_weights.json");
            result.icp_weights.to_json(&icp_path)?;
            eprintln!("  ICP weights → {}", icp_path.display());

            let scorer_path = output.join("logistic_scorer.json");
            scorer.to_json(&scorer_path)?;
            eprintln!("  LogisticScorer → {}", scorer_path.display());

            let result_path = output.join("optimization_result.json");
            weight_optimizer::save_result(&result, &result_path)?;

            eprintln!("  ── Optimization Result ──");
            eprintln!("  Grid combos:    {}", result.grid_search_combos);
            eprintln!("  SGD epochs:     {}", result.sgd_epochs);
            eprintln!("  Best threshold: {:.2}", result.best_threshold);
            eprintln!("  Best F1:        {:.3}", result.best_f1);
            eprintln!("  Calibrated:     {}", result.calibrated);
        }

        Command::Stage { name, domains } => {
            let pipeline = Pipeline::open(&data_dir.join("pipeline"))?;
            let ctx = Arc::new(teams::TeamContext::new(pipeline, data_dir.clone()));
            std::fs::create_dir_all(ctx.reports_dir())?;

            let report = match name.as_str() {
                "discover" => teams::discover::run(&ctx, domains.as_deref()).await?,
                "enrich" => teams::enrich::run(&ctx).await?,
                "contacts" => teams::contacts::run(&ctx).await?,
                "qa" => teams::qa::run(&ctx).await?,
                "outreach" => teams::outreach::run(&ctx).await?,
                other => anyhow::bail!("unknown stage: {other} (valid: discover, enrich, contacts, qa, outreach)"),
            };

            ctx.pipeline.flush()?;
            eprintln!(
                "  [{:>7}] {:<10} processed={} created={} errors={}",
                report.status, report.stage, report.processed, report.created, report.errors.len(),
            );
        }
    }

    Ok(())
}

fn show_top(data_dir: &Path, n: usize) -> Result<()> {
    // Load discovery report
    let path = data_dir.join("reports/discovery.json");
    if !path.exists() {
        eprintln!("  No discovery report found. Run `leadgen pipeline` first.");
        return Ok(());
    }

    let content = std::fs::read_to_string(&path)?;
    let report: teams::discover::DiscoveryReport = serde_json::from_str(&content)?;

    let mut companies = report.companies;
    companies.sort_by(|a, b| b.icp_score.partial_cmp(&a.icp_score).unwrap_or(std::cmp::Ordering::Equal));

    eprintln!("  ── Top {} Companies by ICP Score ──", n.min(companies.len()));
    eprintln!("  {:<4} {:<30} {:<6} {}", "#", "Domain", "ICP", "Tech Signals");
    eprintln!("  {}", "─".repeat(70));

    for (i, company) in companies.iter().take(n).enumerate() {
        eprintln!(
            "  {:<4} {:<30} {:<6.0}% {}",
            i + 1,
            company.domain,
            company.icp_score * 100.0,
            company.tech_signals.join(", "),
        );
    }

    // Also show enrichment if available
    let enrich_path = data_dir.join("reports/enrichment.json");
    if enrich_path.exists() {
        let content = std::fs::read_to_string(&enrich_path)?;
        let enrich: teams::enrich::EnrichmentReport = serde_json::from_str(&content)?;

        eprintln!();
        eprintln!("  ── Enriched Companies ──");
        eprintln!("  {:<4} {:<25} {:<14} {:<10} {:<6}", "#", "Domain", "Category", "AI Tier", "Score");
        eprintln!("  {}", "─".repeat(65));

        for (i, company) in enrich.companies.iter().take(n).enumerate() {
            eprintln!(
                "  {:<4} {:<25} {:<14} {:<10} {:.0}%",
                i + 1,
                company.domain,
                company.category,
                company.ai_tier,
                company.enrichment_score * 100.0,
            );
        }
    }

    Ok(())
}

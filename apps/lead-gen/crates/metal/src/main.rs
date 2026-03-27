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

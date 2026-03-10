use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "companies", about = "Audit & hide broken companies")]
struct Args {
    /// Minimum broken signals to flag a company (default: 3)
    #[arg(long, default_value = "3")]
    min_reasons: usize,

    /// Actually hide companies (default: dry-run)
    #[arg(long)]
    apply: bool,

    /// Show per-company details
    #[arg(long)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();
    let db = nomad::d1::D1Client::from_env()?;

    info!(
        "Auditing companies (min_reasons={}, apply={})",
        args.min_reasons, args.apply
    );

    let (stats, results) = companies::audit::audit_companies(&db, args.min_reasons, args.apply)
        .await?;

    if args.verbose {
        let mut broken: Vec<_> = results.iter().filter(|r| r.is_broken).collect();
        broken.sort_by(|a, b| b.broken_score.cmp(&a.broken_score));

        for r in &broken {
            let reasons: Vec<String> = r.reasons.iter().map(|r| r.to_string()).collect();
            println!(
                "  [{}] {} (key={}) — {} signals: {}",
                r.company_id,
                r.company_name,
                r.company_key,
                r.broken_score,
                reasons.join(", ")
            );
        }
    }

    println!("\n{stats}");

    if !args.apply && stats.broken > 0 {
        println!("Dry-run mode. Re-run with --apply to hide {} broken companies.", stats.broken);
    }

    Ok(())
}

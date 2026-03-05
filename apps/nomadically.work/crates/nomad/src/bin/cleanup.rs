use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "nomad-cleanup", about = "Stale job cleanup")]
struct Args {
    /// Max age in days before marking jobs as stale
    #[arg(long, default_value = "60")]
    max_age_days: u32,

    /// Grace period in days before purging stale jobs
    #[arg(long, default_value = "14")]
    grace_days: u32,

    /// Actually delete stale jobs (default: mark only)
    #[arg(long)]
    purge: bool,
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

    info!("cleanup ready");

    let stats = nomad::cleanup::cleanup_stale_jobs(&db, args.max_age_days).await?;
    info!(
        "Marked {} newly stale ({} total stale)",
        stats.newly_stale, stats.total_stale
    );

    if args.purge {
        let purged = nomad::cleanup::purge_stale_jobs(&db, args.grace_days).await?;
        info!("Purged {} stale jobs", purged);
    }

    Ok(())
}

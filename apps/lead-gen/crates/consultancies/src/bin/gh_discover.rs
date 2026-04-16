use anyhow::{Context, Result};
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "gh_discover", about = "Discover AI consultancies via GitHub GraphQL")]
struct Cli {
    #[arg(long)]
    dry_run: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let _ = dotenvy::from_filename("../../.env.local");
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let cli = Cli::parse();

    let db_url = std::env::var("NEON_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .context("NEON_DATABASE_URL must be set")?;

    info!("Connecting to Neon PostgreSQL...");
    let pool = consultancies::db::connect(&db_url).await?;
    info!("Connected");

    consultancies::github::run(&pool, cli.dry_run).await?;

    Ok(())
}

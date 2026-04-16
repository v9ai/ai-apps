use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use reqwest::Client;
use tracing::{info, warn};

use common_crawl::{cdx, db, pipeline};

#[derive(Parser)]
#[command(name = "common-crawl", about = "Seed company discovery from Common Crawl")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Print CDX records for a domain without DB writes
    Seed {
        domain: String,
        #[arg(long, default_value = "50")]
        limit: usize,
    },
    /// Fetch WARC snapshots, extract contacts, write to Neon
    Fetch {
        domain: String,
        #[arg(long, default_value = "15")]
        pages: usize,
        #[arg(long)]
        dry_run: bool,
    },
    /// Process all companies in Neon that have no last_seen_crawl_id
    Backfill {
        #[arg(long, default_value = "500")]
        limit: i64,
        #[arg(long, default_value = "15")]
        pages_per_domain: usize,
        #[arg(long)]
        dry_run: bool,
    },
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
    let client = Client::builder()
        .user_agent("CCBot/2.0 (research)")
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    match cli.cmd {
        Cmd::Seed { domain, limit } => {
            info!("resolving CC indices...");
            let (crawl_id, records) = cdx::query_domain_multi(&client, &domain, limit).await?;
            println!("crawl_id={crawl_id}  total={}", records.len());
            for r in &records {
                println!("  score={:.1}  ts={}  {}", cdx::page_score(&r.url), r.timestamp, r.url);
            }
        }

        Cmd::Fetch { domain, pages, dry_run } => {
            let pool = connect_db().await?;
            let stats = pipeline::run_domain(&client, &pool, &domain, pages, dry_run).await?;
            println!(
                "{}: {} pages, {} persons, {} contacts upserted, {} snapshots",
                stats.domain, stats.pages_fetched, stats.persons_found,
                stats.contacts_upserted, stats.snapshots_written,
            );
        }

        Cmd::Backfill { limit, pages_per_domain, dry_run } => {
            let pool = connect_db().await?;
            let domains = db::domains_without_crawl(&pool, limit).await?;
            info!(count = domains.len(), "domains queued");

            let mut total_contacts = 0usize;
            let mut total_pages = 0usize;

            for domain in &domains {
                match pipeline::run_domain(&client, &pool, domain, pages_per_domain, dry_run).await {
                    Ok(stats) => {
                        total_contacts += stats.contacts_upserted;
                        total_pages += stats.pages_fetched;
                    }
                    Err(e) => warn!(domain = %domain, error = %e, "skipping"),
                }
            }

            info!(
                domains = domains.len(),
                total_pages,
                total_contacts,
                "backfill complete"
            );
        }
    }

    Ok(())
}

async fn connect_db() -> Result<sqlx::PgPool> {
    let url = std::env::var("NEON_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .context("NEON_DATABASE_URL must be set")?;
    db::connect(&url).await
}

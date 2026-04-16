use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use reqwest::Client;
use tracing::{info, warn};

use common_crawl::{cdx, db, extract};

#[derive(Parser)]
#[command(name = "common-crawl", about = "Seed company discovery from Common Crawl")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Print CDX records found for a domain (no DB writes)
    Seed {
        domain: String,
        #[arg(long, default_value = "50")]
        limit: usize,
    },
    /// Fetch WARC snapshots for a domain and upsert last_seen to Neon
    Fetch {
        domain: String,
        #[arg(long, default_value = "10")]
        limit: usize,
        #[arg(long)]
        dry_run: bool,
    },
    /// Batch-fetch all companies in Neon that have no last_seen_crawl_id
    Backfill {
        #[arg(long, default_value = "100")]
        limit: i64,
        #[arg(long, default_value = "5")]
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

    info!("resolving latest Common Crawl index...");
    let crawl_id = cdx::latest_crawl_id(&client).await?;
    info!(crawl_id = %crawl_id, "using crawl index");

    match cli.cmd {
        Cmd::Seed { domain, limit } => {
            let records = cdx::query_domain(&client, &crawl_id, &domain, limit).await?;
            let interesting: Vec<_> = records.iter().filter(|r| cdx::is_interesting(&r.url)).collect();
            println!("{} records total, {} interesting", records.len(), interesting.len());
            for r in &interesting {
                println!("  {} | {} | off={} len={}", r.timestamp, r.url, r.offset, r.length);
            }
        }

        Cmd::Fetch { domain, limit, dry_run } => {
            let db_url = require_db_url()?;
            let pool = db::connect(&db_url).await?;
            fetch_domain(&client, &pool, &crawl_id, &domain, limit, dry_run).await?;
        }

        Cmd::Backfill { limit, pages_per_domain, dry_run } => {
            let db_url = require_db_url()?;
            let pool = db::connect(&db_url).await?;

            let domains = db::domains_without_crawl(&pool, limit).await?;
            info!(count = domains.len(), "domains queued for backfill");

            for domain in &domains {
                match fetch_domain(&client, &pool, &crawl_id, domain, pages_per_domain, dry_run).await {
                    Ok(_) => {}
                    Err(e) => warn!(domain = %domain, error = %e, "fetch failed, skipping"),
                }
            }
            info!("backfill complete");
        }
    }

    Ok(())
}

async fn fetch_domain(
    client: &Client,
    pool: &sqlx::PgPool,
    crawl_id: &str,
    domain: &str,
    limit: usize,
    dry_run: bool,
) -> Result<()> {
    let records = cdx::query_domain(client, crawl_id, domain, limit * 4)
        .await
        .with_context(|| format!("CDX query for {domain}"))?;

    let interesting: Vec<_> = records
        .into_iter()
        .filter(|r| cdx::is_interesting(&r.url))
        .take(limit)
        .collect();

    if interesting.is_empty() {
        info!(domain = %domain, "no interesting pages in CDX");
        return Ok(());
    }

    info!(domain = %domain, pages = interesting.len(), "fetching WARC snapshots");

    // Use the most recent record as the last_seen anchor.
    let anchor = interesting.iter().max_by(|a, b| a.timestamp.cmp(&b.timestamp)).unwrap();

    let mut emails_found = Vec::new();
    for record in &interesting {
        match cdx::fetch_warc_html(client, record).await {
            Ok(html) => {
                let content = extract::extract(&html, &record.url);
                emails_found.extend(content.emails);
                info!(
                    url = %record.url,
                    title = ?content.title,
                    text_bytes = content.text.len(),
                    "fetched"
                );
            }
            Err(e) => {
                warn!(url = %record.url, error = %e, "WARC fetch failed");
            }
        }
    }

    emails_found.sort();
    emails_found.dedup();
    if !emails_found.is_empty() {
        info!(domain = %domain, emails = ?emails_found, "emails extracted");
    }

    if !dry_run {
        let rows = db::update_last_seen(pool, domain, anchor).await?;
        info!(domain = %domain, rows_updated = rows, crawl_id = %anchor.crawl_id, ts = %anchor.timestamp, "last_seen updated");
    } else {
        info!(domain = %domain, "dry_run — skipping DB write");
    }

    Ok(())
}

fn require_db_url() -> Result<String> {
    std::env::var("NEON_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .context("NEON_DATABASE_URL must be set")
}

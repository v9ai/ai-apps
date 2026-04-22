mod bandit;
mod config;
mod embed;
mod github;
mod lance;
mod pg;
mod pipeline;
mod score;
mod types;

use anyhow::Result;
use clap::{Parser, Subcommand};
use config::Config;
use embed::Embedder;
use github::Github;
use lance::Lance;
use pipeline::Pipeline;
use score::ScoreWeights;
use types::{Contact, MatchStatus};

#[derive(Parser)]
#[command(name = "leadmatch")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Apply the Neon migrations
    Migrate,
    /// Run the matching pipeline from a JSON file of contacts -> writes to LanceDB
    Match {
        /// Path to JSON array of Contact records
        #[arg(short, long)]
        input: String,
    },
    /// Read matched results from LanceDB and push to Neon
    Flush {
        /// Only flush these statuses (comma-separated). Default: matched
        #[arg(long, default_value = "matched")]
        statuses: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let cfg = Config::from_env()?;
    let cli = Cli::parse();

    match cli.cmd {
        Cmd::Migrate => {
            let pool = pg::connect(&cfg.database_url).await?;
            pg::migrate(&pool).await?;
            tracing::info!("migrations applied");
        }
        Cmd::Match { input } => {
            let raw = std::fs::read_to_string(&input)?;
            let contacts: Vec<Contact> = serde_json::from_str(&raw)?;

            let lance = Lance::open(&cfg.lance_uri).await?;
            lance.ensure_tables().await?;

            let pg_pool = pg::connect(&cfg.database_url).await?;
            let gh = Github::new(cfg.github_token.clone())?;
            let emb = Embedder::load(&cfg.embed_model).await?;

            let pipe = Pipeline {
                gh: &gh,
                emb: &emb,
                lance: &lance,
                bandit: bandit::Bandit { pg: &pg_pool },
                weights: ScoreWeights::default(),
                threshold: cfg.match_threshold,
            };

            for c in &contacts {
                match pipe.process(c).await {
                    Ok(r) => tracing::info!(
                        contact = %c.id, status = ?r.status, login = ?r.login, score = r.score,
                        "processed"
                    ),
                    Err(e) => tracing::error!(contact = %c.id, "failed: {e:#}"),
                }
            }
        }
        Cmd::Flush { statuses } => {
            let keep: std::collections::HashSet<String> =
                statuses.split(',').map(|s| s.trim().to_string()).collect();

            let lance = Lance::open(&cfg.lance_uri).await?;
            lance.ensure_tables().await?;
            let results = lance.all_results().await?;

            let pool = pg::connect(&cfg.database_url).await?;

            let raw = std::fs::read_to_string("contacts.json").ok();
            if let Some(r) = raw {
                let cs: Vec<Contact> = serde_json::from_str(&r)?;
                for c in &cs { pg::upsert_contact(&pool, c).await?; }
            }

            let mut pushed = 0;
            for r in &results {
                if keep.contains(r.status.as_str()) {
                    pg::persist_match(&pool, r).await?;
                    pushed += 1;
                }
            }
            tracing::info!("flushed {}/{} to neon", pushed, results.len());
            let _ = MatchStatus::Matched;
        }
    }
    Ok(())
}

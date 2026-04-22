mod config;
mod embed;
mod github;
mod lance;
mod paper_fetch;
mod pg;
mod pipeline;
mod promote;
mod score;
mod sqlite;
mod types;

use anyhow::Result;
use clap::{Parser, Subcommand};
use config::Config;
use embed::Embedder;
use github::Github;
use lance::Lance;
use paper_fetch::Fetchers;
use pipeline::Pipeline;
use score::ScoreWeights;
use types::Contact;

#[derive(Parser)]
#[command(name = "leadmatch")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Initialize the local SQLite store + Lance tables.
    Migrate,
    /// Match contacts supplied as a JSON array file.
    Match {
        #[arg(short, long)]
        input: String,
    },
    /// Pull unmatched `papers`-tagged contacts from Neon and match them.
    Run {
        #[arg(long, default_value_t = 20)]
        limit: i64,
    },
    /// Promote matched local state to the production Neon contacts table.
    Promote {
        #[arg(long, default_value = "matched")]
        status: String,
        #[arg(long)]
        min_score: Option<f32>,
    },
    /// Render a human dossier for a login from all three stores.
    Dossier {
        #[arg(long)]
        login: String,
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
            let sqlite_db = sqlite::connect(&cfg.sqlite_path).await?;
            sqlite::migrate(&sqlite_db).await?;
            let lance = Lance::open(&cfg.lance_uri).await?;
            lance.ensure_tables().await?;
            tracing::info!("sqlite + lance initialized");
        }

        Cmd::Match { input } => {
            let raw = std::fs::read_to_string(&input)?;
            let contacts: Vec<Contact> = serde_json::from_str(&raw)?;
            run_pipeline(&cfg, contacts).await?;
        }

        Cmd::Run { limit } => {
            let pg_pool = pg::connect(&cfg.database_url).await?;
            let seeds = pg::list_contacts_needing_match(&pg_pool, limit).await?;
            tracing::info!("fetched {} contact seeds from neon", seeds.len());

            let contacts: Vec<Contact> = seeds
                .into_iter()
                .map(|s| {
                    let name = format!("{} {}", s.first_name, s.last_name).trim().to_string();
                    Contact {
                        id: s.id.to_string(),
                        name,
                        affiliation: s.company,
                        email: s.email,
                        tags: vec!["papers".into()],
                        papers: vec![],
                    }
                })
                .collect();
            run_pipeline(&cfg, contacts).await?;
        }

        Cmd::Promote { status, min_score } => {
            let pg_pool = pg::connect(&cfg.database_url).await?;
            let sqlite_db = sqlite::connect(&cfg.sqlite_path).await?;
            let lance = Lance::open(&cfg.lance_uri).await?;
            let threshold = min_score.unwrap_or(cfg.match_threshold);
            let counts = promote::promote(&pg_pool, &sqlite_db, &lance, &status, threshold).await?;
            tracing::info!(
                "promote: considered={} promoted={} skipped={}",
                counts.considered, counts.promoted, counts.skipped
            );
        }

        Cmd::Dossier { login } => {
            println!("dossier for {}: TODO (reads from sqlite, lance, pg)", login);
        }
    }
    Ok(())
}

async fn run_pipeline(cfg: &Config, contacts: Vec<Contact>) -> Result<()> {
    let sqlite_db = sqlite::connect(&cfg.sqlite_path).await?;
    sqlite::migrate(&sqlite_db).await?;

    let lance = Lance::open(&cfg.lance_uri).await?;
    lance.ensure_tables().await?;

    let gh = Github::new(cfg.github_token.clone())?;
    let emb = Embedder::load(&cfg.embed_model).await?;
    let fetchers = Fetchers::default();

    let pipe = Pipeline {
        gh: &gh,
        emb: &emb,
        lance: &lance,
        sqlite: &sqlite_db,
        fetchers: &fetchers,
        weights: ScoreWeights::default(),
        threshold: cfg.match_threshold,
        fetch_per_source: cfg.fetch_per_source,
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
    Ok(())
}

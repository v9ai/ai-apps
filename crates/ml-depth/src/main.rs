//! ML Depth CLI — discover and validate genuine deep ML companies.
//!
//! ```bash
//! # Profile a single company
//! ml-depth profile assemblyai
//!
//! # Batch profile from a file (one company per line)
//! ml-depth batch --input companies.txt
//!
//! # Discover candidates from HuggingFace
//! ml-depth discover --limit 50
//!
//! # Sync HF data to local SQLite cache
//! ml-depth sync --models 5000
//! ```

use std::path::PathBuf;

use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing_subscriber::EnvFilter;

use ml_depth::pipeline::MlDepthPipeline;
use ml_depth::report;

#[derive(Parser)]
#[command(name = "ml-depth", about = "Discover genuine deep ML companies")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Profile a specific company's ML depth
    Profile {
        /// Company name (used as HF org name and paper search query)
        company: String,
    },

    /// Batch profile companies from a file (one name per line)
    Batch {
        /// Path to file with company names
        #[arg(long)]
        input: PathBuf,

        /// Output format: table (default) or csv
        #[arg(long, default_value = "table")]
        format: String,
    },

    /// Discover candidate ML orgs from HuggingFace
    Discover {
        /// Max candidates to return
        #[arg(long, default_value = "50")]
        limit: usize,
    },

    /// Sync popular HF repos to local SQLite cache
    Sync {
        /// Number of top models to sync
        #[arg(long, default_value = "5000")]
        models: usize,

        /// Number of top datasets to sync
        #[arg(long, default_value = "1000")]
        datasets: usize,

        /// SQLite database path
        #[arg(long, default_value = "hf_repos.db")]
        db: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let _ = dotenvy::dotenv();
    let cli = Cli::parse();

    match cli.command {
        Command::Profile { company } => {
            let pipeline = MlDepthPipeline::from_env()?;
            let profile = pipeline.profile_company(&company).await?;
            println!("{}", report::format_company_report(&profile));
        }

        Command::Batch { input, format } => {
            let content = std::fs::read_to_string(&input)?;
            let companies: Vec<String> = content
                .lines()
                .map(|l| l.trim().to_owned())
                .filter(|l| !l.is_empty() && !l.starts_with('#'))
                .collect();

            let pipeline = MlDepthPipeline::from_env()?;
            let profiles = pipeline.batch_profile(&companies).await?;

            match format.as_str() {
                "csv" => print!("{}", report::format_csv(&profiles)),
                _ => println!("{}", report::format_batch_table(&profiles)),
            }
        }

        Command::Discover { limit } => {
            let hf_client = hf::HfClient::from_env(8)?;
            let discovery =
                ml_depth::discovery::CandidateDiscovery::new(&hf_client);
            let candidates = discovery.discover_by_keywords(limit).await?;

            println!("\nDiscovered {} candidate orgs:\n", candidates.len());
            for (i, org) in candidates.iter().enumerate() {
                println!("  {}. {}", i + 1, org);
            }

            // Now profile each candidate
            println!("\nProfiling candidates...\n");
            let pipeline = MlDepthPipeline::from_env()?;
            let profiles = pipeline
                .batch_profile(&candidates)
                .await?;
            println!("{}", report::format_batch_table(&profiles));
        }

        Command::Sync {
            models,
            datasets,
            db,
        } => {
            let hf_client = hf::HfClient::from_env(8)?;
            let hf_db = hf::db::HfDb::open(&db)?;

            let total = hf_client.sync_popular(&hf_db, models, datasets, 0).await?;
            println!("Synced {total} repos to {}", db.display());

            let model_count = hf_db.count(hf::RepoType::Model)?;
            let dataset_count = hf_db.count(hf::RepoType::Dataset)?;
            let size = hf_db.file_size()?;
            println!(
                "DB: {model_count} models, {dataset_count} datasets ({:.1} MB)",
                size as f64 / 1_048_576.0
            );
        }
    }

    Ok(())
}

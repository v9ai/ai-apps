//! CLI entry point for the hoa-research pipeline.

use std::path::PathBuf;

use clap::Parser;
use tracing_subscriber::EnvFilter;

use hoa_research::error::Result;
use hoa_research::hf_client::HfClient;
use hoa_research::llm::{best_device, LocalLlm};
use hoa_research::pipeline::Pipeline;
use hoa_research::types::PersonInput;

#[derive(Parser)]
#[command(name = "hoa-research", about = "20-agent person research pipeline")]
struct Cli {
    /// Person slug (e.g. "athos-georgiou")
    #[arg(long)]
    slug: String,

    /// Person name override
    #[arg(long)]
    name: Option<String>,

    /// Person role override
    #[arg(long)]
    role: Option<String>,

    /// Person org override
    #[arg(long)]
    org: Option<String>,

    /// Output directory for research JSON
    #[arg(long, default_value = "../src/lib/research")]
    output_dir: PathBuf,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("hoa_research=info".parse().unwrap()))
        .init();

    let cli = Cli::parse();

    // Load personality from TypeScript file (or use CLI overrides)
    let person = load_personality(&cli)?;
    tracing::info!(
        "Researching: {} ({} @ {})",
        person.name, person.role, person.org
    );

    // Load HF token from cache
    let hf_token = load_hf_token();
    let hf_client = HfClient::new(&hf_token);
    if hf_client.is_some() {
        tracing::info!("Dual-lane mode: Candle local + HF 72B");
    } else {
        tracing::info!("Single-lane mode: Candle local only");
    }

    // Load Candle model
    let device = best_device()?;
    let llm = LocalLlm::load_default(&device)?;

    // Run pipeline
    let pipeline = Pipeline::new(llm, hf_client);
    let state = pipeline.run(person).await?;

    // Write output
    let output_path = cli.output_dir.join(format!("{}.json", cli.slug));
    let json = serde_json::to_string_pretty(&state)?;
    std::fs::write(&output_path, &json)?;
    tracing::info!("Saved to {}", output_path.display());

    Ok(())
}

fn load_personality(cli: &Cli) -> Result<PersonInput> {
    // Try to read from personality TS file
    let ts_path = PathBuf::from("../personalities").join(format!("{}.ts", cli.slug));

    if ts_path.exists() {
        let content = std::fs::read_to_string(&ts_path)?;
        return Ok(parse_personality_ts(&content, &cli.slug, cli));
    }

    // Fallback to CLI args
    Ok(PersonInput {
        name: cli.name.clone().unwrap_or_else(|| cli.slug.replace('-', " ")),
        slug: cli.slug.clone(),
        role: cli.role.clone().unwrap_or_default(),
        org: cli.org.clone().unwrap_or_default(),
        ..Default::default()
    })
}

/// Best-effort extraction from TypeScript personality files.
fn parse_personality_ts(content: &str, slug: &str, cli: &Cli) -> PersonInput {
    let extract = |key: &str| -> Option<String> {
        let pattern = format!("{key}:");
        content
            .lines()
            .find(|line| line.trim().starts_with(&pattern))
            .and_then(|line| {
                let after = line.split_once(':')?.1.trim();
                let unquoted = after
                    .trim_start_matches('"')
                    .trim_end_matches(',')
                    .trim_end_matches('"');
                Some(unquoted.to_string())
            })
    };

    PersonInput {
        name: cli.name.clone().or_else(|| extract("name")).unwrap_or_else(|| slug.replace('-', " ")),
        slug: slug.to_string(),
        role: cli.role.clone().or_else(|| extract("role")).unwrap_or_default(),
        org: cli.org.clone().or_else(|| extract("org")).unwrap_or_default(),
        description: extract("description").unwrap_or_default(),
        github: extract("github"),
        orcid: extract("orcid"),
        blog_url: extract("blogUrl"),
        papers: Vec::new(), // TODO: parse papers array
    }
}

fn load_hf_token() -> String {
    // Check env first
    if let Ok(token) = std::env::var("HF_TOKEN") {
        if !token.is_empty() {
            return token;
        }
    }

    // Check HF cache
    let cache_path = dirs_next::home_dir()
        .map(|h| h.join(".cache/huggingface/token"))
        .unwrap_or_default();

    std::fs::read_to_string(cache_path)
        .unwrap_or_default()
        .trim()
        .to_string()
}

/// Minimal home_dir without the dirs-next crate
mod dirs_next {
    use std::path::PathBuf;

    pub fn home_dir() -> Option<PathBuf> {
        std::env::var("HOME")
            .ok()
            .map(PathBuf::from)
    }
}

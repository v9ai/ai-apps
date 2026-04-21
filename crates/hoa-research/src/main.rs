//! CLI entry point for the hoa-research pipeline.

use std::path::PathBuf;

use clap::Parser;
use tracing_subscriber::EnvFilter;

use hoa_research::error::Result;
use hoa_research::llm::LocalLlm;
use hoa_research::output;
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

    /// Reformat an existing raw ResearchState JSON into frontend schema (skip pipeline)
    #[arg(long)]
    reformat: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("hoa_research=info".parse().unwrap()))
        .init();

    let cli = Cli::parse();

    // Reformat mode: skip pipeline, just transform existing raw JSON
    if let Some(raw_path) = &cli.reformat {
        let raw = std::fs::read_to_string(raw_path)?;
        let state: hoa_research::types::ResearchState = serde_json::from_str(&raw)?;
        let research = output::transform(&state);
        let output_path = cli.output_dir.join(format!("{}.json", cli.slug));
        let json = serde_json::to_string_pretty(&research)?;
        std::fs::write(&output_path, &json)?;
        tracing::info!("Reformatted → {}", output_path.display());
        tracing::info!(
            "Output: {} timeline, {} contributions, {} quotes, {} questions",
            research.timeline.len(),
            research.key_contributions.len(),
            research.quotes.len(),
            research.questions.as_ref().map(|q| q.len()).unwrap_or(0),
        );
        return Ok(());
    }

    // Load personality from TypeScript file (or use CLI overrides)
    let person = load_personality(&cli)?;
    tracing::info!(
        "Researching: {} ({} @ {})",
        person.name, person.role, person.org
    );

    // Load local model via mistral.rs (Metal, GGUF Q4_K_M)
    let llm = LocalLlm::load_default().await?;

    // Run pipeline (fully local)
    let pipeline = Pipeline::new(llm);
    let state = pipeline.run(person).await?;

    // Transform to frontend-compatible schema and write
    let research = output::transform(&state);
    let output_path = cli.output_dir.join(format!("{}.json", cli.slug));
    let json = serde_json::to_string_pretty(&research)?;
    std::fs::write(&output_path, &json)?;
    tracing::info!("Saved to {}", output_path.display());
    tracing::info!(
        "Output: {} timeline events, {} contributions, {} quotes, {} questions",
        research.timeline.len(),
        research.key_contributions.len(),
        research.quotes.len(),
        research.questions.as_ref().map(|q| q.len()).unwrap_or(0),
    );

    Ok(())
}

fn load_personality(cli: &Cli) -> Result<PersonInput> {
    let candidates = [
        PathBuf::from("../../apps/hoa/personalities"),
        PathBuf::from("../personalities"),
        PathBuf::from("personalities"),
    ];
    let ts_path = candidates
        .iter()
        .map(|p| p.join(format!("{}.ts", cli.slug)))
        .find(|p| p.exists())
        .unwrap_or_else(|| PathBuf::from("personalities").join(format!("{}.ts", cli.slug)));

    if ts_path.exists() {
        let content = std::fs::read_to_string(&ts_path)?;
        return Ok(parse_personality_ts(&content, &cli.slug, cli));
    }

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
        let pattern = format!("{}:", key);
        content.lines().find_map(|line| {
            let trimmed = line.trim();
            if !trimmed.starts_with(&pattern) {
                return None;
            }
            let after_colon = &trimmed[pattern.len()..];
            let start = after_colon.find('"')? + 1;
            let rest = &after_colon[start..];
            let end = rest.find('"')?;
            Some(rest[..end].to_string())
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
        papers: Vec::new(),
    }
}

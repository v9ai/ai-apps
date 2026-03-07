use agentic_press::pipeline::Pipeline;
use agentic_press::research_phase::ResearchConfig;
use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "agentic_press")]
#[command(about = "5-agent content pipeline powered by deepseek-reasoner")]
struct Cli {
    #[arg(long, default_value = "agentic AI, Claude Code, Rust, multi-agent systems, developer tooling")]
    niche: String,

    #[arg(long, default_value = "./drafts")]
    output_dir: String,

    /// How many articles to produce in one run (topics are picked in parallel)
    #[arg(long, default_value_t = 1)]
    count: usize,

    /// Publish finished articles to vadim.blog and run `vercel deploy --prod`
    #[arg(long, default_value_t = true)]
    publish: bool,

    /// Enable paper search + multi-model research synthesis
    #[arg(long, default_value_t = false)]
    research: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter("agentic_press=info")
        .init();

    let cli = Cli::parse();

    info!(
        "DEEPSEEK_API_KEY: {}",
        if std::env::var("DEEPSEEK_API_KEY").is_ok() { "set" } else { "NOT SET" }
    );

    let mut pipeline = Pipeline::new(cli.niche, cli.output_dir)
        .with_count(cli.count)
        .with_publish(cli.publish);

    if cli.research {
        info!("Research mode enabled: paper search + multi-model synthesis");
        pipeline = pipeline.with_research(ResearchConfig::default());
    }

    pipeline.run().await
}

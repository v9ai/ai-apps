use agentic_press::pipeline::Pipeline;
use agentic_press::publisher;
use agentic_press::PipelineMode;
use agentic_press::research_phase::ResearchConfig;
use anyhow::{Context, Result};
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "agentic_press")]
#[command(about = "Agentic deep-dive pipeline")]
struct Cli {
    /// Blog post title
    #[arg(long)]
    title: String,

    /// Path to source markdown file
    #[arg(long)]
    input: String,

    #[arg(long, default_value = "./articles")]
    output_dir: String,

    /// Publish to vadim.blog
    #[arg(long)]
    publish: bool,

    /// Git commit+push after publishing (requires --publish)
    #[arg(long)]
    git_push: bool,
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
    info!(
        "DASHSCOPE_API_KEY: {}",
        if std::env::var("DASHSCOPE_API_KEY").is_ok() { "set (qwen enabled)" } else { "NOT SET (deepseek-only)" }
    );

    let pipeline = Pipeline::new(&cli.title, &cli.output_dir)
        .with_mode(PipelineMode::DeepDive)
        .with_topic(&cli.title)
        .with_input_file(&cli.input)
        .with_research(ResearchConfig::default())
        .with_publish(cli.publish);

    let result = pipeline.run().await?;

    println!("\n╔══════════════════════════════════════╗");
    println!("║       agentic_press — Run Complete   ║");
    println!("╚══════════════════════════════════════╝");

    let has_qwen = std::env::var("DASHSCOPE_API_KEY").is_ok();
    let models = if has_qwen {
        "deepseek-reasoner + qwen-plus"
    } else {
        "deepseek-reasoner"
    };

    match &result {
        agentic_press::PipelineResult::DeepDive(d) => {
            let status = if d.article.approved { "APPROVED" } else { "NEEDS REVISION" };
            let papers_info = if d.article.paper_count > 0 {
                format!("  |  papers: {}", d.article.paper_count)
            } else {
                String::new()
            };
            println!("\nModels: {models}");
            println!(
                "\n  [{}]\n  draft: ~{} words  |  linkedin: {} lines  |  status: {status}  |  revisions: {}{papers_info}",
                d.article.title,
                d.article.draft.split_whitespace().count(),
                d.article.linkedin.lines().count(),
                d.article.revision_rounds,
            );
        }
        _ => unreachable!("main always runs in DeepDive mode"),
    }

    // Git commit+push after a successful publish
    if cli.publish && cli.git_push {
        if let agentic_press::PipelineResult::DeepDive(d) = &result {
            if d.article.approved {
                let blog_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("../../apps/vadim.blog");
                let blog_root = blog_root
                    .canonicalize()
                    .context("Could not find vadim.blog directory")?;

                let commit_msg = format!("deep-dive: {}", cli.title);
                info!("Git commit+push in {}", blog_root.display());
                publisher::git_commit_and_push(&blog_root, &commit_msg).await?;
            }
        }
    }

    Ok(())
}

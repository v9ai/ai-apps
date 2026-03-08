use agentic_press::pipeline::Pipeline;
use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "agentic_press")]
#[command(about = "Agentic journalism pipeline")]
struct Cli {
    /// Topic to write about
    #[arg(long)]
    topic: String,

    #[arg(long, default_value = "./articles")]
    output_dir: String,
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

    let pipeline = Pipeline::new(&cli.topic, &cli.output_dir)
        .with_topic(&cli.topic)
        .with_publish(true);

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

    match result {
        agentic_press::PipelineResult::Blog(blog) => {
            println!("\nModels: {models}  |  Topics: {}", blog.topics.len());
            for t in &blog.topics {
                let papers_info = if t.paper_count > 0 {
                    format!("  |  papers: {}", t.paper_count)
                } else {
                    String::new()
                };
                println!(
                    "\n  [{}]\n  blog: ~{} words  |  linkedin: {} lines{papers_info}",
                    t.topic,
                    t.blog.split_whitespace().count(),
                    t.linkedin.lines().count()
                );
            }
        }
        agentic_press::PipelineResult::Journalism(j) => {
            let status = if j.article.approved { "APPROVED" } else { "NEEDS REVISION" };
            println!("\nModels: {models}");
            println!(
                "\n  [{}]\n  draft: ~{} words  |  status: {status}  |  revisions: {}",
                j.article.topic,
                j.article.draft.split_whitespace().count(),
                j.article.revision_rounds,
            );
        }
    }

    Ok(())
}

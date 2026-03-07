use std::sync::Arc;

use agentic_press::agent_teams::{run_parallel, Agent};
use agentic_press::prompts;
use agentic_press::publisher;
use agentic_press::slugify;
use anyhow::{Context, Result};
use clap::Parser;
use tokio::fs;
use tokio::process::Command;
use tracing::info;

#[derive(Parser)]
#[command(name = "deep_dive")]
#[command(about = "Turn a markdown source document into a deep-dive blog post + LinkedIn post")]
struct Cli {
    /// Path to the source markdown file
    #[arg(long)]
    input: String,

    /// Blog post title
    #[arg(long, default_value = "Eval Driven Development")]
    title: String,

    /// Output directory for drafts
    #[arg(long, default_value = "./drafts")]
    output_dir: String,

    /// Publish to vadim.blog and run vercel deploy
    #[arg(long, default_value_t = true)]
    publish: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter("agentic_press=info,deep_dive=info")
        .init();

    let cli = Cli::parse();

    info!(
        "DEEPSEEK_API_KEY: {}",
        if std::env::var("DEEPSEEK_API_KEY").is_ok() { "set" } else { "NOT SET" }
    );

    // 1. Read source material
    let source_material = fs::read_to_string(&cli.input)
        .await
        .with_context(|| format!("Cannot read input file: {}", cli.input))?;
    info!("Read {} chars from {}", source_material.len(), cli.input);

    // 2. Create client
    let client = Arc::new(deepseek::client_from_env()?);

    // 3. Create agents
    let writer = Agent::new("DeepDiveWriter", prompts::deep_dive_writer(&cli.title), client.clone());
    let linkedin = Agent::new("LinkedIn", prompts::linkedin(), client);

    // 4. Run both in parallel
    let (blog, linkedin_post) = run_parallel(&writer, &linkedin, &source_material).await?;

    // 5. Save drafts
    let slug = slugify(&cli.title);
    let draft_dir = format!("{}/{}", cli.output_dir, slug);
    fs::create_dir_all(&draft_dir)
        .await
        .with_context(|| format!("Cannot create draft dir: {draft_dir}"))?;

    let blog_path = format!("{draft_dir}/blog.md");
    let linkedin_path = format!("{draft_dir}/linkedin.md");
    fs::write(&blog_path, &blog).await?;
    fs::write(&linkedin_path, &linkedin_post).await?;
    info!("Saved blog draft → {blog_path}");
    info!("Saved LinkedIn draft → {linkedin_path}");

    // 6. Publish
    if cli.publish {
        let post_path = publisher::publish(&blog, &cli.title, true).await?;

        // Git add + commit + push in vadim.blog repo
        let blog_repo = post_path
            .ancestors()
            .find(|p| p.join(".git").exists())
            .map(|p| p.to_path_buf())
            .context("Could not find vadim.blog git root")?;

        info!("Git commit in {}", blog_repo.display());

        let add = Command::new("git")
            .args(["add", "."])
            .current_dir(&blog_repo)
            .status()
            .await?;
        if !add.success() {
            anyhow::bail!("git add failed");
        }

        let commit = Command::new("git")
            .args(["commit", "-m", &format!("deep-dive: {}", cli.title)])
            .current_dir(&blog_repo)
            .status()
            .await?;
        if !commit.success() {
            info!("git commit exited non-zero (may be nothing to commit)");
        }

        let push = Command::new("git")
            .args(["push"])
            .current_dir(&blog_repo)
            .status()
            .await?;
        if !push.success() {
            anyhow::bail!("git push failed");
        }

        info!("Published and deployed: {}", post_path.display());
    }

    info!("Done. Blog: {blog_path} | LinkedIn: {linkedin_path}");
    Ok(())
}

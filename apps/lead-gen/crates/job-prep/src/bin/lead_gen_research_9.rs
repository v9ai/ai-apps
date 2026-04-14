/// Lead-gen research prompt 9 — Novelty Hunt 2025–2026
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    job_prep::prompts::run_prompt(job_prep::prompts::prompt_9()).await
}

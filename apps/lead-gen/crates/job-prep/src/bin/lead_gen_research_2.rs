/// Lead-gen research prompt 2 — RL Crawler
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    job_prep::prompts::run_prompt(job_prep::prompts::prompt_2()).await
}

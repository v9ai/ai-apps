/// Lead-gen research prompt 8 — Pipeline Synthesis / Roadmap
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    job_prep::prompts::run_prompt(job_prep::prompts::prompt_8()).await
}

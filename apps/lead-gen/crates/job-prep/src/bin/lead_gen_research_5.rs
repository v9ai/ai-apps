/// Lead-gen research prompt 5 — Lead Matching & Scoring
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    research_agent::prompts::run_prompt(research_agent::prompts::prompt_5()).await
}

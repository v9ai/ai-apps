/// Lead-gen research prompt 3 — Extraction / NER
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    research_agent::prompts::run_prompt(research_agent::prompts::prompt_3()).await
}

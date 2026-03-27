/// Lead-gen research prompt 6 — Report Generation / RAG
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    research_agent::prompts::run_prompt(research_agent::prompts::prompt_6()).await
}

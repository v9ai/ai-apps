/// Lead-gen research prompt 8 — Pipeline Synthesis / Roadmap
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    research_agent::prompts::run_prompt(research_agent::prompts::prompt_8()).await
}

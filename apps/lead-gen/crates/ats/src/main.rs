use std::path::PathBuf;

use anyhow::Result;
use ats::GreenhouseClient;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let client = GreenhouseClient::new("anthropic");
    let jobs = client.fetch_jobs_detailed().await?;

    let out = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data/anthropic-jobs.json");
    std::fs::create_dir_all(out.parent().unwrap())?;
    let json = serde_json::to_string_pretty(&jobs)?;
    std::fs::write(&out, &json)?;

    println!("{} jobs → {}", jobs.len(), out.display());
    Ok(())
}

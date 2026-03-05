use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "nomad-process", about = "Full job processing pipeline")]
struct Args {
    /// Maximum number of jobs per phase
    #[arg(short, long, default_value = "50")]
    limit: u32,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();
    let db = nomad::d1::D1Client::from_env()?;
    let api_key = std::env::var("DEEPSEEK_API_KEY")
        .or_else(|_| std::env::var("OPENAI_API_KEY"))
        .expect("DEEPSEEK_API_KEY or OPENAI_API_KEY must be set");
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com/v1".to_string());

    let ds = deepseek::DeepSeekClient::new(deepseek::ReqwestClient::new(), api_key)
        .with_base_url(base_url);

    info!("pipeline ready");

    let stats = nomad::pipeline::run_pipeline(&db, &ds, args.limit).await?;
    info!("{stats}");

    Ok(())
}

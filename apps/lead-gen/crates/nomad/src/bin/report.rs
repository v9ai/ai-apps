use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "nomad-report", about = "Job pipeline report generator")]
struct Args {
    /// Include LLM-generated summary
    #[arg(long)]
    with_llm: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let db = nomad::d1::D1Client::from_env()?;

    let deepseek = if Args::parse().with_llm {
        let api_key = std::env::var("DEEPSEEK_API_KEY")
            .or_else(|_| std::env::var("OPENAI_API_KEY"))
            .expect("DEEPSEEK_API_KEY or OPENAI_API_KEY must be set for --with-llm");
        let base_url = std::env::var("DEEPSEEK_BASE_URL")
            .unwrap_or_else(|_| "https://api.deepseek.com/v1".to_string());
        Some(
            deepseek::DeepSeekClient::new(deepseek::ReqwestClient::new(), api_key)
                .with_base_url(base_url),
        )
    } else {
        None
    };

    info!("reporter ready");

    let report = nomad::reporter::generate_report(&db, deepseek.as_ref()).await?;
    println!("{}", report.text);

    Ok(())
}

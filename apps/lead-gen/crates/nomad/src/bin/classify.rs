use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Parser)]
#[command(name = "nomad-classify", about = "EU remote job classifier (always enhances then classifies)")]
struct Args {
    /// Maximum number of jobs to process
    #[arg(short, long, default_value = "50")]
    limit: u32,

    /// Process a single job by ID
    #[arg(long)]
    job_id: Option<i64>,
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

    info!("classifier ready (enhance+classify pipeline)");

    if let Some(job_id) = args.job_id {
        // Single job: enhance first, then classify
        info!("Enhancing job {job_id}...");
        let job = nomad::ats_enhance::enhance_single_by_id(&db, job_id).await?;

        info!("Classifying job {job_id}...");
        let result = nomad::classifier::classify_job_and_persist(&db, &job, &ds).await?;
        info!(
            "Job {}: {} ({}) [{}]",
            job_id,
            if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
            result.confidence,
            result.source,
        );
    } else {
        // Batch: enhance+classify all non-terminal jobs
        let stats = nomad::classifier::classify_batch_all(&db, &ds, args.limit).await?;
        info!(
            "Batch complete: {} processed, {} EU, {} non-EU, {} heuristic, {} deepseek, {} errors",
            stats.processed, stats.eu_remote, stats.non_eu, stats.heuristic, stats.deepseek, stats.errors,
        );
    }

    Ok(())
}

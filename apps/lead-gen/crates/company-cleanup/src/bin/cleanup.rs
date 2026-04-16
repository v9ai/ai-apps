/// company-cleanup — identify and remove crypto/blockchain companies from lead-gen.
///
/// Usage:
///   DATABASE_URL=postgresql://... cargo run --release --bin cleanup           # dry-run
///   DATABASE_URL=postgresql://... cargo run --release --bin cleanup -- --delete  # delete

use anyhow::{Context, Result};
use tracing::{error, info, warn};

use company_cleanup::classifier::{CryptoClassifier, EmbeddingModel};
use company_cleanup::db::{self, CompanyRow};
use company_cleanup::store::CorpusStore;
use company_cleanup::{corpus, Verdict};

const CONFIDENCE_THRESHOLD: f32 = 0.6;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let delete_mode = std::env::args().any(|a| a == "--delete");
    if delete_mode {
        warn!("DELETE MODE — flagged crypto companies WILL be permanently removed");
    } else {
        info!("DRY-RUN MODE — no DB changes (pass --delete to remove)");
    }

    // 1. Load Candle embedding model (Metal on M1)
    info!("Loading Candle all-MiniLM-L6-v2 ...");
    let device = best_device();
    info!("Device: {:?}", device);
    let model = EmbeddingModel::load(&device)?;
    info!("Model loaded");

    // 2. Build LanceDB reference corpus
    let lance_path = "/tmp/company-cleanup-lance";
    let entries = corpus::corpus();
    info!("Embedding {} reference texts ...", entries.len());

    let texts: Vec<&str> = entries.iter().map(|e| e.text).collect();
    let vectors = model.embed_batch(&texts)?;

    let store = CorpusStore::build(lance_path, &entries, &vectors).await?;
    info!("LanceDB corpus ready at {lance_path}");

    // 3. Connect to Neon PostgreSQL
    let db_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
    let pool = db::connect(&db_url).await?;

    // 4. Fetch companies
    let companies = db::fetch_companies(&pool).await?;
    info!("Fetched {} companies", companies.len());

    if companies.is_empty() {
        info!("Nothing to do");
        return Ok(());
    }

    // 5. Classify each company
    let classifier = CryptoClassifier { model, store };
    let mut flagged: Vec<(CompanyRow, Verdict)> = Vec::new();
    let mut failed = 0usize;

    for company in &companies {
        let text = db::build_classification_text(company);

        if text.len() < 20 {
            warn!("[SKIP] {} — too little text ({} chars)", company.key, text.len());
            continue;
        }

        match classifier.classify(&text).await {
            Ok(verdict) => {
                if verdict.is_crypto && verdict.confidence >= CONFIDENCE_THRESHOLD {
                    info!(
                        "[CRYPTO] {} (conf={:.2}) | {}",
                        company.key,
                        verdict.confidence,
                        verdict.top_matches.first().unwrap_or(&String::new()),
                    );
                    flagged.push((company.clone(), verdict));
                }
            }
            Err(e) => {
                warn!("[FAIL] {}: {e:#}", company.key);
                failed += 1;
            }
        }
    }

    info!("───────────────────────────────────────────────");
    info!(
        "Scanned: {} | Crypto: {} | Failed: {}",
        companies.len(),
        flagged.len(),
        failed
    );

    // 6. Delete if requested
    if delete_mode && !flagged.is_empty() {
        info!("Deleting {} crypto companies ...", flagged.len());
        let mut deleted = 0usize;
        for (company, _verdict) in &flagged {
            match db::delete_company(&pool, company.id).await {
                Ok(result) => {
                    info!(
                        "[DELETED] {} (id={}) — {} contacts removed",
                        company.key, company.id, result.contacts_deleted
                    );
                    deleted += 1;
                }
                Err(e) => {
                    error!("[DELETE-FAIL] {}: {e:#}", company.key);
                }
            }
        }
        info!("Deleted {}/{} flagged companies", deleted, flagged.len());
    } else if !flagged.is_empty() {
        info!("Dry-run complete. Pass --delete to remove these {} companies.", flagged.len());
    }

    Ok(())
}

fn best_device() -> candle_core::Device {
    #[cfg(feature = "metal")]
    {
        candle_core::Device::new_metal(0).unwrap_or(candle_core::Device::Cpu)
    }
    #[cfg(not(feature = "metal"))]
    {
        candle_core::Device::Cpu
    }
}

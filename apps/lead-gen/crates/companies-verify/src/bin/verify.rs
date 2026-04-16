/// recruitment-verify — classify all lead-gen companies as UK recruitment or not.
///
/// Usage:
///   DATABASE_URL=postgresql://... cargo run --release --bin verify
///
/// Loads Candle all-MiniLM-L6-v2 on Metal, builds a LanceDB reference corpus,
/// fetches every company website in parallel (8 tasks), and updates the DB.

use std::sync::Arc;

use anyhow::{Context, Result};
use futures::stream::{self, StreamExt};
use tracing::{error, info, warn};

use recruitment_verify::classifier::{EmbeddingModel, RecruitmentClassifier};
use recruitment_verify::corpus;
use recruitment_verify::db;
use recruitment_verify::scrape;
use recruitment_verify::store::CorpusStore;

const PARALLELISM: usize = 8;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    // ── 1. Load Candle embedding model (Metal on M1) ─────────────────────
    info!("Loading Candle all-MiniLM-L6-v2 ...");
    let device = best_device();
    info!("Device: {:?}", device);
    let model = EmbeddingModel::load(&device)?;
    info!("Model loaded");

    // ── 2. Build LanceDB reference corpus ────────────────────────────────
    let lance_path = "/tmp/recruitment-verify-lance";
    let entries = corpus::corpus();
    info!("Embedding {} reference texts ...", entries.len());

    let texts: Vec<&str> = entries.iter().map(|e| e.text).collect();
    let vectors = model.embed_batch(&texts)?;

    let store = CorpusStore::build(lance_path, &entries, &vectors).await?;
    info!("LanceDB corpus ready at {lance_path}");

    // ── 3. Connect to Neon PostgreSQL ────────────────────────────────────
    let db_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
    let pool = db::connect(&db_url).await?;

    // ── 4. Fetch companies ───────────────────────────────────────────────
    let companies = db::fetch_companies(&pool).await?;
    info!("Fetched {} companies with websites", companies.len());

    if companies.is_empty() {
        info!("Nothing to do");
        return Ok(());
    }

    // ── 5. Parallel classification ───────────────────────────────────────
    let classifier = Arc::new(RecruitmentClassifier { model, store });
    let client = Arc::new(
        reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()?,
    );
    let pool = Arc::new(pool);

    let mut ok = 0usize;
    let mut recruited = 0usize;
    let mut failed = 0usize;

    let results: Vec<_> = stream::iter(companies)
        .map(|company| {
            let classifier = Arc::clone(&classifier);
            let client = Arc::clone(&client);
            let pool = Arc::clone(&pool);

            async move {
                let url = &company.website;
                let key = &company.key;

                // Fetch website text
                let text = match scrape::fetch_and_extract(&client, url).await {
                    Ok(t) => t,
                    Err(e) => {
                        warn!("[SKIP] {key} ({url}): {e:#}");
                        return Err(company.id);
                    }
                };

                // Classify
                match classifier.classify(&text).await {
                    Ok(verdict) => {
                        let tag = if verdict.is_recruitment { "RECRUITMENT" } else { "NOT_REC" };
                        info!(
                            "[OK] {key} → {tag} ({:.2}) | {}",
                            verdict.confidence,
                            verdict.top_matches.first().unwrap_or(&String::new()),
                        );

                        // Update DB
                        if let Err(e) = db::update_verdict(&pool, company.id, &verdict).await {
                            error!("[DB] {key}: {e:#}");
                        }

                        Ok(verdict.is_recruitment)
                    }
                    Err(e) => {
                        warn!("[FAIL] {key}: {e:#}");
                        Err(company.id)
                    }
                }
            }
        })
        .buffer_unordered(PARALLELISM)
        .collect()
        .await;

    for r in &results {
        match r {
            Ok(true) => { ok += 1; recruited += 1; }
            Ok(false) => { ok += 1; }
            Err(_) => { failed += 1; }
        }
    }

    info!("──────────────────────────────────────────────");
    info!("Total: {} | OK: {} | Recruitment: {} | Not: {} | Failed: {}",
        results.len(), ok, recruited, ok - recruited, failed);

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

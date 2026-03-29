//! Ingest Udemy courses into a Lance vector store.
//!
//! Two modes:
//!   1. From JSON (output of scripts/scrape-udemy.ts):
//!        cargo run --bin scrape-courses -- --json ./data/courses.json
//!
//!   2. From pre-fetched HTML directory (one .html file per course):
//!        cargo run --bin scrape-courses -- --html-dir ./data/pages/
//!
//! The Playwright scraper (`scripts/scrape-udemy.ts`) handles the actual
//! HTTP fetching because Udemy is behind Cloudflare bot protection.

use std::path::PathBuf;

use candle::{best_device, EmbeddingModel};
use clap::Parser;
use knowledge_ml::scraper::load_courses_json;
use knowledge_ml::{Course, CourseStore};
use tracing::info;

const MODEL: &str = "BAAI/bge-large-en-v1.5";

#[derive(Parser)]
#[command(about = "Embed Udemy courses into a Lance vector store")]
struct Args {
    /// Path to a JSON file with course data (from scrape-udemy.ts)
    #[arg(long)]
    json: PathBuf,

    /// Where to create / open the Lance database
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Embedding model (BERT-compatible on HF Hub)
    #[arg(long, default_value = MODEL)]
    model: String,

    /// How many courses to embed per batch
    #[arg(long, default_value_t = 8)]
    batch: usize,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Args::parse();

    // ── Load courses ─────────────────────────────────────────────────────────
    let courses: Vec<Course> = load_courses_json(&args.json)?;

    if courses.is_empty() {
        eprintln!("No courses found in {}", args.json.display());
        return Ok(());
    }
    eprintln!("Loaded {} courses from {}", courses.len(), args.json.display());

    // ── Load model ───────────────────────────────────────────────────────────
    let device = best_device()?;
    eprintln!("Loading {MODEL} on {device:?}…");
    let model = EmbeddingModel::from_hf(&args.model, &device)?;
    eprintln!("Model ready.");

    // ── Open store ───────────────────────────────────────────────────────────
    let store = CourseStore::connect(&args.db).await?;
    let already = store.count().await?;
    info!("{already} courses already in store");

    // ── Embed in batches ─────────────────────────────────────────────────────
    let total = courses.len();
    let mut done = 0usize;

    for chunk in courses.chunks(args.batch) {
        let texts: Vec<String> = chunk.iter().map(|c| c.embed_text()).collect();
        let refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();

        let vecs: Vec<Vec<f32>> = {
            let tensor = model.embed(&refs)?;
            let (batch_size, _) = tensor.dims2()?;
            (0..batch_size)
                .map(|i| tensor.get(i)?.to_vec1::<f32>().map_err(candle::Error::from))
                .collect::<Result<Vec<_>, _>>()?
        };

        store.add(chunk, &vecs).await?;

        done += chunk.len();
        eprintln!("  {done}/{total} embedded");
    }

    eprintln!(
        "\nDone — {done} courses indexed into {} ({} total rows)",
        args.db,
        already + done
    );
    Ok(())
}

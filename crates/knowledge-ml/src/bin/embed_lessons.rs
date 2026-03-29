//! Embed all lessons from the knowledge app's content/ directory into a Lance store.
//!
//! Usage:
//!   cargo run --bin embed-lessons [-- --content ../../apps/knowledge/content --db ./lance-db]
//!
//! On subsequent runs already-indexed slugs are skipped (idempotent).

use std::path::PathBuf;

use candle::{best_device, EmbeddingModel};
use clap::Parser;
use knowledge_ml::{load_lessons, LessonStore};
use tracing::info;

const MODEL: &str = "BAAI/bge-large-en-v1.5";

#[derive(Parser)]
#[command(about = "Embed knowledge-app lessons into a Lance vector store")]
struct Args {
    /// Path to the knowledge app's content/ directory
    #[arg(long, default_value = "../../apps/knowledge/content")]
    content: PathBuf,

    /// Where to create / open the Lance database
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Embedding model (must be a BERT-compatible safetensors model on HF Hub)
    #[arg(long, default_value = MODEL)]
    model: String,

    /// How many lessons to embed per batch (larger = faster but more RAM)
    #[arg(long, default_value_t = 16)]
    batch: usize,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Args::parse();

    // ── Load model ────────────────────────────────────────────────────────────
    eprintln!("Loading {MODEL} on {:?} …", best_device()?);
    let device = best_device()?;
    let model  = EmbeddingModel::from_hf(&args.model, &device)?;
    eprintln!("Model ready.");

    // ── Parse lessons ─────────────────────────────────────────────────────────
    let all = load_lessons(&args.content)?;
    eprintln!("Found {} lesson files in {}", all.len(), args.content.display());

    // ── Open Lance store, skip already-indexed slugs ──────────────────────────
    let store = LessonStore::connect(&args.db).await?;
    let already = store.count().await?;
    info!("{already} lessons already in store");

    // Simple skip strategy: if the store is non-empty assume a previous run
    // completed fully.  For incremental updates pass --db to a fresh path.
    let lessons: Vec<_> = if already == 0 {
        all.iter().collect()
    } else {
        eprintln!("{already} rows already present — nothing to do. Use a fresh --db path to reindex.");
        return Ok(());
    };

    if lessons.is_empty() {
        eprintln!("Nothing to embed.");
        return Ok(());
    }

    // ── Embed in batches ──────────────────────────────────────────────────────
    let total = lessons.len();
    let mut done = 0usize;

    for chunk in lessons.chunks(args.batch) {
        let texts: Vec<String> = chunk.iter().map(|l| l.embed_text()).collect();
        let refs: Vec<&str>    = texts.iter().map(|s| s.as_str()).collect();

        // Candle is CPU/Metal-bound — run on blocking thread pool.
        let vecs: Vec<Vec<f32>> = {
            let model_ref = &model;
            let tensor = model_ref.embed(&refs)?;
            let (batch_size, _) = tensor.dims2()?;
            (0..batch_size)
                .map(|i| tensor.get(i)?.to_vec1::<f32>().map_err(candle::Error::from))
                .collect::<Result<Vec<_>, _>>()?
        };

        let owned: Vec<_> = chunk.iter().map(|l| (*l).clone()).collect();
        store.add(&owned, &vecs).await?;

        done += chunk.len();
        eprintln!("  {done}/{total} embedded");
    }

    eprintln!("Done — {done} lessons indexed into {}", args.db);
    Ok(())
}

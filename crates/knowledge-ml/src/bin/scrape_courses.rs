//! Scrape Udemy course pages, embed them, and store in a Lance vector store.
//!
//! Usage:
//!   cargo run --bin scrape-courses -- --urls ./data/urls.txt [--db ./lance-db]
//!
//! The URLs file should contain one Udemy course URL per line.
//! Lines starting with # and blank lines are skipped.

use std::path::PathBuf;

use candle::{best_device, EmbeddingModel};
use clap::Parser;
use knowledge_ml::{CourseStore, Course};
use knowledge_ml::scraper::scrape_course;
use tracing::{error, info};

const MODEL: &str = "BAAI/bge-large-en-v1.5";

#[derive(Parser)]
#[command(about = "Scrape Udemy courses and embed into a Lance vector store")]
struct Args {
    /// Path to a file with one Udemy course URL per line
    #[arg(long, default_value = "./data/urls.txt")]
    urls: PathBuf,

    /// Where to create / open the Lance database
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Embedding model (BERT-compatible on HF Hub)
    #[arg(long, default_value = MODEL)]
    model: String,

    /// How many courses to embed per batch
    #[arg(long, default_value_t = 8)]
    batch: usize,

    /// Delay between HTTP requests in milliseconds
    #[arg(long, default_value_t = 1500)]
    delay_ms: u64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Args::parse();

    // ── Read URLs ────────────────────────────────────────────────────────────
    let content = std::fs::read_to_string(&args.urls)?;
    let urls: Vec<&str> = content
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .collect();

    if urls.is_empty() {
        eprintln!("No URLs found in {}", args.urls.display());
        return Ok(());
    }
    eprintln!("Found {} URLs in {}", urls.len(), args.urls.display());

    // ── Scrape all courses ───────────────────────────────────────────────────
    let mut courses: Vec<Course> = Vec::new();
    for (i, url) in urls.iter().enumerate() {
        match scrape_course(url).await {
            Ok(course) => {
                eprintln!("  [{}/{}] ✓ {}", i + 1, urls.len(), course.title);
                courses.push(course);
            }
            Err(e) => {
                error!("  [{}/{}] ✗ {url}: {e:#}", i + 1, urls.len());
            }
        }
        // Rate limit
        if i + 1 < urls.len() {
            tokio::time::sleep(std::time::Duration::from_millis(args.delay_ms)).await;
        }
    }

    if courses.is_empty() {
        eprintln!("No courses scraped successfully.");
        return Ok(());
    }
    eprintln!("\nScraped {} courses. Embedding…", courses.len());

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

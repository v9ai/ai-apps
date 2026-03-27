/// Lead-gen research prompt 1 — System Architecture
/// Local-first ML infrastructure: Rust runtimes, zero-copy pipelines, embedded vector DBs
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../apps/lead-gen/docs/research-output/01-system-architecture";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "rust-ml-backends".into(),
            preamble: "You are a systems engineer specialising in high-performance Rust ML runtimes. \
                       Search for papers on Rust-native neural network inference, ONNX runtime integration, \
                       and the Burn/Candle framework. Focus on papers from 2024–2026 that benchmark Rust \
                       inference vs Python on consumer CPUs and Apple Silicon. Extract: framework name, \
                       hardware target, latency (ms), memory (MB), supported ops, SIMD/Metal acceleration."
                .into(),
            description: "Search for: 'Burn framework Rust deep learning benchmark', \
                          'ONNX runtime Rust inference performance 2024', \
                          'candle ML framework Rust Apple Silicon', \
                          'tract ONNX inference safe Rust production', \
                          'CubeCL Rust GPU kernel cross-platform'. \
                          Find papers comparing Rust ML frameworks against Python (PyTorch, ONNX) \
                          on memory usage and latency. Also search OpenAlex from 2024-01-01 for \
                          'edge ML inference optimization'. Report top 10 papers with key metrics."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(1800)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "zero-copy-data-pipelines".into(),
            preamble: "You are a database systems researcher specialising in zero-copy data exchange \
                       between heterogeneous runtimes. Search for papers on Apache Arrow ADBC, shared \
                       memory ML pipelines, and zero-copy tensor passing between Rust and Python processes."
                .into(),
            description: "Search for: 'Apache Arrow ADBC zero-copy database 2024', \
                          'Arrow Flight streaming ML pipeline', \
                          'shared memory tensor interop Rust Python', \
                          'zero-copy serialisation machine learning pipeline'. \
                          Find papers documenting latency and throughput improvements from eliminating \
                          serialisation between pipeline stages. Extract: serialisation overhead (ms/MB), \
                          speedup factor, memory reduction, and applicable pipeline architectures."
                .into(),
            priority: TaskPriority::Normal,
            timeout: Some(Duration::from_secs(1800)),
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "embedded-vector-db-alternatives".into(),
            preamble: "You are a database researcher specialising in embedded vector search for \
                       small-to-medium datasets (<100K vectors). Search for papers benchmarking \
                       SQLite vector extensions (sqlite-vss, sqlite-vec), DiskANN, and alternatives \
                       to ChromaDB for document retrieval under 2 GB RAM."
                .into(),
            description: "Search for: 'embedded vector search SQLite extension benchmark', \
                          'DiskANN disk-based ANN low memory', \
                          'HNSW vs IVF embedded vector database 2024', \
                          'Qdrant embedded in-process vector search'. \
                          Compare recall@10, latency (ms), index build time, and memory footprint \
                          for 10K–100K vectors. Focus on solutions that run without a separate server \
                          process. Extract: index type, dataset size, recall, latency, RAM, disk."
                .into(),
            priority: TaskPriority::Normal,
            dependencies: vec![1],
            timeout: Some(Duration::from_secs(1800)),
            ..Default::default()
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR).with_context(|| format!("creating {OUT_DIR}"))?;

    let tasks = tasks();
    eprintln!("[prompt-1] Launching: {} workers, {} tasks", 3, tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 3,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(2),
        synthesis_preamble: Some(
            "You are a systems ML researcher. Synthesise findings on local-first ML infrastructure: \
             memory efficiency, zero-copy data exchange, and privacy-preserving edge deployment. \
             Contrast each approach against the current pipeline (SQLite WAL + LanceDB + ChromaDB + asyncio) \
             and recommend concrete upgrade paths. Rank upgrades by: impact × ease of implementation."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-1] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-1] Done.");
    Ok(())
}

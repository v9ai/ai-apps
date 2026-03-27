/// Lead-gen research prompt 4 — Entity Resolution
/// Zero-shot matching, LLM distillation, GNN-based ER, scalable blocking
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../apps/lead-gen/docs/research-output/04-entity-resolution";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "zero-shot-entity-matching".into(),
            preamble: "You are a database researcher specialising in zero-shot entity matching. \
                       Search for papers from 2024–2026 on entity resolution without labeled pairs, \
                       using pre-trained language models, contrastive embeddings, or in-context \
                       learning with LLMs. Current baseline: Siamese + SQL blocking \
                       (P=96.8%, R=84.2%, F1=90.1%). Recall 84.2% is the weak link."
                .into(),
            description: "Search for: 'AnyMatch zero-shot entity matching SLM AAAI 2025', \
                          'zero-shot record linkage pre-trained language model 2024', \
                          'in-context learning entity resolution LLM GPT', \
                          'Eridu embeddings contrastive company person matching', \
                          'foundation model entity matching without labels 2024 2025'. \
                          Find methods achieving F1 >85% without labeled training data. \
                          Extract: benchmark dataset, P/R/F1, model size, inference cost per pair, \
                          whether it runs locally (<8 GB RAM), and training data needed."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "llm-distillation-er".into(),
            preamble: "You are an ML researcher specialising in knowledge distillation for entity \
                       resolution. Search for papers from 2024–2026 on distilling GPT-4 or other \
                       large LLMs into small (1B–3B) local models for entity matching, trading \
                       some accuracy for 100–1000× lower inference cost."
                .into(),
            description: "Search for: 'DistillER LLM distillation entity matching EDBT 2026', \
                          'knowledge distillation entity resolution small model teacher student', \
                          'LLM annotation entity resolution training data generation', \
                          'GPT-4 labeler entity matching fine-tune local model 2024'. \
                          Cost target: GPT-4 labels 10K pairs (~$20) → train local model (free). \
                          Extract: student model size, F1 vs GPT-4 teacher, distillation data size, \
                          inference latency (ms/pair), company name handling quality."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "graph-neural-network-er".into(),
            preamble: "You are a graph ML researcher. Search for papers from 2024–2026 on graph \
                       neural networks for entity resolution, especially multi-source ER where the \
                       same entity appears with different attributes across data sources \
                       (LinkedIn, Crunchbase, company website). Current: SQLite adjacency list + \
                       recursive CTEs for transitive closure."
                .into(),
            description: "Search for: 'GraLMatch multi-source entity group matching EDBT 2025', \
                          'GraphER property graph GDD GNN entity resolution 2025', \
                          'graph neural network entity resolution multi-source 2024', \
                          'OpenSanctions logic-v2 deterministic company matching'. \
                          Find GNN methods that improve transitive closure detection across sources. \
                          Extract: F1 on DBLP-ACM/Amazon-Google/Walmart-Amazon, training time, \
                          inference latency, and memory for 100K-entity graph."
                .into(),
            priority: TaskPriority::Normal,
            dependencies: vec![1],
            timeout: Some(Duration::from_secs(2400)),
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
    eprintln!("[prompt-4] Launching: 3 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 3,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        synthesis_preamble: Some(
            "You are a database researcher specialising in entity resolution at scale. \
             Synthesise findings on zero-shot, LLM-based, and GNN-based entity resolution. \
             Compare against current Siamese + SQL blocking (P=96.8%, R=84.2%, F1=90.1%). \
             Identify the single highest-ROI change to improve recall from 84.2% to >90% \
             without sacrificing precision. Prioritise methods that work without new labeled \
             pairs and run locally (<1ms per query on 100K entities)."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-4] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-4] Done.");
    Ok(())
}

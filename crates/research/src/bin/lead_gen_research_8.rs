/// Lead-gen research prompt 8 — Pipeline Synthesis / Roadmap
/// End-to-end ML pipeline surveys, cost-efficiency, multi-stage co-design
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../apps/lead-gen/docs/research-output/08-synthesis";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "end-to-end-pipeline-surveys".into(),
            preamble: "You are a systems researcher. Search for survey papers and system papers \
                       from 2024–2026 on end-to-end ML pipelines for information extraction, \
                       lead generation, or knowledge graph construction. Focus on papers analysing \
                       bottlenecks, co-optimisation across stages, and unified architectures. \
                       Current: 50K pages → 300 qualified leads (0.6% yield), 10 pages/sec bottleneck."
                .into(),
            description: "Search for: 'end-to-end pipeline web information extraction survey 2024', \
                          'knowledge graph construction web crawl pipeline ML 2024', \
                          'automated company intelligence pipeline machine learning', \
                          'multi-stage NLP pipeline optimisation survey 2024 2025', \
                          'B2B lead generation AI automated pipeline 2024'. \
                          Find survey papers covering 3+ pipeline stages. \
                          Extract: which stages each paper covers, identified bottlenecks, \
                          recommended architectures, benchmark datasets for full-pipeline evaluation."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "cost-efficiency-active-learning".into(),
            preamble: "You are an MLOps researcher. Search for papers from 2024–2026 on \
                       cost-performance tradeoffs for local vs cloud ML deployment, active learning \
                       loops that improve pipeline yield, and data flywheel strategies for \
                       continuous improvement without constant manual labelling. \
                       Current: $1,500/year hardware vs $5,400–$13,200 cloud (64–89% savings)."
                .into(),
            description: "Search for: 'local vs cloud ML deployment cost analysis 2024', \
                          'active learning data flywheel ML pipeline improvement', \
                          'continuous learning pipeline production deployment 2024', \
                          'ML pipeline cost optimisation edge inference'. \
                          Find papers quantifying: when local beats cloud, how active learning \
                          from user feedback improves all stages simultaneously, monitoring triggers \
                          for retraining. Extract: cost comparison methodology, breakeven analysis, \
                          active learning strategy, annotation effort."
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
    eprintln!("[prompt-8] Launching: 2 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 2,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(2),
        synthesis_preamble: Some(
            "You are a systems architect specialising in AI/ML pipeline optimisation. \
             Synthesise findings on end-to-end ML pipeline design for lead generation. \
             Current pipeline: 50K pages → 300 leads (0.6% yield), 10 pages/sec crawl bottleneck, \
             $1,500/year hardware cost. Identify cross-cutting upgrades affecting multiple modules. \
             Produce a 12-month roadmap with quarterly milestones, each improving at least one of: \
             funnel yield (>0.6%), crawl throughput (>10 pages/sec), hardware cost (<$1,500/year)."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-8] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-8] Done.");
    Ok(())
}

/// Lead-gen research prompt 5 — Lead Matching & Scoring
/// Tabular foundation models, calibration, temporal signals, ICP embeddings
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../docs/research-output/05-lead-matching";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "tabular-foundation-models".into(),
            preamble: "You are an ML researcher specialising in tabular learning. Search for papers \
                       from 2024–2026 on tabular foundation models, in-context learning for tabular \
                       data, and methods that eliminate feature engineering while matching or beating \
                       XGBoost. Inference speed requirement: must sustain 500+ leads/sec. \
                       Current: XGBoost ensemble (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec)."
                .into(),
            description: "Search for: 'TabPFN-2.5 tabular prior-data fitted network arXiv 2025', \
                          'TabM BatchEnsemble MLP tabular ICLR 2025', \
                          'ModernNCA retrieval-based tabular learning ICLR 2025', \
                          'in-context learning tabular classification 2024 2025', \
                          'SAINT self-attention tabular improvements 2024'. \
                          Find models that beat XGBoost F1 on <10K training samples. \
                          Extract: F1 on OpenML tabular benchmarks, training sample efficiency, \
                          inference latency (ms/sample), feature engineering required."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "calibration-distribution-shift".into(),
            preamble: "You are an ML researcher specialising in probability calibration and \
                       distribution shift. Search for papers from 2024–2026 on online calibration, \
                       conformal prediction for tabular data, and methods that maintain calibration \
                       under ICP drift without full model retraining. Current: Platt scaling."
                .into(),
            description: "Search for: 'COP conformal online prediction distribution shift ICLR 2026', \
                          'SmartCal automated calibration selection AutoML 2025', \
                          'online calibration tabular distribution shift 2024', \
                          'conformal prediction tabular classification 2024 2025'. \
                          Find calibration methods adapting online to new lead types without \
                          storing full dataset. Extract: ECE before/after, calibration update \
                          latency, memory footprint, coverage guarantees under covariate shift."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "temporal-event-signals".into(),
            preamble: "You are an ML researcher specialising in temporal event sequences for \
                       business prediction. Search for papers from 2024–2026 on using temporal \
                       signals (funding rounds, hiring activity, tech stack changes) as features \
                       for B2B lead scoring, including Hawkes processes, transformer event models, \
                       and graph temporal networks."
                .into(),
            description: "Search for: 'Hawkes process attention lead scoring temporal event arXiv 2025', \
                          'funding event sequence company classification ML', \
                          'temporal graph network company signal B2B', \
                          'hiring activity prediction company readiness ML 2024'. \
                          Find models taking funding/hiring/product event sequences as input. \
                          Extract: AUC improvement vs static features, event types used, \
                          sequence length, model size, and inference latency."
                .into(),
            priority: TaskPriority::Normal,
            timeout: Some(Duration::from_secs(2400)),
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "icp-embedding-retrieval".into(),
            preamble: "You are an ML researcher specialising in embedding-based retrieval for \
                       business applications. Search for papers from 2024–2026 on ICP (Ideal \
                       Customer Profile) modeling via dense retrieval, contrastive learning on \
                       company profiles, and retrieval-augmented lead scoring. \
                       Current: 128-dim Siamese ICP embeddings in LanceDB."
                .into(),
            description: "Search for: 'ideal customer profile embedding contrastive learning B2B', \
                          'company profile similarity dense retrieval 2024', \
                          'retrieval augmented classification tabular business', \
                          'dense retrieval tabular features company similarity matching'. \
                          Find improved embedding methods for company similarity. \
                          Extract: embedding dimension, similarity metric, retrieval speed \
                          on 100K candidates (ms), F1 on held-out ICP matching task."
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
    eprintln!("[prompt-5] Launching: 4 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 4,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        synthesis_preamble: Some(
            "You are an ML researcher specialising in tabular classification for B2B sales. \
             Synthesise findings on tabular foundation models, calibration, and temporal signals. \
             Compare against current XGBoost ensemble (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec). \
             Produce a decision matrix for replacing vs augmenting XGBoost, ordered by \
             PR-AUC improvement at ≥500 leads/sec inference speed."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-5] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-5] Done.");
    Ok(())
}

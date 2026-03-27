/// Lead-gen research prompt 7 — Evaluation
/// LLM-as-judge reliability, cascade error attribution, drift detection, XAI
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../apps/lead-gen/docs/research-output/07-evaluation";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "llm-as-judge-reliability".into(),
            preamble: "You are an NLP evaluation researcher. Search for papers from 2024–2026 on \
                       LLM-as-judge reliability: bias analysis, calibration of judge models, \
                       position bias, length bias, and methods to improve judge consistency and \
                       agreement with human evaluators. Current: LLM-as-judge quality gate assertions \
                       with no bias correction or calibration."
                .into(),
            description: "Search for: 'LLM judge reliability bias position length 2024', \
                          'LLM evaluator consistency agreement human judge 2024 2025', \
                          'MT-Bench Chatbot Arena evaluation bias 2024', \
                          'calibration LLM judge model reliability 2025'. \
                          Find papers quantifying judge bias and methods to correct it. \
                          Extract: bias types found, correlation with human judges (κ or Spearman), \
                          correction techniques, judge model size requirements, \
                          whether a local 7B judge is reliable enough."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "cascade-error-attribution".into(),
            preamble: "You are an ML systems researcher specialising in error propagation analysis. \
                       Search for papers from 2024–2026 on automated cascade error analysis in \
                       multi-stage NLP pipelines: error attribution across stages, counterfactual \
                       error tracing, and pipeline robustness metrics. Current: manual CER ~0.15, \
                       EAF 1.15×, manual ablation studies."
                .into(),
            description: "Search for: 'cascade error propagation multi-stage NLP pipeline 2024', \
                          'error attribution automated pipeline information extraction', \
                          'counterfactual analysis NLP pipeline robustness 2024', \
                          'compound AI system evaluation error propagation 2025'. \
                          Find automated methods identifying which stage causes most downstream errors. \
                          Extract: attribution method, pipeline types evaluated, \
                          whether attribution is exact or approximate, overhead per prediction."
                .into(),
            priority: TaskPriority::Normal,
            timeout: Some(Duration::from_secs(2400)),
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "drift-detection-explainability".into(),
            preamble: "You are an ML reliability researcher. Search for papers from 2024–2026 on \
                       concept drift detection in NLP/ML pipelines, feature attribution for tabular \
                       ML (SHAP, LIME, integrated gradients), and explainability methods for \
                       scoring/ranking models in production. Current: no drift detection, no \
                       per-lead feature attribution in reports."
                .into(),
            description: "Search for: 'concept drift detection NLP streaming 2024', \
                          'SHAP attribution XGBoost tabular production monitoring', \
                          'explainable lead scoring feature attribution B2B', \
                          'online drift detection web content distribution shift 2024', \
                          'counterfactual explanation classification scoring 2024 2025'. \
                          Find lightweight drift detectors (<1ms overhead per prediction) \
                          alerting when entity type distribution shifts. \
                          Extract: detection delay (samples), false positive rate, \
                          computational overhead, label-free detection capability."
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
    eprintln!("[prompt-7] Launching: 3 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 3,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(2),
        synthesis_preamble: Some(
            "You are an ML evaluation researcher. Synthesise findings on pipeline evaluation, \
             LLM-as-judge reliability, and drift detection. Compare against current evaluation: \
             CER ~0.15, LLM-as-judge regression tests, manual ablation studies. \
             Produce an evaluation enhancement roadmap: which metrics to add, which biases to \
             correct, and one recommended drift alerting strategy with implementation details."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-7] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-7] Done.");
    Ok(())
}

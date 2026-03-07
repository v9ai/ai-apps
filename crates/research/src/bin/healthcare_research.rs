use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/healthcare";

fn research_tasks() -> Vec<ResearchTask> {
    let stack_context = "The target app is an AI-powered personal health analytics platform built with: \
        Next.js (App Router, Server Actions), Supabase (PostgreSQL + pgvector + Auth + Storage), \
        Alibaba DashScope (text-embedding-v4 for 1024-dim embeddings, qwen-plus for chat), \
        Unstructured.io (PDF/image extraction), and shadcn/ui. \
        Current features: blood test upload & OCR parsing, biomarker extraction with flag detection, \
        semantic vector search over tests/markers/conditions, health Q&A with RAG, \
        and marker trend tracking over time. \
        The feature MUST be implementable within this existing stack (pgvector, embeddings, Next.js server actions).";

    vec![
        ResearchTask {
            id: 1,
            subject: "biomarker-interaction-networks".into(),
            description: format!(
                "Research biomarker interaction networks and multi-analyte pattern recognition \
                in clinical lab data. Focus on: (1) how combinations of biomarkers (not individual values) \
                predict conditions — e.g., metabolic syndrome from glucose+triglycerides+HDL patterns, \
                (2) graph-based or vector-based approaches to encoding biomarker relationships, \
                (3) using embeddings to detect non-obvious correlations between markers across tests. \
                Find papers on multi-biomarker panels, biomarker co-expression, and \
                machine learning on lab panel combinations (2018-2026). \
                {stack_context}"
            ),
            preamble: "You are a biomedical informatics researcher specialising in clinical \
                laboratory data analysis. Produce structured findings in Markdown focusing \
                on practical, implementable approaches."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "predictive-health-scoring".into(),
            description: format!(
                "Research predictive health risk scoring from longitudinal lab data. Focus on: \
                (1) algorithms that compute personalised health risk scores from repeated blood tests, \
                (2) temporal pattern mining — detecting deteriorating trends before values go out of range, \
                (3) early warning systems that flag concerning trajectories (e.g., rising HbA1c trend \
                toward pre-diabetes). Find papers on longitudinal biomarker analysis, \
                trajectory clustering, change-point detection in clinical time series, \
                and personal health dashboards with predictive scoring (2019-2026). \
                {stack_context}"
            ),
            preamble: "You are a health data science researcher specialising in predictive \
                analytics from clinical lab data. Produce evidence-based findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "rag-clinical-decision-support".into(),
            description: format!(
                "Research RAG (Retrieval-Augmented Generation) architectures for personal clinical \
                decision support. Focus on: (1) advanced RAG patterns beyond basic similarity search — \
                multi-hop reasoning over lab results + conditions + medical knowledge, \
                (2) knowledge graph-enhanced RAG for health data, \
                (3) temporal-aware RAG that weighs recent results more heavily, \
                (4) safety guardrails and citation grounding for health AI. \
                Find papers on medical RAG systems, clinical decision support with LLMs, \
                and health-specific embedding strategies (2022-2026). \
                {stack_context}"
            ),
            preamble: "You are a medical AI researcher specialising in RAG systems for \
                clinical decision support. Produce rigorous findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "personal-health-digital-twin".into(),
            description: format!(
                "Research personal health digital twins and computational patient models. Focus on: \
                (1) lightweight digital twin approaches that build a personalised model from lab history, \
                (2) what-if simulation — 'if I improve X, how does Y change?', \
                (3) embedding-space health trajectories — representing a person's health state as a \
                vector that evolves over time and can be compared to population clusters, \
                (4) synthetic cohort comparison using vector similarity. \
                Find papers on personal health models, patient digital twins, \
                health state embeddings, and vector-based population comparison (2020-2026). \
                {stack_context}"
            ),
            preamble: "You are a precision medicine researcher focused on personal health \
                modelling. Produce innovative, forward-looking findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "novel-feature-synthesis".into(),
            description: format!(
                "Based on the findings from previous research tasks, identify the SINGLE most \
                novel and innovative feature that can be added to the health analytics platform. \
                Criteria: (1) genuinely innovative — not a standard feature in health apps, \
                (2) implementable within the existing stack, \
                (3) high user value — gives users insights they can't get elsewhere, \
                (4) technically feasible using pgvector, embeddings, and server-side LLM calls. \
                Produce a detailed feature proposal with: name, description, technical approach, \
                why it's novel, and a rough implementation sketch. \
                {stack_context}"
            ),
            preamble: "You are a health-tech product innovator with deep technical knowledge. \
                Produce a single, compelling feature proposal in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4],
            result: None,
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 10;
    eprintln!("Launching healthcare research team: {team_size} workers, {} tasks\n", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size,
        api_key,
        base_url,
        scholar_key,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    let mut combined = String::from("# Healthcare Feature Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n"));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/healthcare-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}

/// Lead-gen research prompt 9 — Novelty Hunt 2025–2026
/// Find new papers NOT already documented in docs/08-novelty.md
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;
use std::time::Duration;

const OUT_DIR: &str = "../../docs/research-output/09-novelty";

/// Already documented — agents must NOT re-report these.
const KNOWN_TECHNIQUES: &str = "Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, \
    DISCOVER, WebRL, AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, \
    DistillER, AnyMatch, OpenSanctions logic-v2, GraLMatch, Eridu, GraphER, \
    TabPFN-2.5, TabM, COP, SmartCal, ModernNCA, Hawkes Attention, \
    A-RAG, CRAG, CDTA, CoT-RAG, REFRAG, MA-RAG, GFM-RAG";

fn synthesis_preamble() -> String {
    format!(
        "You are a research scout specialising in identifying breakthrough ML/NLP techniques \
         from 2025–2026. Your job is to find papers NOT already documented in the novelty index. \
         Cross-check findings against this known list and SKIP any technique already listed: [{}]. \
         Only report papers NOT on this list. For each new paper, classify: which pipeline module \
         it applies to (1=infrastructure, 2=crawler, 3=extraction, 4=entity-resolution, \
         5=lead-scoring, 6=RAG/reports, 7=evaluation), what the breakthrough is, and whether it \
         supersedes an already-documented technique. Output a diff: ADD/UPDATE/DEPRECATE.",
        KNOWN_TECHNIQUES
    )
}

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "novelty-infrastructure-2026".into(),
            preamble: format!(
                "You are a systems ML researcher scouting for infrastructure breakthroughs from \
                 2025–2026 not yet documented. Known and skip: [{}]. Search for new papers on \
                 Rust ML runtimes (Burn, Candle, tract, CubeCL), Apple Silicon inference \
                 optimisation (MLX), zero-copy pipelines, and embedded vector DBs. \
                 Classify impact as HIGH/MEDIUM/LOW.",
                KNOWN_TECHNIQUES
            ),
            description: "Search arXiv cs.LG+cs.DC from 2025-01-01 onward for: \
                          'Rust ML inference 2025 2026 Burn CubeCL Candle', \
                          'Apple MLX machine learning framework 2025', \
                          'embedded vector database 2026 benchmark sqlite-vec'. \
                          Also search OpenAlex from_publication_date=2026-01-01 for: \
                          'edge ML inference optimisation 2026'. \
                          Use Zenodo for code releases: 'web crawler dataset 2026'. \
                          Flag papers superseding LanceDB, ChromaDB, or SQLite. \
                          Do NOT report any technique already in the known list."
                .into(),
            priority: TaskPriority::Normal,
            timeout: Some(Duration::from_secs(3000)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "novelty-crawler-2026".into(),
            preamble: format!(
                "You are an RL web crawling researcher scouting for 2025–2026 breakthroughs. \
                 Known techniques (skip these): [Craw4LLM, QMin, LARL, ARB, WebDreamer, \
                 OpAgent, M2-CMAB, DISCOVER, WebRL]. Find papers that post-date or supersede \
                 these. Use strict date filter 2026-01-01 onward for primary search.",
            ),
            description: "Search arXiv cs.LG+cs.IR from 2026-01-01 for: \
                          'web crawling reinforcement learning 2026 new', \
                          'web agent navigation benchmark 2026', \
                          'focused crawler LLM quality 2026'. \
                          Search SemanticScholar year=2026 (no min_citations — new papers): \
                          'web navigation agent reward shaping 2026'. \
                          For each paper found: (1) confirm NOT in known list, \
                          (2) state which known technique it improves upon, \
                          (3) quantify improvement if benchmarks available."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(3000)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "novelty-extraction-er-2026".into(),
            preamble: format!(
                "You are an NLP researcher scouting for 2025–2026 breakthroughs in NER, \
                 relation extraction, and entity resolution not yet documented. \
                 Known (skip): [AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, \
                 DistillER, AnyMatch, GraLMatch, Eridu, GraphER]. \
                 Also look for new benchmarks for NER or ER published in 2026.",
            ),
            description: "Search arXiv cs.CL from 2026-01-01 for: \
                          'named entity recognition 2026 new method benchmark', \
                          'entity resolution LLM 2026 new approach', \
                          'web extraction benchmark 2026'. \
                          Search S2 year=2026 (no min_citations): \
                          'zero-shot entity matching 2026', 'NER structured output LLM 2026'. \
                          For each new paper: state which known technique it replaces \
                          and by how much (F1 delta, speed delta)."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(3000)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "novelty-scoring-rag-2026".into(),
            preamble: format!(
                "You are an ML researcher scouting for 2025–2026 breakthroughs in tabular ML \
                 and RAG not yet documented. Known tabular (skip): [TabPFN-2.5, TabM, COP, \
                 SmartCal, ModernNCA, Hawkes Attention]. Known RAG (skip): [A-RAG, CRAG, CDTA, \
                 CoT-RAG, REFRAG, MA-RAG, GFM-RAG]. Find papers post-dating these.",
            ),
            description: "Search arXiv cs.LG+cs.AI from 2026-01-01 for: \
                          'tabular classification 2026 new method benchmark', \
                          'retrieval augmented generation 2026 new architecture', \
                          'RAG evaluation benchmark 2026'. \
                          Search OpenAlex from_publication_date=2026-01-01 for: \
                          'tabular learning 2026', 'generative AI report grounding 2026'. \
                          For each new tabular paper: benchmark against TabPFN-2.5. \
                          For each new RAG paper: does it beat REFRAG on latency?"
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(3000)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 5,
            subject: "novelty-synthesis-gaps".into(),
            preamble: "You are a research strategist. Based on findings from tasks 1–4, \
                       synthesise which pipeline modules have the most undocumented research \
                       activity in 2026. Identify new research directions not covered by existing \
                       8 modules: privacy, multi-language support, compliance, federated learning."
                .into(),
            description: "Search for: 'privacy-preserving web crawling GDPR 2025 2026', \
                          'multilingual entity resolution company 2025 2026', \
                          'federated learning lead generation pipeline', \
                          'compliance GDPR web data ML pipeline 2025'. \
                          Synthesise from tasks 1–4: \
                          (1) which modules have most new 2026 papers, \
                          (2) techniques superseding 3+ documented methods, \
                          (3) new module candidates (Module 9+)."
                .into(),
            priority: TaskPriority::Normal,
            dependencies: vec![1, 2, 3, 4],
            timeout: Some(Duration::from_secs(3600)),
            max_retries: 1,
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
    eprintln!("[prompt-9] Launching: 5 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 5,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        tool_config: Some(SearchToolConfig {
            default_limit: 20,
            abstract_max_chars: 500,
            include_fields_of_study: true,
            ..Default::default()
        }),
        synthesis_preamble: Some(synthesis_preamble()),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-9] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-9] Done.");
    Ok(())
}

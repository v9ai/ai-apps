use std::collections::{BTreeMap, HashSet};

use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use clap::Parser;
use futures::future::join_all;
use serde::Serialize;
use tokio::task::JoinHandle;
use tracing::{info, warn};

use research::arxiv::types::{DateRange, SearchQuery, SortBy, SortOrder};
use research::arxiv::ArxivClient;
use research::crossref::CrossrefClient;
use research::core_api::CoreClient;
use research::openalex::OpenAlexClient;
use research::paper::{PaperSource, ResearchPaper};
use research::scholar::types::SEARCH_FIELDS;
use research::scholar::SemanticScholarClient;
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};

// ── Shared constants ────────────────────────────────────────────────────────

const AI_CATEGORIES: &[&str] = &[
    "cs.AI", "cs.CL", "cs.CV", "cs.LG", "cs.MA", "cs.RO", "cs.IR", "cs.SE", "cs.CR", "stat.ML",
];

const AI_TOPICS: &[&str] = &[
    "large language model",
    "transformer architecture",
    "reinforcement learning",
    "computer vision deep learning",
    "diffusion model",
    "multimodal AI",
    "graph neural network",
    "AI agent",
];

const DEFAULT_DEEPSEEK_BASE_URL: &str = "https://api.deepseek.com";
const AUTHORS_OUT_DIR: &str = "research-output/last-week-authors";

// ── CLI ─────────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(
    name = "last-week",
    about = "Last week's AI research: paper discovery and author tracking"
)]
struct Cli {
    /// Run author tracking mode instead of paper discovery
    #[arg(long)]
    authors: bool,

    // ── Paper args ──────────────────────────────────────────────────
    /// Look-back window in days
    #[arg(long, default_value_t = 7)]
    days: u32,

    /// Max papers per arXiv category
    #[arg(long, default_value_t = 500)]
    limit: u32,

    /// Output as JSON
    #[arg(long)]
    json: bool,

    /// Skip persisting to LanceDB (papers are stored by default)
    #[arg(long)]
    no_store: bool,

    /// LanceDB storage path
    #[arg(long, default_value = "paper-discovery-db")]
    db: String,

    /// Batch size for LanceDB ingestion (bounded memory)
    #[arg(long, default_value_t = 256)]
    batch_size: usize,

    /// Sources to fetch from (comma-separated: arxiv,scholar,openalex,crossref,core)
    #[arg(long, default_value = "arxiv,scholar,openalex,crossref,core")]
    sources: String,

    /// Search existing papers instead of fetching new ones
    #[arg(long)]
    query: Option<String>,

    /// Number of results for query mode
    #[arg(long, default_value_t = 20)]
    top_k: usize,

    /// Minimum citations filter for query mode
    #[arg(long)]
    min_citations: Option<u32>,

    // ── Author args ────────────────────────────────────────────────
    /// DeepSeek API key (defaults to DEEPSEEK_API_KEY env var)
    #[arg(long)]
    api_key: Option<String>,

    /// DeepSeek base URL
    #[arg(long)]
    base_url: Option<String>,

    /// Output directory for author reports
    #[arg(long, default_value = AUTHORS_OUT_DIR)]
    output_dir: String,
}

// ── Papers types ────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct RunStats {
    timestamp: String,
    week_tag: String,
    total_papers: usize,
    papers_indexed: usize,
    by_source: BTreeMap<String, usize>,
    with_abstract: usize,
    with_doi: usize,
    with_pdf: usize,
    with_citations: usize,
    avg_citations: f64,
    chunks_indexed: usize,
}

#[derive(Serialize)]
struct PaperSummary {
    title: String,
    authors: Vec<String>,
    published: String,
    categories: Vec<String>,
    primary_category: String,
    source: String,
    source_id: String,
    pdf_url: Option<String>,
    doi: Option<String>,
    citation_count: Option<u64>,
    abstract_text: Option<String>,
}

impl PaperSummary {
    fn dedup_key(&self) -> String {
        self.title
            .chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>()
            .to_lowercase()
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    dotenvy::dotenv().ok();
    let cli = Cli::parse();

    if cli.authors {
        let api_key = cli
            .api_key
            .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
            .context("DEEPSEEK_API_KEY must be set (env or --api-key)")?;
        let base_url = cli
            .base_url
            .or_else(|| std::env::var("DEEPSEEK_BASE_URL").ok())
            .unwrap_or_else(|| DEFAULT_DEEPSEEK_BASE_URL.to_string());
        run_authors(api_key, base_url, cli.output_dir).await
    } else {
        run_papers(
            cli.days,
            cli.limit,
            cli.json,
            cli.no_store,
            cli.db,
            cli.batch_size,
            cli.sources,
            cli.query,
            cli.top_k,
            cli.min_citations,
        )
        .await
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Papers subcommand
// ═══════════════════════════════════════════════════════════════════════════

async fn run_papers(
    days: u32,
    limit: u32,
    json: bool,
    no_store: bool,
    db: String,
    batch_size: usize,
    sources: String,
    query: Option<String>,
    top_k: usize,
    min_citations: Option<u32>,
) -> Result<()> {
    // ── Query mode: search existing LanceDB ─────────────────────────
    if let Some(ref query_text) = query {
        use research::local_embeddings::EmbeddingEngine;
        use research::vector::{SearchFilter, VectorStore};

        let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
        let store = VectorStore::connect(&db, engine).await?;

        let filter = SearchFilter {
            year_min: None,
            year_max: None,
            source: None,
            min_citations,
        };

        let results = store
            .search_papers_filtered(query_text, top_k, &filter)
            .await?;

        println!("Found {} results for \"{}\":\n", results.len(), query_text);
        for (i, result) in results.iter().enumerate() {
            let p = &result.paper;
            let cites = p
                .citation_count
                .map(|c| format!(" [{c} cites]"))
                .unwrap_or_default();
            println!(
                "{}. [score: {:.3}] {}{}",
                i + 1,
                result.score,
                p.title,
                cites
            );
            println!(
                "   Source: {:?} | ID: {} | Year: {}",
                p.source,
                p.source_id,
                p.year.map(|y| y.to_string()).unwrap_or("?".into())
            );
            if let Some(ref abs) = p.abstract_text {
                let preview: String = abs.chars().take(200).collect();
                println!("   {preview}...");
            }
            println!();
        }
        return Ok(());
    }

    let source_set: HashSet<&str> = sources.split(',').map(|s| s.trim()).collect();

    let now = Utc::now();
    let from = now - Duration::days(days as i64);
    let year_str = from.format("%Y").to_string();

    println!(
        "Fetching AI papers from {} to {} ({} days)\nSources: {}\n",
        from.format("%Y-%m-%d"),
        now.format("%Y-%m-%d"),
        days,
        sources,
    );

    let mut handles: Vec<JoinHandle<Vec<PaperSummary>>> = Vec::new();

    // ── arXiv ───────────────────────────────────────────────────────
    if source_set.contains("arxiv") {
        let from_str = from.format("%Y%m%d").to_string();
        let to_str = now.format("%Y%m%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_arxiv(&from_str, &to_str, limit).await
        }));
    }

    // ── Semantic Scholar ────────────────────────────────────────────
    if source_set.contains("scholar") {
        let year = year_str.clone();
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_scholar(&year, &from_iso).await
        }));
    }

    // ── OpenAlex ────────────────────────────────────────────────────
    if source_set.contains("openalex") {
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_openalex(&from_iso).await
        }));
    }

    // ── Crossref ────────────────────────────────────────────────────
    if source_set.contains("crossref") {
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_crossref(&from_iso).await
        }));
    }

    // ── CORE ────────────────────────────────────────────────────────
    if source_set.contains("core") {
        let year = year_str.clone();
        handles.push(tokio::spawn(async move {
            fetch_core(&year).await
        }));
    }

    // ── Collect & dedup ─────────────────────────────────────────────
    let results = join_all(handles).await;
    let mut all: Vec<PaperSummary> = Vec::new();
    for result in results {
        match result {
            Ok(papers) => all.extend(papers),
            Err(e) => warn!("Source task panicked: {e}"),
        }
    }

    // Dedup by normalized title
    let mut seen_titles: HashSet<String> = HashSet::new();
    all.retain(|p| {
        let key = p.dedup_key();
        if key.is_empty() {
            return false;
        }
        seen_titles.insert(key)
    });

    // Fuzzy dedup: catch near-duplicate titles across sources
    let before_fuzzy = all.len();
    let mut deduped: Vec<PaperSummary> = Vec::with_capacity(all.len());
    for paper in all.drain(..) {
        let dominated = deduped
            .iter()
            .any(|existing| trigram_similarity(&existing.dedup_key(), &paper.dedup_key()) > 0.85);
        if !dominated {
            deduped.push(paper);
        }
    }
    all = deduped;
    if before_fuzzy != all.len() {
        println!("Fuzzy dedup removed {} near-duplicates", before_fuzzy - all.len());
    }

    // Sort by source then title
    all.sort_by(|a, b| a.source.cmp(&b.source).then(a.title.cmp(&b.title)));

    println!();

    if json {
        println!("{}", serde_json::to_string_pretty(&all)?);
    } else {
        // Group by source
        let mut by_source: BTreeMap<String, Vec<&PaperSummary>> = BTreeMap::new();
        for p in &all {
            by_source.entry(p.source.clone()).or_default().push(p);
        }

        for (source, papers) in &by_source {
            println!("=== {} ({} papers) ===", source, papers.len());
            for p in papers.iter().take(50) {
                let title: String = p.title.chars().take(70).collect();
                let cites = p
                    .citation_count
                    .map(|c| format!(" [{c} cites]"))
                    .unwrap_or_default();
                println!(
                    "  {}  {:<70}  {}{}",
                    &p.published[..10.min(p.published.len())],
                    title,
                    p.source_id,
                    cites,
                );
            }
            if papers.len() > 50 {
                println!("  ... and {} more", papers.len() - 50);
            }
            println!();
        }

        // Source breakdown
        println!("Summary: {} unique papers across {} sources", all.len(), by_source.len());
        for (source, papers) in &by_source {
            println!("  {}: {}", source, papers.len());
        }
        println!(
            "  Period: {} to {}",
            from.format("%Y-%m-%d"),
            now.format("%Y-%m-%d"),
        );
    }

    if !no_store {
        use research::local_embeddings::EmbeddingEngine;
        use research::vector::VectorStore;

        let week_tag = format!("weekly:{}", now.format("%G-W%V"));

        let papers: Vec<ResearchPaper> = all
            .iter()
            .map(|s| {
                let paper_source = match s.source.as_str() {
                    "arXiv" => PaperSource::Arxiv,
                    "Semantic Scholar" => PaperSource::SemanticScholar,
                    "OpenAlex" => PaperSource::OpenAlex,
                    "Crossref" => PaperSource::Crossref,
                    "CORE" => PaperSource::Core,
                    _ => PaperSource::Arxiv,
                };

                let url = match paper_source {
                    PaperSource::Arxiv => {
                        Some(format!("https://arxiv.org/abs/{}", s.source_id))
                    }
                    PaperSource::SemanticScholar => {
                        Some(format!(
                            "https://api.semanticscholar.org/paper/{}",
                            s.source_id
                        ))
                    }
                    PaperSource::OpenAlex | PaperSource::Crossref | PaperSource::Core => {
                        s.doi
                            .as_ref()
                            .map(|doi| format!("https://doi.org/{doi}"))
                            .or_else(|| s.pdf_url.clone())
                    }
                };

                let fields_of_study = Some({
                    let mut f: Vec<String> = s.categories.clone();
                    f.extend(s.categories.iter().map(|c| format!("field:{c}")));
                    if !s.primary_category.is_empty() {
                        f.push(format!("primary:{}", s.primary_category));
                    }
                    f.push(week_tag.clone());
                    f.push(format!("source:{}", s.source));
                    f
                });

                ResearchPaper {
                    title: s.title.clone(),
                    abstract_text: s.abstract_text.clone(),
                    authors: s.authors.clone(),
                    year: s.published.get(..4).and_then(|y| y.parse().ok()),
                    doi: s.doi.clone(),
                    citation_count: s.citation_count,
                    url,
                    pdf_url: s.pdf_url.clone(),
                    source: paper_source,
                    source_id: s.source_id.clone(),
                    fields_of_study,
                    published_date: Some(s.published.clone()),
                    primary_category: if s.primary_category.is_empty() {
                        None
                    } else {
                        Some(s.primary_category.clone())
                    },
                    categories: if s.categories.is_empty() {
                        None
                    } else {
                        Some(s.categories.clone())
                    },
                }
            })
            .collect();

        println!("\nStoring {} papers to LanceDB ({})...", papers.len(), db);
        let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
        let store = VectorStore::connect(&db, engine).await?;
        let count = store.add_papers_batched(&papers, batch_size).await?;
        println!("Indexed {count} papers (tagged: {week_tag})");

        // ── Chunk abstracts for fine-grained search ──────────────────
        use research::chunker::{chunk_text, ChunkerConfig, ChunkStrategy};

        let chunk_config = ChunkerConfig {
            chunk_size: 256,
            overlap: 32,
            min_size: 30,
            strategy: ChunkStrategy::Sentence,
        };

        let mut all_chunks = Vec::new();
        for paper in &papers {
            if let Some(ref abstract_text) = paper.abstract_text {
                if abstract_text.len() > chunk_config.min_size {
                    let chunks = chunk_text(abstract_text, &paper.source_id, Some(chunk_config.clone()));
                    all_chunks.extend(chunks);
                }
            }
        }

        let chunks_indexed = if !all_chunks.is_empty() {
            println!(
                "Chunking {} abstracts into {} chunks...",
                papers.iter().filter(|p| p.abstract_text.is_some()).count(),
                all_chunks.len()
            );
            let c = store.add_chunks_batched(&all_chunks, 512).await?;
            println!("Indexed {c} abstract chunks");
            c
        } else {
            0
        };

        // ── Run statistics ───────────────────────────────────────────
        let stats = RunStats {
            timestamp: Utc::now().to_rfc3339(),
            week_tag: week_tag.clone(),
            total_papers: papers.len(),
            papers_indexed: count,
            by_source: {
                let mut m = BTreeMap::new();
                for p in &papers {
                    *m.entry(format!("{:?}", p.source)).or_insert(0usize) += 1;
                }
                m
            },
            with_abstract: papers.iter().filter(|p| p.abstract_text.is_some()).count(),
            with_doi: papers.iter().filter(|p| p.doi.is_some()).count(),
            with_pdf: papers.iter().filter(|p| p.pdf_url.is_some()).count(),
            with_citations: papers.iter().filter(|p| p.citation_count.is_some()).count(),
            avg_citations: {
                let cited: Vec<u64> = papers.iter().filter_map(|p| p.citation_count).collect();
                if cited.is_empty() { 0.0 } else { cited.iter().sum::<u64>() as f64 / cited.len() as f64 }
            },
            chunks_indexed,
        };

        let stats_path = format!("{}/run-stats-{}.json", db, now.format("%Y%m%d-%H%M%S"));
        std::fs::write(&stats_path, serde_json::to_string_pretty(&stats)?)?;

        println!("\n╔══════════════════════════════════════╗");
        println!("║       Ingestion Summary              ║");
        println!("╠══════════════════════════════════════╣");
        println!("║ Total papers:     {:>6}             ║", stats.total_papers);
        println!("║ Indexed:          {:>6}             ║", stats.papers_indexed);
        println!("║ Chunks:           {:>6}             ║", stats.chunks_indexed);
        println!("║ With abstract:    {:>6}             ║", stats.with_abstract);
        println!("║ With DOI:         {:>6}             ║", stats.with_doi);
        println!("║ With PDF:         {:>6}             ║", stats.with_pdf);
        println!("║ With citations:   {:>6}             ║", stats.with_citations);
        println!("║ Avg citations:    {:>6.1}             ║", stats.avg_citations);
        println!("╠══════════════════════════════════════╣");
        for (source, count) in &stats.by_source {
            println!("║ {:.<20} {:>5}             ║", source, count);
        }
        println!("╚══════════════════════════════════════╝");
        println!("Stats saved to {stats_path}");
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// Authors subcommand
// ═══════════════════════════════════════════════════════════════════════════

fn author_preamble() -> String {
    "You are a bibliometrics researcher specialising in tracking who is publishing \
     cutting-edge AI research. For every paper you find, extract and highlight: \
     (1) full author names, (2) institutional affiliations when available, \
     (3) whether they are first/last/corresponding author, \
     (4) notable collaboration patterns (cross-institution, industry-academia). \
     Format your findings in Markdown with author names in **bold**. \
     Focus on papers from the last 7 days."
        .into()
}

fn author_tasks() -> Vec<ResearchTask> {
    let week = "last 7 days";

    vec![
        ResearchTask {
            id: 1,
            subject: "llm-authors".into(),
            description: format!(
                "Search for papers published in the {week} on large language models (LLMs), \
                 including GPT, Claude, Gemini, Llama, DeepSeek, Qwen variants. \
                 For each paper found, list ALL author names and their affiliations. \
                 Identify the most prolific authors (appearing on 2+ papers) and \
                 which labs/companies they belong to. Note any new first-time LLM authors."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Critical,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "vision-diffusion-authors".into(),
            description: format!(
                "Search for papers published in the {week} on computer vision, \
                 image generation, diffusion models, and video generation. \
                 Extract ALL author names and affiliations. \
                 Identify key research groups (Stability AI, Midjourney, Google DeepMind vision team, \
                 Meta FAIR vision). Flag any cross-lab collaborations."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "rl-robotics-authors".into(),
            description: format!(
                "Search for papers published in the {week} on reinforcement learning, \
                 robot learning, embodied AI, and sim-to-real transfer. \
                 Extract ALL author names and affiliations. \
                 Identify which robotics labs are most active this week \
                 (Berkeley, CMU, Stanford, MIT, Google DeepMind, Toyota Research, etc.)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "multimodal-authors".into(),
            description: format!(
                "Search for papers published in the {week} on multimodal AI, \
                 vision-language models, audio-language models, and multi-modal reasoning. \
                 Extract ALL author names and affiliations. \
                 Track which teams are leading multimodal research this week."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 5,
            subject: "ai-agents-authors".into(),
            description: format!(
                "Search for papers published in the {week} on AI agents, \
                 tool-use, function calling, agentic workflows, and autonomous systems. \
                 Extract ALL author names and affiliations. \
                 Identify emerging researchers in the agentic AI space."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Critical,
            ..Default::default()
        },
        ResearchTask {
            id: 6,
            subject: "safety-alignment-authors".into(),
            description: format!(
                "Search for papers published in the {week} on AI safety, alignment, \
                 RLHF, constitutional AI, red-teaming, and interpretability. \
                 Extract ALL author names and affiliations. \
                 Identify which safety labs are publishing (Anthropic, OpenAI safety, \
                 DeepMind alignment, MIRI, ARC, Redwood Research)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 7,
            subject: "efficiency-scaling-authors".into(),
            description: format!(
                "Search for papers published in the {week} on model efficiency, \
                 quantization, distillation, pruning, mixture-of-experts, \
                 and scaling laws. Extract ALL author names and affiliations. \
                 Track which hardware/efficiency labs are most active."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 8,
            subject: "nlp-ir-authors".into(),
            description: format!(
                "Search for papers published in the {week} on NLP, information retrieval, \
                 RAG, search, embeddings, and text understanding. \
                 Extract ALL author names and affiliations. \
                 Identify the most active NLP research groups this week."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 9,
            subject: "graph-geometric-authors".into(),
            description: format!(
                "Search for papers published in the {week} on graph neural networks, \
                 geometric deep learning, molecular AI, and protein folding. \
                 Extract ALL author names and affiliations. \
                 Note any cross-disciplinary collaborations (CS + biology/chemistry)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 10,
            subject: "author-landscape-synthesis".into(),
            description: format!(
                "Based on findings from all previous tasks, produce a comprehensive \
                 author landscape report for the {week}: \
                 (1) Top 20 most prolific authors across all AI domains, \
                 (2) Most active institutions/labs ranked by paper count, \
                 (3) Notable industry-academia collaborations, \
                 (4) Emerging researchers (first-time or recently-active authors with high-impact work), \
                 (5) Cross-domain authors appearing in multiple research areas, \
                 (6) Geographic distribution of AI research output. \
                 Present as a structured Markdown report with tables where appropriate."
            ),
            preamble: "You are a science-of-science researcher producing a weekly intelligence \
                 briefing on who is driving AI research. Synthesise the teammate findings into \
                 a clear, data-driven author landscape report."
                .into(),
            priority: TaskPriority::Critical,
            dependencies: vec![1, 2, 3, 4, 5, 6, 7, 8, 9],
            ..Default::default()
        },
    ]
}

async fn run_authors(api_key: String, base_url: String, output_dir: String) -> Result<()> {
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(&output_dir)
        .with_context(|| format!("creating output dir {output_dir}"))?;

    let tasks = author_tasks();
    let team_size = 10;
    eprintln!(
        "Launching last-week-authors team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a bibliometrics analyst producing a weekly AI author intelligence report. \
             Synthesise all agent findings into a unified view of who is publishing what, \
             collaboration patterns, and emerging talent."
                .into(),
        ),
        synthesis_prompt_template: Some(
            r#"# Author Landscape Synthesis — Last Week in AI Research

You have received findings from {count} research agents, each tracking author names
and affiliations in a different AI domain over the past week.

Produce a **master author landscape report** with:

1. **Top Authors** — ranked by paper count across all domains
2. **Lab Leaderboard** — institutions ranked by output volume
3. **Collaboration Heatmap** — which labs co-author most frequently
4. **Rising Stars** — newly prolific or first-time authors with notable work
5. **Cross-Domain Bridges** — authors publishing in 2+ domains simultaneously
6. **Industry vs Academia Split** — ratio and key players on each side
7. **Geographic Hotspots** — where AI research is concentrated this week

## Agent Findings

{combined}
"#
            .into(),
        ),
        tool_config: None,
        scholar_concurrency: Some(3),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(output_dir.clone()),
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{output_dir}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{output_dir}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!(
        "  wrote {synthesis_path} ({} bytes)",
        result.synthesis.len()
    );

    let mut combined = String::from("# Last Week in AI — Author Landscape Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n"));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{output_dir}/last-week-authors-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// Paper source fetchers
// ═══════════════════════════════════════════════════════════════════════════

async fn fetch_arxiv(from_str: &str, to_str: &str, limit: u32) -> Vec<PaperSummary> {
    let dr = match DateRange::new(from_str, to_str) {
        Ok(dr) => dr,
        Err(e) => {
            warn!("arXiv: bad date range: {e}");
            return vec![];
        }
    };

    let arxiv = ArxivClient::new();
    let mut papers = Vec::new();

    for cat in AI_CATEGORIES {
        let query = match SearchQuery::new()
            .category_str(cat)
            .map(|q| {
                q.date_range(dr.clone())
                    .sort_by(SortBy::SubmittedDate)
                    .sort_order(SortOrder::Descending)
                    .max_results(100)
            }) {
            Ok(q) => q,
            Err(e) => {
                warn!("arXiv: invalid category {cat}: {e}");
                continue;
            }
        };

        eprint!("  arXiv/{cat}...");
        let label = format!("arXiv/{cat}");
        if let Some(resp) = retry(&label, 2, || arxiv.search_all(&query, limit)).await {
            eprintln!(" {} papers", resp.papers.len());
            for p in resp.papers {
                papers.push(PaperSummary {
                    title: p.title.replace('\n', " ").trim().to_string(),
                    authors: p.authors.clone(),
                    published: p.published[..10.min(p.published.len())].to_string(),
                    categories: p.categories.clone(),
                    primary_category: p
                        .categories
                        .first()
                        .cloned()
                        .unwrap_or_else(|| cat.to_string()),
                    source: "arXiv".into(),
                    source_id: base_arxiv_id(&p.arxiv_id).to_string(),
                    pdf_url: p.pdf_url,
                    doi: p.doi,
                    citation_count: None,
                    abstract_text: if p.summary.is_empty() {
                        None
                    } else {
                        Some(p.summary)
                    },
                });
            }
        } else {
            eprintln!(" skipping after retries exhausted");
        }
    }

    info!(source = "arXiv", count = papers.len(), "Fetch complete");
    papers
}

async fn fetch_scholar(year: &str, from_date: &str) -> Vec<PaperSummary> {
    let client = SemanticScholarClient::new(None);
    let mut papers = Vec::new();
    let year_filter = format!("{year}-");

    for topic in AI_TOPICS {
        eprint!("  S2/{topic}...");
        let label = format!("S2/{topic}");
        let resp_opt = retry(&label, 2, || {
            client.search_bulk(
                topic,
                SEARCH_FIELDS,
                Some(&year_filter),
                None,
                Some("publicationDate:desc"),
                100,
            )
        })
        .await;

        match resp_opt {
            Some(resp) => {
                let total = resp.data.len();
                let recent: Vec<_> = resp
                    .data
                    .into_iter()
                    .filter(|p| {
                        p.publication_date
                            .as_deref()
                            .map(|d| d >= from_date)
                            .unwrap_or(false)
                    })
                    .collect();
                eprintln!(" {} recent / {} total", recent.len(), total);
                for p in recent {
                    let title = p.title.as_deref().unwrap_or("").to_string();
                    if title.is_empty() {
                        continue;
                    }
                    papers.push(PaperSummary {
                        title,
                        authors: p
                            .authors
                            .unwrap_or_default()
                            .into_iter()
                            .filter_map(|a| a.name)
                            .collect(),
                        published: p.publication_date.unwrap_or_default(),
                        categories: p.fields_of_study.unwrap_or_default(),
                        primary_category: "AI".into(),
                        source: "Semantic Scholar".into(),
                        source_id: p.paper_id.unwrap_or_default(),
                        pdf_url: p.open_access_pdf.and_then(|oa| oa.url),
                        doi: None,
                        citation_count: p.citation_count,
                        abstract_text: p.abstract_text,
                    });
                }
            }
            None => {
                eprintln!(" skipping after retries exhausted");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }

    info!(source = "Semantic Scholar", count = papers.len(), "Fetch complete");
    papers
}

async fn fetch_openalex(from_date: &str) -> Vec<PaperSummary> {
    let client = OpenAlexClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        eprint!("  OpenAlex/{topic}...");
        let label = format!("OpenAlex/{topic}");
        if let Some(resp) = retry(&label, 2, || client.search_filtered(topic, Some(from_date), 1, 100)).await {
            eprintln!(" {} papers (since {from_date})", resp.results.len());
            for w in resp.results {
                let title = w.title.clone().unwrap_or_default();
                if title.is_empty() {
                    continue;
                }
                let rp: ResearchPaper = w.into();
                papers.push(PaperSummary {
                    title: rp.title,
                    authors: rp.authors,
                    published: rp.year.map(|y: u32| y.to_string()).unwrap_or_default(),
                    categories: rp.fields_of_study.unwrap_or_default(),
                    primary_category: "AI".into(),
                    source: "OpenAlex".into(),
                    source_id: rp.source_id,
                    pdf_url: rp.pdf_url,
                    doi: rp.doi,
                    citation_count: rp.citation_count,
                    abstract_text: rp.abstract_text,
                });
            }
        } else {
            eprintln!(" skipping after retries exhausted");
        }
    }

    info!(source = "OpenAlex", count = papers.len(), "Fetch complete");
    papers
}

async fn fetch_crossref(from_date: &str) -> Vec<PaperSummary> {
    let client = CrossrefClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        eprint!("  Crossref/{topic}...");
        let label = format!("Crossref/{topic}");
        if let Some(resp) = retry(&label, 2, || client.search_filtered(topic, Some(from_date), 100, 0)).await {
            let items = resp
                .message
                .as_ref()
                .and_then(|m: &research::crossref::CrossrefMessage| m.items.as_ref())
                .cloned()
                .unwrap_or_default();
            eprintln!(" {} papers (since {from_date})", items.len());
            for w in items {
                let rp: ResearchPaper = ResearchPaper::from(w);
                if rp.title.is_empty() {
                    continue;
                }
                papers.push(PaperSummary {
                    title: rp.title,
                    authors: rp.authors,
                    published: rp.year.map(|y: u32| y.to_string()).unwrap_or_default(),
                    categories: vec![],
                    primary_category: "AI".into(),
                    source: "Crossref".into(),
                    source_id: rp.source_id,
                    pdf_url: rp.pdf_url,
                    doi: rp.doi,
                    citation_count: rp.citation_count,
                    abstract_text: rp.abstract_text,
                });
            }
        } else {
            eprintln!(" skipping after retries exhausted");
        }
    }

    info!(source = "Crossref", count = papers.len(), "Fetch complete");
    papers
}

async fn fetch_core(year: &str) -> Vec<PaperSummary> {
    let client = CoreClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        let query = format!("{topic} {year}");
        eprint!("  CORE/{topic}...");
        let label = format!("CORE/{topic}");
        if let Some(resp) = retry(&label, 2, || client.search(&query, 50, 0)).await {
            let recent: Vec<_> = resp
                .results
                .into_iter()
                .filter(|w| {
                    w.year_published
                        .map(|y| y >= year.parse::<u32>().unwrap_or(0))
                        .unwrap_or(false)
                })
                .collect();
            eprintln!(" {} papers", recent.len());
            for w in recent {
                let rp: ResearchPaper = ResearchPaper::from(w);
                if rp.title.is_empty() {
                    continue;
                }
                papers.push(PaperSummary {
                    title: rp.title,
                    authors: rp.authors,
                    published: rp.year.map(|y: u32| y.to_string()).unwrap_or_default(),
                    categories: vec![],
                    primary_category: "AI".into(),
                    source: "CORE".into(),
                    source_id: rp.source_id,
                    pdf_url: rp.pdf_url,
                    doi: rp.doi,
                    citation_count: rp.citation_count,
                    abstract_text: rp.abstract_text,
                });
            }
        } else {
            eprintln!(" skipping after retries exhausted");
        }
    }

    info!(source = "CORE", count = papers.len(), "Fetch complete");
    papers
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

fn base_arxiv_id(id: &str) -> &str {
    match id.find('v') {
        Some(pos)
            if !id[pos + 1..].is_empty()
                && id[pos + 1..].chars().all(|c| c.is_ascii_digit()) =>
        {
            &id[..pos]
        }
        _ => id,
    }
}

fn trigram_similarity(a: &str, b: &str) -> f64 {
    if a.len() < 3 || b.len() < 3 {
        return if a == b { 1.0 } else { 0.0 };
    }
    fn trigrams(s: &str) -> HashSet<String> {
        (0..s.len().saturating_sub(2))
            .filter(|&i| s.is_char_boundary(i) && s.is_char_boundary(i + 3))
            .map(|i| s[i..i + 3].to_string())
            .collect()
    }
    let a_tri = trigrams(a);
    let b_tri = trigrams(b);
    let intersection = a_tri.intersection(&b_tri).count();
    let union = a_tri.union(&b_tri).count();
    if union == 0 { 1.0 } else { intersection as f64 / union as f64 }
}

async fn retry<F, Fut, T, E>(name: &str, max_retries: u32, f: F) -> Option<T>
where
    F: Fn() -> Fut,
    E: std::fmt::Display,
    Fut: std::future::Future<Output = Result<T, E>>,
{
    for attempt in 0..=max_retries {
        match f().await {
            Ok(val) => return Some(val),
            Err(e) => {
                if attempt < max_retries {
                    let delay = std::time::Duration::from_secs(2u64.pow(attempt));
                    eprintln!("  {name}: attempt {}/{max_retries} failed ({e}), retrying in {delay:?}...", attempt + 1);
                    tokio::time::sleep(delay).await;
                } else {
                    warn!("{name}: all {max_retries} retries exhausted: {e}");
                }
            }
        }
    }
    None
}

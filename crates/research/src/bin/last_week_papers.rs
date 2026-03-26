use std::collections::{BTreeMap, HashSet};

use anyhow::Result;
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

#[derive(Parser)]
#[command(
    name = "last-week-papers",
    about = "Fetch last week's AI research papers from arXiv, Semantic Scholar, OpenAlex, Crossref, and CORE"
)]
struct Cli {
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
    /// Default: all sources
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
}

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

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let cli = Cli::parse();

    // ── Query mode: search existing LanceDB ─────────────────────────
    if let Some(ref query_text) = cli.query {
        use research::local_embeddings::EmbeddingEngine;
        use research::vector::{SearchFilter, VectorStore};

        let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
        let store = VectorStore::connect(&cli.db, engine).await?;

        let filter = SearchFilter {
            year_min: None,
            year_max: None,
            source: None,
            min_citations: cli.min_citations,
        };

        let results = store
            .search_papers_filtered(query_text, cli.top_k, &filter)
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

    let sources: HashSet<&str> = cli.sources.split(',').map(|s| s.trim()).collect();

    let now = Utc::now();
    let from = now - Duration::days(cli.days as i64);
    let year_str = from.format("%Y").to_string();

    println!(
        "Fetching AI papers from {} to {} ({} days)\nSources: {}\n",
        from.format("%Y-%m-%d"),
        now.format("%Y-%m-%d"),
        cli.days,
        cli.sources,
    );

    let mut handles: Vec<JoinHandle<Vec<PaperSummary>>> = Vec::new();

    // ── arXiv ───────────────────────────────────────────────────────
    if sources.contains("arxiv") {
        let limit = cli.limit;
        let from_str = from.format("%Y%m%d").to_string();
        let to_str = now.format("%Y%m%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_arxiv(&from_str, &to_str, limit).await
        }));
    }

    // ── Semantic Scholar ────────────────────────────────────────────
    if sources.contains("scholar") {
        let year = year_str.clone();
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_scholar(&year, &from_iso).await
        }));
    }

    // ── OpenAlex ────────────────────────────────────────────────────
    if sources.contains("openalex") {
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_openalex(&from_iso).await
        }));
    }

    // ── Crossref ────────────────────────────────────────────────────
    if sources.contains("crossref") {
        let from_iso = from.format("%Y-%m-%d").to_string();
        handles.push(tokio::spawn(async move {
            fetch_crossref(&from_iso).await
        }));
    }

    // ── CORE ────────────────────────────────────────────────────────
    if sources.contains("core") {
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

    if cli.json {
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

    if !cli.no_store {
        use research::local_embeddings::EmbeddingEngine;
        use research::vector::VectorStore;

        let week_tag = format!("weekly:{}", now.format("%G-W%V"));

        // TODO: add `published_date: Option<String>` to ResearchPaper to preserve full date (s.published)
        // TODO: add `primary_category: Option<String>` to ResearchPaper to preserve s.primary_category
        // TODO: add `categories: Option<Vec<String>>` to ResearchPaper to preserve s.categories

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

                // Construct a proper URL based on source, falling back to pdf_url
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
                        // Use DOI URL if available, otherwise fall back to pdf_url
                        s.doi
                            .as_ref()
                            .map(|doi| format!("https://doi.org/{doi}"))
                            .or_else(|| s.pdf_url.clone())
                    }
                };

                // Preserve raw categories alongside enrichment tags
                let fields_of_study = Some({
                    // Raw categories first (preserves original data)
                    let mut f: Vec<String> = s.categories.clone();
                    // Enrichment tags for filtering
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

        println!("\nStoring {} papers to LanceDB ({})...", papers.len(), cli.db);
        let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
        let store = VectorStore::connect(&cli.db, engine).await?;
        let count = store.add_papers_batched(&papers, cli.batch_size).await?;
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

        let stats_path = format!("{}/run-stats-{}.json", cli.db, now.format("%Y%m%d-%H%M%S"));
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

// ── arXiv fetcher ───────────────────────────────────────────────────────────

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

// ── Semantic Scholar fetcher ────────────────────────────────────────────────

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
                // Client-side date filter: only keep papers with publication_date >= from_date
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
                // S2 rate-limits aggressively — wait before next topic
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }

        // Be polite to S2
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }

    info!(source = "Semantic Scholar", count = papers.len(), "Fetch complete");
    papers
}

// ── OpenAlex fetcher ────────────────────────────────────────────────────────

async fn fetch_openalex(from_date: &str) -> Vec<PaperSummary> {
    let client = OpenAlexClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        eprint!("  OpenAlex/{topic}...");
        // Server-side date filter via from_publication_date API param
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

// ── Crossref fetcher ────────────────────────────────────────────────────────

async fn fetch_crossref(from_date: &str) -> Vec<PaperSummary> {
    let client = CrossrefClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        eprint!("  Crossref/{topic}...");
        // Server-side date filter via from-pub-date API param
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

// ── CORE fetcher ────────────────────────────────────────────────────────────

async fn fetch_core(year: &str) -> Vec<PaperSummary> {
    let client = CoreClient::new(None);
    let mut papers = Vec::new();

    for topic in AI_TOPICS.iter() {
        // CORE doesn't support date filtering in API — use year in query + client-side filter
        let query = format!("{topic} {year}");
        eprint!("  CORE/{topic}...");
        let label = format!("CORE/{topic}");
        if let Some(resp) = retry(&label, 2, || client.search(&query, 50, 0)).await {
            // Client-side year filter (best we can do — CORE has no date API)
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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

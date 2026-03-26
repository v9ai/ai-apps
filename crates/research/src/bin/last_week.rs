use std::collections::{BTreeMap, HashSet};

use anyhow::Result;
use chrono::{Duration, Utc};
use futures::future::join_all;
use tokio::task::JoinHandle;
use tracing::{info, warn};

use research::arxiv::types::{DateRange, SearchQuery, SortBy, SortOrder};
use research::arxiv::ArxivClient;
use research::chunker::{chunk_text, ChunkerConfig, ChunkStrategy};
use research::core_api::CoreClient;
use research::crossref::CrossrefClient;
use research::local_embeddings::EmbeddingEngine;
use research::openalex::OpenAlexClient;
use research::paper::{PaperSource, ResearchPaper};
use research::scholar::types::SEARCH_FIELDS;
use research::scholar::SemanticScholarClient;
use research::vector::VectorStore;

// ── Constants ──────────────────────────────────────────────────────────────

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

const DAYS: u32 = 7;
const LIMIT: u32 = 500;
const BATCH_SIZE: usize = 256;
const DB_PATH: &str = "paper-discovery-db";
const OUTPUT_DIR: &str = "research-output";

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(Clone)]
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

    fn url(&self) -> String {
        if self.source == "arXiv" {
            format!("https://arxiv.org/abs/{}", self.source_id)
        } else if let Some(ref doi) = self.doi {
            format!("https://doi.org/{doi}")
        } else if let Some(ref pdf) = self.pdf_url {
            pdf.clone()
        } else {
            self.source_id.clone()
        }
    }
}

// ── Main ───────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    dotenvy::dotenv().ok();

    let now = Utc::now();
    let from = now - Duration::days(DAYS as i64);
    let year_str = from.format("%Y").to_string();

    println!(
        "Fetching AI papers from {} to {} ({DAYS} days)\n",
        from.format("%Y-%m-%d"),
        now.format("%Y-%m-%d"),
    );

    // Launch all sources in parallel
    let from_ymd = from.format("%Y%m%d").to_string();
    let to_ymd = now.format("%Y%m%d").to_string();
    let from_iso = from.format("%Y-%m-%d").to_string();
    let from_iso2 = from_iso.clone();
    let from_iso3 = from_iso.clone();
    let year_str2 = year_str.clone();

    let mut handles: Vec<JoinHandle<Vec<PaperSummary>>> = vec![
        tokio::spawn(async move { fetch_arxiv(&from_ymd, &to_ymd, LIMIT).await }),
        tokio::spawn(async move { fetch_scholar(&year_str, &from_iso).await }),
        tokio::spawn(async move { fetch_openalex(&from_iso2).await }),
        tokio::spawn(async move { fetch_crossref(&from_iso3).await }),
        tokio::spawn(async move { fetch_core(&year_str2).await }),
    ];

    // ── Collect & dedup ────────────────────────────────────────────
    let results = join_all(handles.drain(..)).await;
    let mut all: Vec<PaperSummary> = Vec::new();
    for result in results {
        match result {
            Ok(papers) => all.extend(papers),
            Err(e) => warn!("Source task panicked: {e}"),
        }
    }

    let mut seen_titles: HashSet<String> = HashSet::new();
    all.retain(|p| {
        let key = p.dedup_key();
        if key.is_empty() {
            return false;
        }
        seen_titles.insert(key)
    });

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

    all.sort_by(|a, b| {
        b.citation_count
            .unwrap_or(0)
            .cmp(&a.citation_count.unwrap_or(0))
            .then(a.title.cmp(&b.title))
    });

    // ── Markdown report ────────────────────────────────────────────
    let period = format!("{} to {}", from.format("%Y-%m-%d"), now.format("%Y-%m-%d"));
    let md = build_report(&all, &period);

    std::fs::create_dir_all(OUTPUT_DIR)?;
    let report_path = format!("{OUTPUT_DIR}/last-week-{}.md", now.format("%Y-%m-%d"));
    std::fs::write(&report_path, &md)?;
    println!("\nReport saved to {report_path} ({} papers)", all.len());

    // ── Persist to LanceDB ─────────────────────────────────────────
    let week_tag = format!("weekly:{}", now.format("%G-W%V"));
    let papers: Vec<ResearchPaper> = all.iter().map(|s| to_research_paper(s, &week_tag)).collect();

    println!("Storing {} papers to LanceDB ({DB_PATH})...", papers.len());
    let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
    let store = VectorStore::connect(DB_PATH, engine).await?;
    let count = store.add_papers_batched(&papers, BATCH_SIZE).await?;
    println!("Indexed {count} papers (tagged: {week_tag})");

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
                let chunks =
                    chunk_text(abstract_text, &paper.source_id, Some(chunk_config.clone()));
                all_chunks.extend(chunks);
            }
        }
    }

    if !all_chunks.is_empty() {
        println!(
            "Chunking {} abstracts into {} chunks...",
            papers.iter().filter(|p| p.abstract_text.is_some()).count(),
            all_chunks.len()
        );
        let c = store.add_chunks_batched(&all_chunks, 512).await?;
        println!("Indexed {c} abstract chunks");
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// Markdown report
// ═══════════════════════════════════════════════════════════════════════════

fn categorize(paper: &PaperSummary) -> &'static str {
    let cat = paper.primary_category.as_str();
    let title_lower = paper.title.to_lowercase();

    match cat {
        "cs.CL" => return "NLP & Language Models",
        "cs.CV" => return "Computer Vision",
        "cs.LG" | "stat.ML" => return "Machine Learning",
        "cs.AI" => return "General AI",
        "cs.RO" => return "Robotics",
        "cs.MA" => return "Multi-Agent Systems",
        "cs.IR" => return "Information Retrieval",
        "cs.SE" => return "Software Engineering",
        "cs.CR" => return "Security & Privacy",
        _ => {}
    }

    if title_lower.contains("language model")
        || title_lower.contains("llm")
        || title_lower.contains("transformer")
    {
        "NLP & Language Models"
    } else if title_lower.contains("diffusion")
        || title_lower.contains("image")
        || title_lower.contains("vision")
        || title_lower.contains("video")
    {
        "Computer Vision"
    } else if title_lower.contains("reinforcement") || title_lower.contains("robot") {
        "Robotics & RL"
    } else if title_lower.contains("agent") || title_lower.contains("tool use") {
        "AI Agents"
    } else if title_lower.contains("safety")
        || title_lower.contains("alignment")
        || title_lower.contains("rlhf")
    {
        "Safety & Alignment"
    } else if title_lower.contains("graph")
        || title_lower.contains("protein")
        || title_lower.contains("molecule")
    {
        "Graph & Science"
    } else {
        "Other"
    }
}

fn build_report(papers: &[PaperSummary], period: &str) -> String {
    let mut by_category: BTreeMap<&str, Vec<&PaperSummary>> = BTreeMap::new();
    for p in papers {
        by_category.entry(categorize(p)).or_default().push(p);
    }

    let mut by_source: BTreeMap<&str, usize> = BTreeMap::new();
    for p in papers {
        *by_source.entry(p.source.as_str()).or_insert(0) += 1;
    }

    let mut md = String::new();
    md.push_str("# Last Week in AI Research\n\n");
    md.push_str(&format!("**Period:** {period}  \n"));
    md.push_str(&format!("**Total papers:** {}  \n\n", papers.len()));

    md.push_str("## Sources\n\n");
    md.push_str("| Source | Papers |\n|--------|-------:|\n");
    for (source, count) in &by_source {
        md.push_str(&format!("| {source} | {count} |\n"));
    }
    md.push('\n');

    md.push_str("## By Category\n\n");
    md.push_str("| Category | Papers |\n|----------|-------:|\n");
    for (cat, papers) in &by_category {
        md.push_str(&format!("| {cat} | {} |\n", papers.len()));
    }
    md.push('\n');

    let cited: Vec<&PaperSummary> = papers
        .iter()
        .filter(|p| p.citation_count.unwrap_or(0) > 0)
        .take(20)
        .collect();
    if !cited.is_empty() {
        md.push_str("## Top Cited\n\n");
        for (i, p) in cited.iter().enumerate() {
            let cites = p.citation_count.unwrap_or(0);
            let authors_str = if p.authors.len() <= 3 {
                p.authors.join(", ")
            } else {
                format!("{} et al.", p.authors[0])
            };
            md.push_str(&format!(
                "{}. **{}** ({} cites)  \n   {} — *{}* | [link]({})  \n\n",
                i + 1,
                p.title,
                cites,
                authors_str,
                p.source,
                p.url(),
            ));
        }
    }

    for (cat, cat_papers) in &by_category {
        md.push_str(&format!("## {cat}\n\n"));
        for p in cat_papers.iter().take(30) {
            let authors_str = if p.authors.len() <= 3 {
                p.authors.join(", ")
            } else {
                format!("{} et al.", p.authors[0])
            };
            let cites = p
                .citation_count
                .map(|c| format!(" ({c} cites)"))
                .unwrap_or_default();
            md.push_str(&format!(
                "- **{}**{} — {}  \n  *{}* {} | [link]({})\n",
                p.title,
                cites,
                authors_str,
                p.source,
                &p.published[..10.min(p.published.len())],
                p.url(),
            ));
        }
        if cat_papers.len() > 30 {
            md.push_str(&format!("\n*...and {} more*\n", cat_papers.len() - 30));
        }
        md.push('\n');
    }

    md
}

// ═══════════════════════════════════════════════════════════════════════════
// Convert PaperSummary → ResearchPaper for LanceDB
// ═══════════════════════════════════════════════════════════════════════════

fn to_research_paper(s: &PaperSummary, week_tag: &str) -> ResearchPaper {
    let paper_source = match s.source.as_str() {
        "arXiv" => PaperSource::Arxiv,
        "Semantic Scholar" => PaperSource::SemanticScholar,
        "OpenAlex" => PaperSource::OpenAlex,
        "Crossref" => PaperSource::Crossref,
        "CORE" => PaperSource::Core,
        _ => PaperSource::Arxiv,
    };

    let url = match paper_source {
        PaperSource::Arxiv => Some(format!("https://arxiv.org/abs/{}", s.source_id)),
        PaperSource::SemanticScholar => Some(format!(
            "https://api.semanticscholar.org/paper/{}",
            s.source_id
        )),
        PaperSource::OpenAlex | PaperSource::Crossref | PaperSource::Core => s
            .doi
            .as_ref()
            .map(|doi| format!("https://doi.org/{doi}"))
            .or_else(|| s.pdf_url.clone()),
        PaperSource::Zenodo => s
            .doi
            .as_ref()
            .map(|doi| format!("https://doi.org/{doi}"))
            .or_else(|| Some(format!("https://zenodo.org/records/{}", s.source_id))),
    };

    let fields_of_study = Some({
        let mut f: Vec<String> = s.categories.clone();
        f.extend(s.categories.iter().map(|c| format!("field:{c}")));
        if !s.primary_category.is_empty() {
            f.push(format!("primary:{}", s.primary_category));
        }
        f.push(week_tag.to_string());
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
}

// ═══════════════════════════════════════════════════════════════════════════
// Source fetchers
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
        if let Some(resp) =
            retry(&label, 2, || {
                client.search_filtered(topic, Some(from_date), 1, 100)
            })
            .await
        {
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
        if let Some(resp) =
            retry(&label, 2, || {
                client.search_filtered(topic, Some(from_date), 100, 0)
            })
            .await
        {
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
    if union == 0 {
        1.0
    } else {
        intersection as f64 / union as f64
    }
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
                    eprintln!(
                        "  {name}: attempt {}/{max_retries} failed ({e}), retrying in {delay:?}...",
                        attempt + 1
                    );
                    tokio::time::sleep(delay).await;
                } else {
                    warn!("{name}: all {max_retries} retries exhausted: {e}");
                }
            }
        }
    }
    None
}

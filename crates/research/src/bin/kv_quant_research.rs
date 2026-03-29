//! Search academic papers on KV-cache quantization for LLM inference.
//!
//! Queries OpenAlex, arXiv, Crossref, and Semantic Scholar in parallel,
//! deduplicates results, and writes a JSON file grouped by 3 sub-topics.

use std::collections::HashSet;

use anyhow::Result;
use futures::future::join_all;
use serde::Serialize;
use tokio::task::JoinHandle;
use tracing::warn;

use research::arxiv::types::{SearchQuery, SortBy, SortOrder};
use research::arxiv::ArxivClient;
use research::crossref::CrossrefClient;
use research::openalex::OpenAlexClient;
use research::paper::{PaperSource, ResearchPaper};
use research::scholar::types::SEARCH_FIELDS;
use research::scholar::SemanticScholarClient;

// ── Output paths ──────────────────────────────────────────────────────────

const RESEARCH_OUTPUT: &str = "research-output/kv-quant/papers.json";
const KNOWLEDGE_OUTPUT: &str =
    "../../apps/knowledge/data/kv-quant-papers.json";

// ── Topic definitions ─────────────────────────────────────────────────────

struct TopicDef {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    queries: &'static [&'static str],
}

const TOPICS: &[TopicDef] = &[
    TopicDef {
        id: "kv-cache-quantization-methods",
        name: "KV Cache Quantization Methods",
        description: "Core algorithms for quantizing key-value caches — vector quantization, non-uniform quantization, and mixed-precision approaches that reduce memory with minimal accuracy loss",
        queries: &[
            "KV cache quantization LLM inference",
            "key value cache compression quantization transformer",
        ],
    },
    TopicDef {
        id: "long-context-kv-compression",
        name: "Long-Context KV Compression",
        description: "Techniques enabling million-token context lengths by compressing or evicting KV entries — sliding-window hybrids, adaptive precision, and entropy coding",
        queries: &[
            "long context KV cache compression memory efficient",
            "sliding window KV cache quantization attention",
        ],
    },
    TopicDef {
        id: "semantic-structured-kv-pruning",
        name: "Semantic & Structured KV Pruning",
        description: "Methods that leverage semantic structure — chunk-level compression, attention-aware token eviction, and PCA-based decorrelation for aggressive yet accurate cache reduction",
        queries: &[
            "KV cache pruning token eviction attention",
            "semantic chunk KV cache compression LLM",
        ],
    },
];

// ── Output types ──────────────────────────────────────────────────────────

#[derive(Serialize)]
struct OutputData {
    generated_at: String,
    blog_post_url: String,
    total_papers: usize,
    topics: Vec<OutputTopic>,
}

#[derive(Serialize)]
struct OutputTopic {
    id: String,
    name: String,
    description: String,
    papers: Vec<OutputPaper>,
}

#[derive(Serialize)]
struct OutputPaper {
    title: String,
    authors: Vec<String>,
    year: Option<u32>,
    citation_count: Option<u64>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    url: Option<String>,
    pdf_url: Option<String>,
    doi: Option<String>,
    source: String,
    source_id: String,
}

impl From<ResearchPaper> for OutputPaper {
    fn from(p: ResearchPaper) -> Self {
        let source_str = match p.source {
            PaperSource::Arxiv => "arXiv",
            PaperSource::SemanticScholar => "Semantic Scholar",
            PaperSource::OpenAlex => "OpenAlex",
            PaperSource::Crossref => "Crossref",
            PaperSource::Core => "CORE",
            PaperSource::Zenodo => "Zenodo",
        };
        Self {
            title: p.title,
            authors: p.authors,
            year: p.year,
            citation_count: p.citation_count,
            abstract_text: p.abstract_text,
            url: p.url,
            pdf_url: p.pdf_url,
            doi: p.doi,
            source: source_str.to_string(),
            source_id: p.source_id,
        }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    dotenvy::dotenv().ok();

    println!("Searching KV-quant papers for {} topics...\n", TOPICS.len());

    let mut output_topics = Vec::new();
    let mut grand_total = 0usize;

    for topic in TOPICS {
        println!("── {} ──", topic.name);

        let mut all_papers: Vec<ResearchPaper> = Vec::new();

        for query in topic.queries {
            let handles: Vec<JoinHandle<Vec<ResearchPaper>>> = vec![
                {
                    let q = query.to_string();
                    tokio::spawn(async move { fetch_openalex(&q).await })
                },
                {
                    let q = query.to_string();
                    tokio::spawn(async move { fetch_arxiv(&q).await })
                },
                {
                    let q = query.to_string();
                    tokio::spawn(async move { fetch_crossref(&q).await })
                },
                {
                    let q = query.to_string();
                    tokio::spawn(async move { fetch_scholar(&q).await })
                },
            ];

            let results = join_all(handles).await;
            for result in results {
                match result {
                    Ok(papers) => all_papers.extend(papers),
                    Err(e) => warn!("Source task panicked: {e}"),
                }
            }
        }

        // Dedup by normalised title
        let mut seen: HashSet<String> = HashSet::new();
        all_papers.retain(|p| {
            let key = dedup_key(&p.title);
            if key.is_empty() {
                return false;
            }
            seen.insert(key)
        });

        // Fuzzy dedup
        let before = all_papers.len();
        let mut deduped: Vec<ResearchPaper> = Vec::with_capacity(all_papers.len());
        for paper in all_papers.drain(..) {
            let dominated = deduped.iter().any(|existing| {
                trigram_similarity(&dedup_key(&existing.title), &dedup_key(&paper.title)) > 0.85
            });
            if !dominated {
                deduped.push(paper);
            }
        }
        all_papers = deduped;
        if before != all_papers.len() {
            println!("  Fuzzy dedup removed {} near-duplicates", before - all_papers.len());
        }

        // Sort by citations descending, take top 15
        all_papers.sort_by(|a, b| {
            b.citation_count
                .unwrap_or(0)
                .cmp(&a.citation_count.unwrap_or(0))
                .then(a.title.cmp(&b.title))
        });
        all_papers.truncate(15);

        println!("  → {} papers\n", all_papers.len());
        grand_total += all_papers.len();

        output_topics.push(OutputTopic {
            id: topic.id.to_string(),
            name: topic.name.to_string(),
            description: topic.description.to_string(),
            papers: all_papers.into_iter().map(OutputPaper::from).collect(),
        });
    }

    let output = OutputData {
        generated_at: chrono::Utc::now().to_rfc3339(),
        blog_post_url: String::new(),
        total_papers: grand_total,
        topics: output_topics,
    };

    let json = serde_json::to_string_pretty(&output)?;

    // Write to research-output
    std::fs::create_dir_all("research-output/kv-quant")?;
    std::fs::write(RESEARCH_OUTPUT, &json)?;
    println!("Wrote {RESEARCH_OUTPUT}");

    // Write to knowledge app data dir
    if let Some(parent) = std::path::Path::new(KNOWLEDGE_OUTPUT).parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(KNOWLEDGE_OUTPUT, &json)?;
    println!("Wrote {KNOWLEDGE_OUTPUT}");

    println!("\nDone! {grand_total} papers across {} topics.", TOPICS.len());

    Ok(())
}

// ── Source fetchers ───────────────────────────────────────────────────────

async fn fetch_openalex(query: &str) -> Vec<ResearchPaper> {
    let client = OpenAlexClient::new(None);
    eprint!("  OpenAlex/{query}...");

    match retry("OpenAlex", 2, || client.search(query, 1, 30)).await {
        Some(resp) => {
            let papers: Vec<ResearchPaper> = resp
                .results
                .into_iter()
                .filter(|w| w.title.as_ref().map(|t| !t.is_empty()).unwrap_or(false))
                .map(ResearchPaper::from)
                .collect();
            eprintln!(" {} papers", papers.len());
            papers
        }
        None => {
            eprintln!(" skipped");
            vec![]
        }
    }
}

async fn fetch_arxiv(query: &str) -> Vec<ResearchPaper> {
    let client = ArxivClient::new();
    eprint!("  arXiv/{query}...");

    let sq = SearchQuery::new()
        .terms(query)
        .sort_by(SortBy::Relevance)
        .sort_order(SortOrder::Descending)
        .max_results(30);

    match retry("arXiv", 2, || client.search_advanced(&sq)).await {
        Some(resp) => {
            let papers: Vec<ResearchPaper> = resp
                .papers
                .into_iter()
                .map(ResearchPaper::from)
                .collect();
            eprintln!(" {} papers", papers.len());
            papers
        }
        None => {
            eprintln!(" skipped");
            vec![]
        }
    }
}

async fn fetch_crossref(query: &str) -> Vec<ResearchPaper> {
    let client = CrossrefClient::new(None);
    eprint!("  Crossref/{query}...");

    match retry("Crossref", 2, || client.search(query, 30, 0)).await {
        Some(resp) => {
            let items = resp
                .message
                .as_ref()
                .and_then(|m| m.items.as_ref())
                .cloned()
                .unwrap_or_default();
            let papers: Vec<ResearchPaper> = items
                .into_iter()
                .map(ResearchPaper::from)
                .filter(|p| !p.title.is_empty())
                .collect();
            eprintln!(" {} papers", papers.len());
            papers
        }
        None => {
            eprintln!(" skipped");
            vec![]
        }
    }
}

async fn fetch_scholar(query: &str) -> Vec<ResearchPaper> {
    let api_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();
    let client = SemanticScholarClient::new(api_key.as_deref());
    eprint!("  S2/{query}...");

    match retry("S2", 2, || {
        client.search_bulk(query, SEARCH_FIELDS, None, None, Some("citationCount:desc"), 30)
    })
    .await
    {
        Some(resp) => {
            let papers: Vec<ResearchPaper> = resp
                .data
                .into_iter()
                .filter(|p| p.title.as_ref().map(|t| !t.is_empty()).unwrap_or(false))
                .map(ResearchPaper::from)
                .collect();
            eprintln!(" {} papers", papers.len());
            papers
        }
        None => {
            eprintln!(" skipped");
            vec![]
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────

fn dedup_key(title: &str) -> String {
    title
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_lowercase()
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

use std::collections::{BTreeMap, HashMap};

use anyhow::Result;
use chrono::{Duration, Utc};
use clap::Parser;
use serde::Serialize;

use research::arxiv::types::{DateRange, SearchQuery, SortBy, SortOrder};
use research::arxiv::ArxivClient;
use research::paper::{PaperSource, ResearchPaper};

const AI_CATEGORIES: &[&str] = &[
    "cs.AI", "cs.CL", "cs.CV", "cs.LG", "cs.MA", "cs.RO", "cs.IR", "cs.SE", "cs.CR", "stat.ML",
];

#[derive(Parser)]
#[command(name = "last-week-papers", about = "Fetch last week's AI research papers from arXiv")]
struct Cli {
    /// Look-back window in days
    #[arg(long, default_value_t = 7)]
    days: u32,

    /// Max papers per category
    #[arg(long, default_value_t = 500)]
    limit: u32,

    /// Output as JSON
    #[arg(long)]
    json: bool,

    /// Also persist to LanceDB
    #[arg(long)]
    store: bool,

    /// LanceDB storage path
    #[arg(long, default_value = "paper-discovery-db")]
    db: String,
}

#[derive(Serialize)]
struct PaperSummary {
    arxiv_id: String,
    title: String,
    authors: Vec<String>,
    published: String,
    categories: Vec<String>,
    primary_category: String,
    pdf_url: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let cli = Cli::parse();

    let now = Utc::now();
    let from = now - Duration::days(cli.days as i64);
    let from_str = from.format("%Y%m%d").to_string();
    let to_str = now.format("%Y%m%d").to_string();
    let dr = DateRange::new(&from_str, &to_str)?;

    println!(
        "Fetching AI papers from {} to {} ({} days)...\n",
        from.format("%Y-%m-%d"),
        now.format("%Y-%m-%d"),
        cli.days,
    );

    let arxiv = ArxivClient::new();

    // arxiv_id -> (PaperSummary, first_category_seen)
    let mut seen: HashMap<String, PaperSummary> = HashMap::new();
    // category -> list of arxiv_ids (preserving order)
    let mut by_category: BTreeMap<String, Vec<String>> = BTreeMap::new();

    for cat in AI_CATEGORIES {
        let query = SearchQuery::new()
            .category_str(cat)?
            .date_range(dr.clone())
            .sort_by(SortBy::SubmittedDate)
            .sort_order(SortOrder::Descending)
            .max_results(100);

        eprint!("  {cat}...");
        let resp = match arxiv.search_all(&query, cli.limit).await {
            Ok(r) => r,
            Err(e) => {
                eprintln!(" error: {e}, skipping");
                continue;
            }
        };
        eprintln!(" {} papers", resp.papers.len());

        let cat_ids = by_category.entry(cat.to_string()).or_default();

        for paper in resp.papers {
            let base = base_arxiv_id(&paper.arxiv_id).to_string();
            cat_ids.push(base.clone());

            seen.entry(base).or_insert_with(|| PaperSummary {
                arxiv_id: paper.arxiv_id.clone(),
                title: paper.title.replace('\n', " ").trim().to_string(),
                authors: paper.authors.clone(),
                published: paper.published[..10.min(paper.published.len())].to_string(),
                categories: paper.categories.clone(),
                primary_category: paper
                    .categories
                    .first()
                    .cloned()
                    .unwrap_or_else(|| cat.to_string()),
                pdf_url: paper.pdf_url.clone(),
            });
        }
    }

    println!();

    if cli.json {
        let papers: Vec<&PaperSummary> = seen.values().collect();
        println!("{}", serde_json::to_string_pretty(&papers)?);
    } else {
        for (cat, ids) in &by_category {
            // Only show papers whose primary category matches, to avoid repeats
            let cat_papers: Vec<&PaperSummary> = ids
                .iter()
                .filter_map(|id| seen.get(id))
                .filter(|p| p.primary_category == *cat)
                .collect();

            if cat_papers.is_empty() {
                continue;
            }

            println!("=== {} ({} papers) ===", cat, cat_papers.len());
            for p in &cat_papers {
                let cats = if p.categories.len() > 1 {
                    format!(" [{}]", p.categories.join(", "))
                } else {
                    String::new()
                };
                let title: String = p.title.chars().take(70).collect();
                println!("  {}  {:<70}  {}{}", p.published, title, p.arxiv_id, cats);
            }
            println!();
        }

        println!(
            "Summary: {} unique papers across {} categories ({} to {})",
            seen.len(),
            by_category.values().filter(|ids| !ids.is_empty()).count(),
            from.format("%Y-%m-%d"),
            now.format("%Y-%m-%d"),
        );
    }

    if cli.store {
        use research::local_embeddings::EmbeddingEngine;
        use research::vector::VectorStore;

        let week_tag = format!("weekly:{}", now.format("%G-W%V"));

        let papers: Vec<ResearchPaper> = seen
            .values()
            .map(|s| ResearchPaper {
                title: s.title.clone(),
                abstract_text: None, // summaries not stored in PaperSummary
                authors: s.authors.clone(),
                year: s.published.get(..4).and_then(|y| y.parse().ok()),
                doi: None,
                citation_count: None,
                url: Some(format!("https://arxiv.org/abs/{}", s.arxiv_id)),
                pdf_url: s.pdf_url.clone(),
                source: PaperSource::Arxiv,
                source_id: s.arxiv_id.clone(),
                fields_of_study: Some({
                    let mut f: Vec<String> =
                        s.categories.iter().map(|c| format!("arxiv:{c}")).collect();
                    f.push(week_tag.clone());
                    f
                }),
            })
            .collect();

        println!("\nStoring {} papers to LanceDB ({})...", papers.len(), cli.db);
        let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
        let store = VectorStore::connect(&cli.db, engine).await?;
        let count = store.add_papers(&papers).await?;
        println!("Indexed {count} papers (tagged: {week_tag})");
    }

    Ok(())
}

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

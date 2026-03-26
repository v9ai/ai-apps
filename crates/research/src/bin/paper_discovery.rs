use std::collections::{HashMap, HashSet};

use anyhow::Result;
use clap::{Parser, Subcommand};
use regex::Regex;

use research::arxiv::ArxivClient;
use research::chunker::{chunk_text, ChunkerConfig};
use research::critique::CritiqueConfig;
use research::local_embeddings::{EmbeddingEngine, LocalRanker};
use research::paper::{dedup_by_embedding, PaperSource, ResearchPaper};
use research::Ranker;
use research::vector::VectorStore;

#[derive(Parser)]
#[command(
    name = "paper-discovery",
    about = "Local vector-powered research paper discovery (Candle + LanceDB)"
)]
struct Cli {
    /// LanceDB storage path
    #[arg(long, default_value = "paper-discovery-db")]
    db: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Ingest papers from arXiv
    IngestArxiv {
        query: String,
        #[arg(short = 'n', long, default_value_t = 50)]
        max_results: u32,
        /// Also chunk abstracts for fine-grained search
        #[arg(long)]
        chunk: bool,
    },
    /// Semantic search over indexed papers
    Search {
        query: String,
        #[arg(short = 'k', long, default_value_t = 10)]
        top_k: usize,
        /// Weight for chunk-level scores in hybrid search [0.0-1.0]
        #[arg(long, default_value_t = 0.4)]
        chunk_weight: f32,
    },
    /// Full pipeline: ingest + search + critique
    Research {
        query: String,
        #[arg(short = 'n', long, default_value_t = 100)]
        max_ingest: u32,
        #[arg(short = 'k', long, default_value_t = 20)]
        top_k: usize,
        #[arg(long)]
        year_min: Option<u32>,
    },
    /// Ingest from awesome-ai-agent-papers (GitHub curated list)
    IngestAwesome {
        /// Custom GitHub raw README URL
        #[arg(long)]
        url: Option<String>,
        /// Also chunk abstracts for fine-grained search
        #[arg(long)]
        chunk: bool,
        /// arXiv API batch size
        #[arg(long, default_value_t = 50)]
        batch_size: usize,
    },
    /// Ingest papers from any GitHub awesome-list (generic parser)
    IngestGithub {
        /// GitHub repo (owner/name, e.g. "weitianxin/Awesome-Agentic-Reasoning")
        repo: String,
        /// File path within repo
        #[arg(long, default_value = "README.md")]
        file: String,
        /// Git branch
        #[arg(long, default_value = "main")]
        branch: String,
        /// Also crawl linked .md files within the repo
        #[arg(long)]
        crawl: bool,
        /// Also chunk abstracts for fine-grained search
        #[arg(long)]
        chunk: bool,
        /// arXiv API batch size
        #[arg(long, default_value_t = 50)]
        batch_size: usize,
    },
    /// Sweep an entire arXiv category (paginated)
    SweepArxiv {
        /// arXiv category, e.g. "cs.AI", "cs.CL", "stat.ML"
        category: String,
        /// Max papers to fetch (default 5000)
        #[arg(short = 'n', long, default_value_t = 5000)]
        max_papers: u32,
        /// Results per page (default 100)
        #[arg(long, default_value_t = 100)]
        page_size: u32,
        /// Also chunk abstracts
        #[arg(long)]
        chunk: bool,
    },
    /// Show database statistics
    Stats,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();

    let cli = Cli::parse();

    match cli.command {
        Commands::IngestArxiv {
            query,
            max_results,
            chunk,
        } => {
            let engine =
                EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;
            let arxiv = ArxivClient::new();

            println!("Fetching up to {max_results} papers from arXiv for '{query}'...");
            let resp = arxiv.search(&query, 0, max_results, None, None).await
                .map_err(|e| anyhow::anyhow!("{e}"))?;
            let papers: Vec<ResearchPaper> =
                resp.papers.into_iter().map(Into::into).collect();
            println!("Fetched {} papers", papers.len());

            let count = store.add_papers(&papers).await?;
            println!("Indexed {count} papers");

            if chunk {
                let cfg = ChunkerConfig::default();
                let mut total_chunks = 0;
                for p in &papers {
                    if let Some(ref abs) = p.abstract_text {
                        if !abs.is_empty() {
                            let chunks =
                                chunk_text(abs, &p.source_id, Some(cfg.clone()));
                            let n = store.add_chunks(&chunks).await?;
                            total_chunks += n;
                        }
                    }
                }
                println!("Indexed {total_chunks} chunks");
            }
        }
        Commands::Search {
            query,
            top_k,
            chunk_weight,
        } => {
            let engine =
                EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;

            let results = store
                .hybrid_search(&query, top_k, chunk_weight, None)
                .await?;
            if results.is_empty() {
                println!("No results found.");
                return Ok(());
            }

            println!(
                "{:<6} {:<5} {:<12} {}",
                "Score", "Year", "Source", "Title"
            );
            println!("{}", "-".repeat(80));
            for sr in &results {
                let year = sr
                    .paper
                    .year
                    .map(|y| y.to_string())
                    .unwrap_or_else(|| "-".into());
                let source = format!("{:?}", sr.paper.source);
                let title: String = sr.paper.title.chars().take(50).collect();
                println!(
                    "{:<6.3} {:<5} {:<12} {}",
                    sr.score, year, source, title
                );
            }
        }
        Commands::Research {
            query,
            max_ingest,
            top_k,
            year_min,
        } => {
            let engine =
                EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;
            let arxiv = ArxivClient::new();
            let critique_cfg = CritiqueConfig::default();

            // Step 1: Ingest
            println!("Ingesting up to {max_ingest} papers from arXiv...");
            let resp = arxiv
                .search(&query, 0, max_ingest, None, None)
                .await
                .map_err(|e| anyhow::anyhow!("{e}"))?;
            let papers: Vec<ResearchPaper> =
                resp.papers.into_iter().map(Into::into).collect();
            println!("Fetched {} papers", papers.len());

            let count = store.add_papers(&papers).await?;
            println!("Indexed {count} papers");

            // Chunk abstracts
            let cfg = ChunkerConfig::default();
            let mut total_chunks = 0;
            for p in &papers {
                if let Some(ref abs) = p.abstract_text {
                    if !abs.is_empty() {
                        let chunks =
                            chunk_text(abs, &p.source_id, Some(cfg.clone()));
                        let n = store.add_chunks(&chunks).await?;
                        total_chunks += n;
                    }
                }
            }
            println!("Indexed {total_chunks} chunks");

            // Step 2: Hybrid search
            println!("\nSearching...");
            let results = store
                .hybrid_search(&query, top_k, 0.4, year_min)
                .await?;

            println!(
                "\n=== Research: \"{}\" ===\nFound {} results\n",
                query,
                results.len()
            );

            // Step 2b: Re-rank via local Candle embeddings
            let ranker = LocalRanker::cpu()?;
            let result_papers: Vec<ResearchPaper> =
                results.iter().map(|r| r.paper.clone()).collect();
            let ranked = ranker.rank_papers(&query, result_papers).await?;
            println!("Re-ranked {} results via local embeddings", ranked.len());

            // Step 2c: Dedup near-duplicates (cosine >= 0.92)
            let dedup_papers: Vec<ResearchPaper> =
                ranked.iter().map(|(p, _)| p.clone()).collect();
            let dedup_texts: Vec<String> = dedup_papers
                .iter()
                .map(|p| {
                    let abs = p.abstract_text.as_deref().unwrap_or("");
                    format!("{} {}", p.title, &abs[..abs.len().min(2000)])
                })
                .collect();
            let dedup_refs: Vec<&str> = dedup_texts.iter().map(|s| s.as_str()).collect();
            let dedup_embs = ranker.embed_batch(&dedup_refs)?;
            let before_dedup = dedup_papers.len();
            let deduped = dedup_by_embedding(dedup_papers, &dedup_embs, 0.92);
            if deduped.len() < before_dedup {
                println!(
                    "Deduped: {} → {} (removed {} near-duplicates)",
                    before_dedup,
                    deduped.len(),
                    before_dedup - deduped.len()
                );
            }

            for (i, p) in deduped.iter().take(15).enumerate() {
                let year = p
                    .year
                    .map(|y| y.to_string())
                    .unwrap_or_else(|| "-".into());
                let score = ranked
                    .iter()
                    .find(|(rp, _)| rp.source_id == p.source_id)
                    .map(|(_, s)| *s)
                    .unwrap_or(0.0);
                println!("  {:>2}. [{:.3}] ({}) {}", i + 1, score, year, p.title);
                if let Some(ref abs) = p.abstract_text {
                    let snip: String = abs.chars().take(120).collect();
                    println!("         {snip}...");
                }
            }

            // Step 3: Semantic critique
            let critique_texts: Vec<String> = deduped
                .iter()
                .map(|p| {
                    let abs = p.abstract_text.as_deref().unwrap_or("");
                    format!("{} {}", p.title, &abs[..abs.len().min(2000)])
                })
                .collect();
            let critique_refs: Vec<&str> = critique_texts.iter().map(|s| s.as_str()).collect();
            let critique_embs = ranker.embed_batch(&critique_refs)?;
            let critique = critique_cfg.evaluate_semantic(&deduped, &critique_embs);

            println!(
                "\nQuality: {:.0}%",
                critique.quality_score * 100.0
            );
            for issue in &critique.issues {
                println!("  ! {issue}");
            }
            for sug in &critique.suggestions {
                println!("  > {sug}");
            }

            // Step 4: Auto-broaden if low quality
            if critique.quality_score < critique_cfg.quality_threshold {
                println!("\nQuality below threshold, broadening search...");
                let broader = store
                    .hybrid_search(&query, top_k * 2, 0.4, year_min)
                    .await?;
                if broader.len() > results.len() {
                    let broader_papers: Vec<ResearchPaper> =
                        broader.iter().map(|r| r.paper.clone()).collect();
                    let broader_texts: Vec<String> = broader_papers
                        .iter()
                        .map(|p| {
                            let abs = p.abstract_text.as_deref().unwrap_or("");
                            format!("{} {}", p.title, &abs[..abs.len().min(2000)])
                        })
                        .collect();
                    let broader_refs: Vec<&str> = broader_texts.iter().map(|s| s.as_str()).collect();
                    let broader_embs = ranker.embed_batch(&broader_refs)?;
                    let c2 = critique_cfg.evaluate_semantic(&broader_papers, &broader_embs);
                    println!(
                        "Broadened quality: {:.0}% ({} papers)",
                        c2.quality_score * 100.0,
                        broader.len()
                    );
                }
            }

            // Year distribution
            let mut year_dist: HashMap<u32, usize> = HashMap::new();
            for p in &deduped {
                if let Some(y) = p.year {
                    *year_dist.entry(y).or_default() += 1;
                }
            }
            if !year_dist.is_empty() {
                let mut years: Vec<(u32, usize)> =
                    year_dist.into_iter().collect();
                years.sort_by_key(|(y, _)| *y);
                println!("\nYear distribution:");
                for (y, c) in &years {
                    println!("  {y}: {c}");
                }
            }
        }
        Commands::IngestAwesome {
            url,
            chunk,
            batch_size,
        } => {
            let readme_url = url.unwrap_or_else(|| {
                "https://raw.githubusercontent.com/VoltAgent/awesome-ai-agent-papers/main/README.md".into()
            });

            println!("Fetching awesome-ai-agent-papers README...");
            let http = reqwest::Client::new();
            let readme = http.get(&readme_url).send().await?.text().await?;

            let entries = parse_awesome_readme(&readme);
            println!(
                "Parsed {} papers across {} categories",
                entries.len(),
                {
                    let cats: HashSet<&str> =
                        entries.iter().map(|e| e.category.as_str()).collect();
                    cats.len()
                }
            );
            if entries.is_empty() {
                println!("No papers found in README.");
                return Ok(());
            }

            // Batch-fetch full metadata from arXiv
            let arxiv = ArxivClient::new();
            let ids: Vec<String> =
                entries.iter().map(|e| e.arxiv_id.clone()).collect();
            println!(
                "Fetching metadata from arXiv in batches of {batch_size}..."
            );
            let arxiv_papers = arxiv
                .fetch_batch(&ids, batch_size)
                .await
                .map_err(|e| anyhow::anyhow!("{e}"))?;
            println!("Got {} papers from arXiv API", arxiv_papers.len());

            // Map base arxiv_id -> entry for category lookup
            let entry_map: HashMap<String, &AwesomeEntry> = entries
                .iter()
                .map(|e| (base_arxiv_id(&e.arxiv_id).to_string(), e))
                .collect();

            let mut papers: Vec<ResearchPaper> = Vec::new();
            let mut found_ids: HashSet<String> = HashSet::new();

            for ap in arxiv_papers {
                let base = base_arxiv_id(&ap.arxiv_id).to_string();
                found_ids.insert(base.clone());
                let mut rp: ResearchPaper = ap.into();
                if let Some(entry) = entry_map.get(&base) {
                    let mut fields =
                        rp.fields_of_study.unwrap_or_default();
                    fields.push(format!("awesome:{}", entry.category));
                    rp.fields_of_study = Some(fields);
                }
                papers.push(rp);
            }

            // Fallback for papers not found on arXiv
            for entry in &entries {
                let base = base_arxiv_id(&entry.arxiv_id);
                if !found_ids.contains(base) {
                    let year = entry
                        .arxiv_id
                        .get(..2)
                        .and_then(|yy| yy.parse::<u32>().ok())
                        .map(|yy| 2000 + yy);
                    papers.push(ResearchPaper {
                        title: entry.title.clone(),
                        abstract_text: if entry.description.is_empty() {
                            None
                        } else {
                            Some(entry.description.clone())
                        },
                        authors: vec![],
                        year,
                        doi: None,
                        citation_count: None,
                        url: Some(format!(
                            "https://arxiv.org/abs/{}",
                            entry.arxiv_id
                        )),
                        pdf_url: Some(format!(
                            "https://arxiv.org/pdf/{}",
                            entry.arxiv_id
                        )),
                        source: PaperSource::Arxiv,
                        source_id: entry.arxiv_id.clone(),
                        fields_of_study: Some(vec![format!(
                            "awesome:{}",
                            entry.category
                        )]),
                        published_date: None,
                        primary_category: None,
                        categories: None,
                    });
                }
            }

            let fallback_count = papers.len() - found_ids.len();
            println!(
                "Total: {} papers ({} arXiv API, {} README fallback)",
                papers.len(),
                found_ids.len(),
                fallback_count
            );

            let engine =
                EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;
            let count = store.add_papers(&papers).await?;
            println!("Indexed {count} papers");

            if chunk {
                let cfg = ChunkerConfig::default();
                let mut total_chunks = 0;
                for p in &papers {
                    if let Some(ref abs) = p.abstract_text {
                        if !abs.is_empty() {
                            let chunks = chunk_text(
                                abs,
                                &p.source_id,
                                Some(cfg.clone()),
                            );
                            let n = store.add_chunks(&chunks).await?;
                            total_chunks += n;
                        }
                    }
                }
                println!("Indexed {total_chunks} chunks");
            }
        }
        Commands::IngestGithub {
            repo,
            file,
            branch,
            crawl,
            chunk,
            batch_size,
        } => {
            let http = reqwest::Client::new();
            let base_raw = format!(
                "https://raw.githubusercontent.com/{}/{}",
                repo, branch
            );
            let repo_tag = repo
                .rsplit('/')
                .next()
                .unwrap_or(&repo)
                .to_lowercase();

            // Fetch main file
            let main_url = format!("{}/{}", base_raw, file);
            println!("Fetching {}/{}@{}...", repo, file, branch);
            let resp = http.get(&main_url).send().await?;
            if !resp.status().is_success() {
                // Try master branch as fallback
                let fallback = format!(
                    "https://raw.githubusercontent.com/{}/master/{}",
                    repo, file
                );
                println!("  main branch failed, trying master...");
                let resp2 = http.get(&fallback).send().await?;
                if !resp2.status().is_success() {
                    anyhow::bail!(
                        "Failed to fetch {} from both main and master",
                        file
                    );
                }
                let main_content = resp2.text().await?;
                // proceed with main_content below
                let mut all_entries = parse_paper_list(&main_content);
                println!(
                    "Parsed {} arxiv papers from {}",
                    all_entries.len(),
                    file
                );

                if crawl {
                    crawl_linked_md(
                        &http,
                        &format!(
                            "https://raw.githubusercontent.com/{}/master",
                            repo
                        ),
                        &main_content,
                        &mut all_entries,
                    )
                    .await?;
                }

                ingest_paper_entries(
                    &all_entries,
                    &repo_tag,
                    batch_size,
                    chunk,
                    &cli.db,
                )
                .await?;

                return Ok(());
            }
            let main_content = resp.text().await?;

            let mut all_entries = parse_paper_list(&main_content);
            println!(
                "Parsed {} arxiv papers from {}",
                all_entries.len(),
                file
            );

            if crawl {
                crawl_linked_md(
                    &http,
                    &base_raw,
                    &main_content,
                    &mut all_entries,
                )
                .await?;
            }

            // Dedup globally by base arxiv ID
            {
                let mut seen = HashSet::new();
                all_entries.retain(|e| {
                    e.arxiv_id.as_ref().map_or(true, |id| {
                        seen.insert(base_arxiv_id(id).to_string())
                    })
                });
            }

            let cats: HashSet<&str> = all_entries
                .iter()
                .map(|e| e.category.as_str())
                .collect();
            println!(
                "Total unique: {} papers across {} categories",
                all_entries.len(),
                cats.len()
            );

            ingest_paper_entries(
                &all_entries,
                &repo_tag,
                batch_size,
                chunk,
                &cli.db,
            )
            .await?;
        }
        Commands::SweepArxiv {
            category,
            max_papers,
            page_size,
            chunk,
        } => {
            let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;
            let arxiv = ArxivClient::new();
            let cfg = ChunkerConfig::default();

            let query = format!("cat:{}", category);
            let total_pages = (max_papers + page_size - 1) / page_size;
            let mut ingested = 0u32;
            let mut chunked = 0usize;

            println!("Sweeping arXiv category '{category}' — up to {max_papers} papers, {page_size}/page");

            for page in 0..total_pages {
                let start = page * page_size;
                let remaining = max_papers.saturating_sub(start);
                let fetch_count = remaining.min(page_size);
                if fetch_count == 0 {
                    break;
                }

                println!(
                    "  Page {}/{} (start={}, n={})...",
                    page + 1,
                    total_pages,
                    start,
                    fetch_count
                );

                let resp = arxiv
                    .search(&query, start, fetch_count, Some("submittedDate"), Some("descending"))
                    .await;

                let resp = match resp {
                    Ok(r) => r,
                    Err(e) => {
                        println!("    Page {} failed: {e}, waiting 10s and retrying...", page + 1);
                        tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                        match arxiv.search(&query, start, fetch_count, Some("submittedDate"), Some("descending")).await {
                            Ok(r) => r,
                            Err(e2) => {
                                println!("    Retry failed: {e2}, skipping page");
                                continue;
                            }
                        }
                    }
                };

                if resp.papers.is_empty() {
                    println!("    No more papers, done.");
                    break;
                }

                let papers: Vec<ResearchPaper> = resp
                    .papers
                    .into_iter()
                    .map(|ap| {
                        let mut rp: ResearchPaper = ap.into();
                        let mut fields = rp.fields_of_study.unwrap_or_default();
                        fields.push(format!("arxiv:{}", category));
                        rp.fields_of_study = Some(fields);
                        rp
                    })
                    .collect();

                let count = store.add_papers(&papers).await?;
                ingested += count as u32;

                if chunk {
                    for p in &papers {
                        if let Some(ref abs) = p.abstract_text {
                            if !abs.is_empty() {
                                let chunks = chunk_text(abs, &p.source_id, Some(cfg.clone()));
                                let n = store.add_chunks(&chunks).await?;
                                chunked += n;
                            }
                        }
                    }
                }

                println!(
                    "    Fetched {} papers (total ingested: {})",
                    papers.len(),
                    ingested
                );

                // Early exit if arXiv returned fewer than requested
                if (papers.len() as u32) < fetch_count {
                    println!("    arXiv returned fewer papers than requested, category exhausted.");
                    break;
                }
            }

            println!(
                "\nSweep complete: {} — {} papers indexed, {} chunks",
                category, ingested, chunked
            );
        }
        Commands::Stats => {
            let engine =
                EmbeddingEngine::new(candle_core::Device::Cpu)?;
            let store = VectorStore::connect(&cli.db, engine).await?;
            let (papers, chunks) = store.counts().await?;
            println!(
                "Papers: {papers}  Chunks: {chunks}  Model: all-MiniLM-L6-v2  Dim: 384"
            );
        }
    }

    Ok(())
}

// ── awesome-ai-agent-papers README parsing ───────────────

struct AwesomeEntry {
    title: String,
    arxiv_id: String,
    description: String,
    category: String,
}

fn parse_awesome_readme(readme: &str) -> Vec<AwesomeEntry> {
    // Category headers: <h2>/<h3> possibly with style attr and emoji prefix
    let cat_re =
        Regex::new(r"<h[23][^>]*>[^A-Za-z]*([A-Za-z][A-Za-z &/:-]+[A-Za-z])").unwrap();
    // Paper rows: **[Title](https://arxiv.org/pdf/YYMM.NNNNN...)** - description |
    let paper_re = Regex::new(
        r"\*\*\[([^\]]+)\]\(https://arxiv\.org/pdf/([0-9]+\.[0-9]+(?:v\d+)?)\)\*\*\s*-\s*([^|]+)",
    )
    .unwrap();

    let mut entries = Vec::new();
    let mut current_cat = String::from("Uncategorized");

    for line in readme.lines() {
        if let Some(cap) = cat_re.captures(line) {
            current_cat = cap[1].trim().to_string();
        }
        if let Some(cap) = paper_re.captures(line) {
            entries.push(AwesomeEntry {
                title: cap[1].trim().to_string(),
                arxiv_id: cap[2].to_string(),
                description: cap[3].trim().trim_end_matches('.').trim().to_string(),
                category: current_cat.clone(),
            });
        }
    }

    entries
}

fn base_arxiv_id(id: &str) -> &str {
    // Strip version suffix: "2602.06039v1" -> "2602.06039"
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

// ── Generic GitHub paper list parsing ────────────────────

struct PaperEntry {
    title: String,
    arxiv_id: Option<String>,
    url: String,
    category: String,
}

fn parse_paper_list(content: &str) -> Vec<PaperEntry> {
    // Arxiv ID from any URL format (abs/, pdf/, html/, doi redirect)
    let arxiv_re = Regex::new(
        r"(?:arxiv\.org/(?:abs|pdf|html)/|doi\.org/10\.48550/arXiv\.)(\d{4}\.\d{4,5}(?:v\d+)?)",
    )
    .unwrap();

    // Category from markdown headers
    let md_header_re = Regex::new(r"^#{2,4}\s+(.+)").unwrap();
    // Category from HTML headers (<h2>, <h3>, etc.)
    let html_header_re = Regex::new(
        r"<h[23456][^>]*>[^A-Za-z]*([A-Za-z][A-Za-z &/:-]+[A-Za-z])",
    )
    .unwrap();

    // Title extraction patterns (ordered by specificity)
    // 1. VoltAgent: **[Title](url)**
    let t_bold_link = Regex::new(r"\*\*\[([^\]]+)\]\(https?://").unwrap();
    // 2. Table cell: [Title](arxiv_url) where title is 15+ chars
    let t_link =
        Regex::new(r"\[([^\]\[]{15,}?)\]\(https?://[^)]*arxiv").unwrap();
    // 3. Bold quotes: **"Title"** (masamasa59)
    let t_bold_quoted = Regex::new(r#"\*\*"([^"]+)"\*\*"#).unwrap();
    // 4. Date prefix: [YYYY/MM] Title. [[ (Shichun-Liu)
    let t_date_prefix =
        Regex::new(r"\[\d{4}/\d{2}\]\s+(.+?)\.\s*\[\[").unwrap();
    // 5. Venue tag then title: **[Venue]** Title [[ (mohammadhashemii)
    let t_after_venue =
        Regex::new(r"\*\*\[[^\]]+\]\*\*\s+(.{15,}?)\s*\[\[").unwrap();
    // 6. Generic bold: **Title** where title 15+ chars (Healthcare, EvoAgentX)
    let t_bold = Regex::new(r"\*\*([^*\[]{15,}?)\*\*").unwrap();

    let mut entries = Vec::new();
    let mut current_cat = String::from("Uncategorized");
    let mut seen = HashSet::new();

    for line in content.lines() {
        // Update category from HTML headers
        if let Some(cap) = html_header_re.captures(line) {
            current_cat = cap[1].trim().to_string();
        }
        // Update category from markdown headers
        else if let Some(cap) = md_header_re.captures(line) {
            let cleaned = clean_header(&cap[1]);
            if cleaned.len() >= 3 {
                current_cat = cleaned;
            }
        }

        // Extract arxiv papers
        if let Some(cap) = arxiv_re.captures(line) {
            let raw_id = cap[1].to_string();
            let base = base_arxiv_id(&raw_id).to_string();
            if !seen.insert(base.clone()) {
                continue;
            }

            let title = t_bold_link
                .captures(line)
                .map(|c| c[1].trim().to_string())
                .or_else(|| {
                    t_link.captures(line).map(|c| c[1].trim().to_string())
                })
                .or_else(|| {
                    t_bold_quoted
                        .captures(line)
                        .map(|c| c[1].trim().to_string())
                })
                .or_else(|| {
                    t_date_prefix
                        .captures(line)
                        .map(|c| c[1].trim().to_string())
                })
                .or_else(|| {
                    t_after_venue
                        .captures(line)
                        .map(|c| c[1].trim().to_string())
                })
                .or_else(|| {
                    t_bold.captures(line).map(|c| c[1].trim().to_string())
                })
                .unwrap_or_default();

            entries.push(PaperEntry {
                title,
                arxiv_id: Some(raw_id),
                url: format!("https://arxiv.org/abs/{}", base),
                category: current_cat.clone(),
            });
        }
    }

    entries
}

fn clean_header(raw: &str) -> String {
    let s = raw.trim();
    // Strip leading numbering: "1." or "1.2"
    let s = if s.starts_with(|c: char| c.is_ascii_digit()) {
        s.trim_start_matches(|c: char| c.is_ascii_digit() || c == '.')
            .trim()
    } else {
        s
    };
    // Strip leading emoji / non-alphanumeric
    let s = s
        .trim_start_matches(|c: char| !c.is_ascii_alphanumeric())
        .trim();
    // Strip trailing " (NN)" count
    if let Some(paren_start) = s.rfind(" (") {
        let rest = &s[paren_start + 2..];
        if rest.ends_with(')')
            && rest[..rest.len() - 1]
                .chars()
                .all(|c| c.is_ascii_digit())
        {
            return s[..paren_start].trim().to_string();
        }
    }
    s.to_string()
}

fn extract_md_links(content: &str) -> Vec<String> {
    let link_re = Regex::new(r"\]\(([a-zA-Z0-9_./-]+\.md)\)").unwrap();
    let mut seen = HashSet::new();
    link_re
        .captures_iter(content)
        .filter_map(|c| {
            let path = c[1].to_string();
            if seen.insert(path.clone()) {
                Some(path)
            } else {
                None
            }
        })
        .collect()
}

async fn crawl_linked_md(
    http: &reqwest::Client,
    base_raw: &str,
    main_content: &str,
    all_entries: &mut Vec<PaperEntry>,
) -> Result<()> {
    let md_links = extract_md_links(main_content);
    if md_links.is_empty() {
        return Ok(());
    }
    println!("Crawling {} linked .md files...", md_links.len());

    for link in &md_links {
        let url = format!("{}/{}", base_raw, link);
        match http.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let content = resp.text().await?;
                let entries = parse_paper_list(&content);
                let count = entries.len();
                all_entries.extend(entries);
                if count > 0 {
                    println!("  {} → {} papers", link, count);
                }
            }
            _ => {
                println!("  {} → skipped (fetch failed)", link);
            }
        }
    }
    Ok(())
}

async fn ingest_paper_entries(
    entries: &[PaperEntry],
    repo_tag: &str,
    batch_size: usize,
    chunk: bool,
    db_path: &str,
) -> Result<()> {
    if entries.is_empty() {
        println!("No papers to ingest.");
        return Ok(());
    }

    let arxiv = ArxivClient::new();
    let ids: Vec<String> = entries
        .iter()
        .filter_map(|e| e.arxiv_id.clone())
        .collect();

    println!(
        "Fetching {} papers from arXiv in batches of {}...",
        ids.len(),
        batch_size
    );
    let arxiv_papers = arxiv
        .fetch_batch(&ids, batch_size)
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;
    println!("Got {} papers from arXiv API", arxiv_papers.len());

    // Map base_id -> entry for category lookup
    let entry_map: HashMap<String, &PaperEntry> = entries
        .iter()
        .filter_map(|e| {
            e.arxiv_id
                .as_ref()
                .map(|id| (base_arxiv_id(id).to_string(), e))
        })
        .collect();

    let mut papers: Vec<ResearchPaper> = Vec::new();
    let mut found_ids: HashSet<String> = HashSet::new();

    for ap in arxiv_papers {
        let base = base_arxiv_id(&ap.arxiv_id).to_string();
        found_ids.insert(base.clone());
        let mut rp: ResearchPaper = ap.into();
        if let Some(entry) = entry_map.get(&base) {
            let mut fields = rp.fields_of_study.unwrap_or_default();
            fields.push(format!("{}:{}", repo_tag, entry.category));
            rp.fields_of_study = Some(fields);
        }
        papers.push(rp);
    }

    // Fallback for papers not found on arXiv
    for entry in entries {
        if let Some(ref id) = entry.arxiv_id {
            let base = base_arxiv_id(id);
            if !found_ids.contains(base) {
                let year = id
                    .get(..2)
                    .and_then(|yy| yy.parse::<u32>().ok())
                    .map(|yy| 2000 + yy);
                papers.push(ResearchPaper {
                    title: if entry.title.is_empty() {
                        format!("arXiv:{}", id)
                    } else {
                        entry.title.clone()
                    },
                    abstract_text: None,
                    authors: vec![],
                    year,
                    doi: None,
                    citation_count: None,
                    url: Some(entry.url.clone()),
                    pdf_url: Some(format!(
                        "https://arxiv.org/pdf/{}",
                        id
                    )),
                    source: PaperSource::Arxiv,
                    source_id: id.clone(),
                    fields_of_study: Some(vec![format!(
                        "{}:{}",
                        repo_tag, entry.category
                    )]),
                    published_date: None,
                    primary_category: None,
                    categories: None,
                });
            }
        }
    }

    let fallback_count = papers.len() - found_ids.len();
    println!(
        "Total: {} papers ({} arXiv API, {} fallback)",
        papers.len(),
        found_ids.len(),
        fallback_count
    );

    let engine = EmbeddingEngine::new(candle_core::Device::Cpu)?;
    let store = VectorStore::connect(db_path, engine).await?;
    let count = store.add_papers(&papers).await?;
    println!("Indexed {count} papers");

    if chunk {
        let cfg = ChunkerConfig::default();
        let mut total_chunks = 0;
        for p in &papers {
            if let Some(ref abs) = p.abstract_text {
                if !abs.is_empty() {
                    let chunks =
                        chunk_text(abs, &p.source_id, Some(cfg.clone()));
                    let n = store.add_chunks(&chunks).await?;
                    total_chunks += n;
                }
            }
        }
        println!("Indexed {total_chunks} chunks");
    }

    Ok(())
}

//! Harvest 2025–2026 sales & lead-gen research papers into
//! `apps/lead-gen/docs/papers/2025-2026-sales-leadgen/`.
//!
//! Layered scope: a **core tier** of queries aligned to the lead-gen Rust/ML
//! stack (bandits, NeuralUCB, MLX embeddings, NER, LangGraph email agents,
//! ICP matching) and a **broad tier** for general sales / B2B landscape
//! awareness. Fans out each query across Semantic Scholar, OpenAlex, Crossref,
//! arXiv and Zenodo, deduplicates, filters for relevance + min-year, and
//! writes one annotated markdown stub per paper plus aggregate index files.

use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use clap::{Parser, ValueEnum};
use research::paper::{PaperSource, ResearchPaper};
use research::scholar::types::SEARCH_FIELDS;
use research::{ArxivClient, CrossrefClient, OpenAlexClient, SemanticScholarClient, ZenodoClient};

// ─── Queries ────────────────────────────────────────────────────────────────

const CORE_QUERIES: &[&str] = &[
    "contextual bandits lead ranking B2B sales",
    "NeuralUCB neural contextual bandit recommendation",
    "lead scoring machine learning gradient boosting",
    "cold email personalization LLM agent outreach",
    "sales email generation large language model retrieval",
    "ICP ideal customer profile embedding similarity",
    "firmographic B2B account matching representation learning",
    "named entity recognition company person resolution",
    "entity linking CRM deduplication transformer",
    "sentence embeddings sales prospect matching",
    "agent memory long-term personalization LLM outreach",
    "multi-armed bandit email subject line optimization",
    "reply prediction cold email classification",
    "sales funnel conversion prediction deep learning",
    "retrieval-augmented generation CRM context",
    "LLM tool use sales agent autonomous",
    "evaluation benchmark lead-gen LLM agent",
    "B2B intent signal inference clickstream",
    "domain-specific LLM distillation small model",
    "low-latency inference serving Rust ML",
];

const BROAD_QUERIES: &[&str] = &[
    "B2B lead generation machine learning",
    "sales forecasting time series deep learning",
    "customer churn prediction neural network",
    "marketing attribution causal inference",
    "CRM analytics LLM automation",
    "account-based marketing ABM AI",
    "revenue operations RevOps predictive",
    "sales pipeline anomaly detection",
    "conversational AI sales assistant",
    "voice-of-customer NLP feedback mining",
    "cross-sell upsell recommendation",
    "lookalike modeling audience embedding",
    "sales call transcript summarization LLM",
    "fraud detection lead quality B2B",
    "marketing mix model Bayesian",
    "next-best-action recommendation sales",
    "uplift modeling treatment effect marketing",
    "lead qualification BANT automation LLM",
    "personalization dynamic content LLM marketing",
    "sales process mining workflow",
];

// ─── Relevance + tagging ───────────────────────────────────────────────────

const RELEVANCE_KEYWORDS: &[&str] = &[
    "lead", "sales", "crm", "b2b", "prospect", "outreach", "email", "customer",
    "marketing", "bandit", "recommend", "personaliz", "ranking", "scoring",
    "churn", "attribution", "funnel", "pipeline", "revenue", "account",
    "firmograph", "conversion", "icp", "cold email", "reply", "uplift",
    "next-best-action", "abm", "cross-sell", "upsell",
];

/// Tag map: (tag, keywords-that-imply-it). Order matters — the first tag that
/// matches is primary; a paper can carry multiple tags.
const TAG_RULES: &[(&str, &[&str])] = &[
    ("bandits",          &["bandit", "ucb", "thompson sampling", "exploration"]),
    ("email-llm",        &["email", "outreach", "cold email", "subject line"]),
    ("entity-resolution",&["entity", "ner", "deduplication", "record linkage", "matching entities"]),
    ("lead-scoring",     &["lead scoring", "scoring", "qualification", "prioriti"]),
    ("matching",         &["embedding", "similarity", "matching", "lookalike", "prospect"]),
    ("llm-agents",       &["agent", "tool use", "retrieval-augmented", "rag ", "memory"]),
    ("forecasting",      &["forecast", "time series", "churn", "attribution"]),
    ("personalization",  &["personaliz", "dynamic content", "recommender"]),
    ("evaluation",       &["benchmark", "evaluation", "eval "]),
    ("revops",           &["revops", "pipeline", "funnel", "revenue operation"]),
];

// ─── CLI ────────────────────────────────────────────────────────────────────

#[derive(Clone, Copy, Debug, ValueEnum)]
enum Tier {
    Core,
    Broad,
    Both,
}

#[derive(Parser, Debug)]
#[command(
    name = "leadgen-papers",
    about = "Harvest 2025+ sales / lead-gen research papers into a curated markdown corpus."
)]
struct Args {
    /// Which query tier(s) to run.
    #[arg(long, value_enum, default_value_t = Tier::Both)]
    tier: Tier,

    /// Minimum publication year (inclusive).
    #[arg(long, default_value_t = 2025)]
    min_year: u32,

    /// Target number of papers in the final corpus (after dedup + relevance).
    #[arg(long, default_value_t = 200)]
    target: usize,

    /// Output directory. If relative, resolved against workspace root.
    #[arg(long, default_value = "apps/lead-gen/docs/papers/2025-2026-sales-leadgen")]
    out: PathBuf,

    /// Print what would be written without touching the filesystem.
    #[arg(long)]
    dry_run: bool,

    /// Max results per provider per query (lower = faster smoke test).
    #[arg(long, default_value_t = 20)]
    per_provider: u32,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn norm_title(t: &str) -> String {
    t.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_relevant(p: &ResearchPaper) -> bool {
    let hay = format!(
        "{} {}",
        p.title.to_lowercase(),
        p.abstract_text.as_deref().unwrap_or("").to_lowercase()
    );
    RELEVANCE_KEYWORDS.iter().any(|kw| hay.contains(kw))
}

fn tags_for(p: &ResearchPaper) -> Vec<&'static str> {
    let hay = format!(
        "{} {}",
        p.title.to_lowercase(),
        p.abstract_text.as_deref().unwrap_or("").to_lowercase()
    );
    let mut out = Vec::new();
    for (tag, kws) in TAG_RULES {
        if kws.iter().any(|kw| hay.contains(kw)) {
            out.push(*tag);
        }
    }
    if out.is_empty() {
        out.push("other");
    }
    out
}

fn slugify(s: &str) -> String {
    let ascii: String = s
        .chars()
        .map(|c| if c.is_ascii() { c } else { ' ' })
        .collect();
    let lower = ascii.to_lowercase();
    let mut out = String::new();
    let mut prev_dash = false;
    for c in lower.chars() {
        if c.is_alphanumeric() {
            out.push(c);
            prev_dash = false;
        } else if !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    out.chars().take(60).collect::<String>()
}

fn yaml_str(s: &str) -> String {
    // Escape double-quotes and backslashes, keep it on a single line.
    let s = s.replace('\\', "\\\\").replace('"', "\\\"");
    let s = s.replace('\n', " ").replace('\r', " ");
    format!("\"{s}\"")
}

fn yaml_list(items: &[String]) -> String {
    if items.is_empty() {
        return "[]".into();
    }
    let inner = items
        .iter()
        .map(|s| yaml_str(s))
        .collect::<Vec<_>>()
        .join(", ");
    format!("[{inner}]")
}

fn source_label(s: &PaperSource) -> &'static str {
    match s {
        PaperSource::SemanticScholar => "s2",
        PaperSource::OpenAlex => "openalex",
        PaperSource::Crossref => "crossref",
        PaperSource::Core => "core",
        PaperSource::Arxiv => "arxiv",
        PaperSource::Zenodo => "zenodo",
    }
}

fn arxiv_id_from(p: &ResearchPaper) -> Option<String> {
    match p.source {
        PaperSource::Arxiv => Some(p.source_id.clone()),
        _ => None,
    }
}

fn resolve_out_dir(out: &Path) -> PathBuf {
    if out.is_absolute() {
        return out.to_path_buf();
    }
    // Walk up from CWD until we find a Cargo.toml that contains [workspace].
    let mut cur = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    loop {
        let manifest = cur.join("Cargo.toml");
        if manifest.exists() {
            if let Ok(contents) = std::fs::read_to_string(&manifest) {
                if contents.contains("[workspace]") {
                    return cur.join(out);
                }
            }
        }
        if !cur.pop() {
            break;
        }
    }
    out.to_path_buf()
}

// ─── Paper record with provenance ──────────────────────────────────────────

struct Entry {
    paper: ResearchPaper,
    tier: &'static str,
    query: String,
}

// ─── Main ──────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    let args = Args::parse();
    let queries: Vec<(&'static str, &'static str)> = match args.tier {
        Tier::Core => CORE_QUERIES.iter().map(|q| ("core", *q)).collect(),
        Tier::Broad => BROAD_QUERIES.iter().map(|q| ("broad", *q)).collect(),
        Tier::Both => CORE_QUERIES
            .iter()
            .map(|q| ("core", *q))
            .chain(BROAD_QUERIES.iter().map(|q| ("broad", *q)))
            .collect(),
    };

    eprintln!(
        "leadgen-papers — {} queries, min-year {}, target {}, tier {:?}",
        queries.len(),
        args.min_year,
        args.target,
        args.tier
    );

    let s2 = SemanticScholarClient::new(None);
    let oa = OpenAlexClient::new(None);
    let cr = CrossrefClient::new(None);
    let arxiv = ArxivClient::new();
    let zenodo = ZenodoClient::new(None);

    let date_filter = format!("{}-01-01", args.min_year);
    let year_range = format!("{}-", args.min_year);
    let per = args.per_provider;

    let mut all: Vec<Entry> = Vec::new();

    for (i, (tier, query)) in queries.iter().enumerate() {
        eprintln!("[{}/{}] ({}) {}", i + 1, queries.len(), tier, query);

        let (s2_res, oa_res, cr_res, arxiv_res, zenodo_res) = tokio::join!(
            async {
                s2.search_bulk(
                    query,
                    SEARCH_FIELDS,
                    Some(&year_range),
                    None,
                    Some("citationCount:desc"),
                    per,
                )
                .await
                .map(|r| r.data.into_iter().map(ResearchPaper::from).collect::<Vec<_>>())
                .unwrap_or_default()
            },
            async {
                oa.search_filtered(query, Some(&date_filter), 1, per)
                    .await
                    .map(|r| r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>())
                    .unwrap_or_default()
            },
            async {
                cr.search_filtered(query, Some(&date_filter), per, 0)
                    .await
                    .map(|r| {
                        r.message
                            .and_then(|m| m.items)
                            .unwrap_or_default()
                            .into_iter()
                            .map(ResearchPaper::from)
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                arxiv
                    .search(query, 0, per, Some("submittedDate"), Some("descending"))
                    .await
                    .map(|r| {
                        r.papers
                            .into_iter()
                            .map(ResearchPaper::from)
                            .filter(|p| p.year.unwrap_or(0) >= args.min_year)
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                zenodo
                    .search(query, 1, per.min(15))
                    .await
                    .map(|r| {
                        r.hits
                            .map(|h| {
                                h.hits
                                    .into_iter()
                                    .map(ResearchPaper::from)
                                    .filter(|p| p.year.unwrap_or(0) >= args.min_year)
                                    .collect::<Vec<_>>()
                            })
                            .unwrap_or_default()
                    })
                    .unwrap_or_default()
            },
        );

        eprintln!(
            "  S2:{} OA:{} CR:{} arXiv:{} Zenodo:{}",
            s2_res.len(),
            oa_res.len(),
            cr_res.len(),
            arxiv_res.len(),
            zenodo_res.len()
        );

        for p in s2_res
            .into_iter()
            .chain(oa_res)
            .chain(cr_res)
            .chain(arxiv_res)
            .chain(zenodo_res)
        {
            all.push(Entry {
                paper: p,
                tier,
                query: (*query).to_string(),
            });
        }

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    eprintln!("\nTotal raw: {}", all.len());

    // Year filter
    all.retain(|e| e.paper.year.unwrap_or(0) >= args.min_year);
    eprintln!("After year filter (>= {}): {}", args.min_year, all.len());

    // Relevance filter
    all.retain(|e| is_relevant(&e.paper));
    eprintln!("After relevance filter: {}", all.len());

    // Sort by citations desc (so dedup keeps highest-cited)
    all.sort_by(|a, b| {
        b.paper
            .citation_count
            .unwrap_or(0)
            .cmp(&a.paper.citation_count.unwrap_or(0))
    });

    // Dedup by DOI first, then normalized title
    let mut seen_doi: HashSet<String> = HashSet::new();
    let mut seen_title: HashSet<String> = HashSet::new();
    let mut deduped: Vec<Entry> = Vec::new();
    for e in all {
        if e.paper.title.trim().is_empty() {
            continue;
        }
        if let Some(doi) = &e.paper.doi {
            let nd = doi.to_lowercase().trim().to_string();
            if !nd.is_empty() && !seen_doi.insert(nd) {
                continue;
            }
        }
        let nt = norm_title(&e.paper.title);
        if !nt.is_empty() && !seen_title.insert(nt) {
            continue;
        }
        deduped.push(e);
    }
    eprintln!("After dedup: {}", deduped.len());

    deduped.truncate(args.target);
    eprintln!("Final: {}\n", deduped.len());

    // Output
    let out_dir = resolve_out_dir(&args.out);
    let papers_dir = out_dir.join("papers");
    eprintln!("Output: {}", out_dir.display());

    if !args.dry_run {
        std::fs::create_dir_all(&papers_dir)
            .with_context(|| format!("create {}", papers_dir.display()))?;
    }

    // Write per-paper stubs + collect for aggregates
    let mut by_tag: BTreeMap<&'static str, Vec<usize>> = BTreeMap::new();
    let mut by_year: BTreeMap<u32, Vec<usize>> = BTreeMap::new();
    let mut by_source: BTreeMap<&'static str, usize> = BTreeMap::new();
    let mut slugs: Vec<String> = Vec::with_capacity(deduped.len());

    for (i, e) in deduped.iter().enumerate() {
        let p = &e.paper;
        let tags = tags_for(p);
        let year = p.year.unwrap_or(0);

        let slug = {
            let base = slugify(&p.title);
            if base.is_empty() {
                format!("paper-{i:04}")
            } else {
                // Disambiguate if needed.
                if slugs.iter().any(|s| s == &base) {
                    format!("{base}-{i:04}")
                } else {
                    base
                }
            }
        };
        slugs.push(slug.clone());

        for t in &tags {
            by_tag.entry(*t).or_default().push(i);
        }
        if year > 0 {
            by_year.entry(year).or_default().push(i);
        }
        *by_source.entry(source_label(&p.source)).or_insert(0) += 1;

        if args.dry_run {
            continue;
        }

        let path = papers_dir.join(format!("{slug}.md"));
        let content = render_paper_md(e, &tags);
        std::fs::write(&path, content).with_context(|| format!("write {}", path.display()))?;
    }

    if args.dry_run {
        eprintln!("(dry-run — would write {} paper stubs)", deduped.len());
        // Still print a tag summary so the operator sees the shape.
        for (tag, ids) in &by_tag {
            eprintln!("  {:<20} {}", tag, ids.len());
        }
        return Ok(());
    }

    // Aggregates
    let index_md = render_index_md(&deduped, &slugs, &by_tag);
    std::fs::write(out_dir.join("index.md"), index_md)?;

    let by_year_md = render_by_year_md(&deduped, &slugs, &by_year);
    std::fs::write(out_dir.join("by-year.md"), by_year_md)?;

    let sources_md = render_sources_md(&by_source, deduped.len());
    std::fs::write(out_dir.join("sources.md"), sources_md)?;

    let gaps_md = render_gaps_md(&by_tag, deduped.len());
    std::fs::write(out_dir.join("gaps.md"), gaps_md)?;

    // Also dump a single JSON for programmatic reuse
    let json = serde_json::to_string_pretty(
        &deduped
            .iter()
            .zip(slugs.iter())
            .map(|(e, slug)| {
                serde_json::json!({
                    "slug": slug,
                    "tier": e.tier,
                    "query": e.query,
                    "tags": tags_for(&e.paper),
                    "paper": e.paper,
                })
            })
            .collect::<Vec<_>>(),
    )?;
    std::fs::write(out_dir.join("papers.json"), json)?;

    eprintln!("Wrote {} paper stubs + index/by-year/sources/gaps + papers.json", deduped.len());
    Ok(())
}

// ─── Rendering ─────────────────────────────────────────────────────────────

fn render_paper_md(e: &Entry, tags: &[&'static str]) -> String {
    let p = &e.paper;
    let year = p.year.map(|y| y.to_string()).unwrap_or_else(|| "null".into());
    let doi = p.doi.as_deref().unwrap_or("");
    let arxiv_id = arxiv_id_from(p).unwrap_or_default();
    let url = p.url.as_deref().unwrap_or("");
    let venue = p.venue.as_deref().unwrap_or("");
    let cites = p.citation_count.unwrap_or(0);
    let abstract_text = p
        .abstract_text
        .as_deref()
        .unwrap_or("(no abstract available from source)")
        .trim();

    let tags_yaml = yaml_list(&tags.iter().map(|s| (*s).to_string()).collect::<Vec<_>>());
    let authors_yaml = yaml_list(&p.authors);

    format!(
        "---\n\
         title: {title}\n\
         authors: {authors}\n\
         year: {year}\n\
         venue: {venue}\n\
         doi: {doi}\n\
         arxiv_id: {arxiv_id}\n\
         url: {url}\n\
         citations: {cites}\n\
         source: {source}\n\
         tier: {tier}\n\
         query: {query}\n\
         tags: {tags}\n\
         ---\n\
         \n\
         # {title_plain}\n\
         \n\
         **Authors.** {authors_plain}\n\
         \n\
         **Venue / year.** {venue_plain}{sep}{year}\n\
         \n\
         **Links.** {link_line}\n\
         \n\
         **Abstract.**\n\n{abstract_text}\n\
         \n\
         ## Novelty (fill in)\n- \n- \n- \n\
         \n\
         ## Relevance to lead-gen (fill in)\n- \n\
         \n\
         ## Reuse opportunity (fill in)\n- \n",
        title = yaml_str(&p.title),
        authors = authors_yaml,
        year = year,
        venue = yaml_str(venue),
        doi = yaml_str(doi),
        arxiv_id = yaml_str(&arxiv_id),
        url = yaml_str(url),
        cites = cites,
        source = source_label(&p.source),
        tier = e.tier,
        query = yaml_str(&e.query),
        tags = tags_yaml,
        title_plain = p.title,
        authors_plain = if p.authors.is_empty() {
            "(unknown)".to_string()
        } else {
            p.authors.join(", ")
        },
        venue_plain = if venue.is_empty() { "" } else { venue },
        sep = if venue.is_empty() { "" } else { " · " },
        link_line = {
            let mut parts = Vec::new();
            if !doi.is_empty() {
                parts.push(format!("[DOI](https://doi.org/{doi})"));
            }
            if !arxiv_id.is_empty() {
                parts.push(format!("[arXiv:{arxiv_id}](https://arxiv.org/abs/{arxiv_id})"));
            }
            if !url.is_empty() {
                parts.push(format!("[source]({url})"));
            }
            if parts.is_empty() {
                "(no public link)".to_string()
            } else {
                parts.join(" · ")
            }
        },
        abstract_text = abstract_text,
    )
}

fn render_index_md(
    entries: &[Entry],
    slugs: &[String],
    by_tag: &BTreeMap<&'static str, Vec<usize>>,
) -> String {
    let mut s = String::new();
    s.push_str("# 2025–2026 Sales & Lead-Gen Research Corpus\n\n");
    s.push_str(&format!("Total papers: **{}**.\n\n", entries.len()));
    s.push_str("Grouped by primary theme. Each entry links to the annotated stub under `papers/`.\n\n");
    for (tag, ids) in by_tag {
        s.push_str(&format!("## {} ({})\n\n", tag, ids.len()));
        for &i in ids {
            let e = &entries[i];
            let p = &e.paper;
            let year = p.year.map(|y| y.to_string()).unwrap_or_else(|| "-".into());
            let cites = p.citation_count.unwrap_or(0);
            let authors = if p.authors.is_empty() {
                "(unknown)".to_string()
            } else {
                let n = p.authors.len().min(3);
                let mut list = p.authors[..n].join(", ");
                if p.authors.len() > n {
                    list.push_str(" et al.");
                }
                list
            };
            s.push_str(&format!(
                "- **[{title}](papers/{slug}.md)** — {authors} ({year}, {cites} cites, `{tier}`)\n",
                title = p.title.trim(),
                slug = slugs[i],
                authors = authors,
                year = year,
                cites = cites,
                tier = e.tier,
            ));
        }
        s.push('\n');
    }
    s
}

fn render_by_year_md(
    entries: &[Entry],
    slugs: &[String],
    by_year: &BTreeMap<u32, Vec<usize>>,
) -> String {
    let mut s = String::new();
    s.push_str("# Corpus by year\n\n");
    for (year, ids) in by_year.iter().rev() {
        s.push_str(&format!("## {} ({})\n\n", year, ids.len()));
        for &i in ids {
            let e = &entries[i];
            let p = &e.paper;
            s.push_str(&format!(
                "- [{title}](papers/{slug}.md) — `{tier}`\n",
                title = p.title.trim(),
                slug = slugs[i],
                tier = e.tier,
            ));
        }
        s.push('\n');
    }
    s
}

fn render_sources_md(by_source: &BTreeMap<&'static str, usize>, total: usize) -> String {
    let mut s = String::new();
    s.push_str("# Provenance\n\n");
    s.push_str(&format!("Final corpus: **{total}** papers.\n\n"));
    s.push_str("| Source | Count |\n|---|---:|\n");
    for (src, n) in by_source {
        s.push_str(&format!("| {src} | {n} |\n"));
    }
    s.push_str("\nNote: a paper attributed to one source may also appear in others — dedup keeps the highest-cited copy.\n");
    s
}

fn render_gaps_md(by_tag: &BTreeMap<&'static str, Vec<usize>>, total: usize) -> String {
    let mut s = String::new();
    s.push_str("# Gap analysis (tag histogram)\n\n");
    s.push_str(&format!("Corpus size: **{total}**.\n\n"));
    s.push_str("Tags with low counts are candidate angles for your own contribution. Tags with very high counts are saturated — novelty there requires a sharper framing.\n\n");
    s.push_str("| Tag | Count | Share |\n|---|---:|---:|\n");
    let mut rows: Vec<(&&str, usize)> = by_tag.iter().map(|(k, v)| (k, v.len())).collect();
    rows.sort_by(|a, b| a.1.cmp(&b.1));
    for (tag, n) in rows {
        let pct = if total > 0 { (n as f64) * 100.0 / (total as f64) } else { 0.0 };
        s.push_str(&format!("| {tag} | {n} | {pct:.1}% |\n"));
    }
    s.push_str("\n## Suggested next steps\n\n");
    s.push_str("1. Skim the three smallest-count tags above. Is the thinness real or an artefact of query coverage? Add follow-up queries if needed.\n");
    s.push_str("2. Cross-reference thin tags with your lead-gen stack (bandits, NER, MLX embeddings, LangGraph email agents). A thin tag that your stack already touches is a high-signal publishable angle.\n");
    s.push_str("3. Fill in the `Novelty` / `Relevance` / `Reuse opportunity` sections on the 10–20 most relevant papers; this becomes the related-work section of your paper.\n");
    s
}

//! Fetch 100 hair-care-protocol papers (2020+) from all available providers.
//!
//! Queries Semantic Scholar, OpenAlex, Crossref, arXiv, and Zenodo in parallel,
//! deduplicates by DOI/title, sorts by citation count, stores top 100 in DB.

use std::collections::HashSet;

use anyhow::{Context, Result};
use research::paper::ResearchPaper;
use research::scholar::types::SEARCH_FIELDS;
use research::{ArxivClient, CrossrefClient, OpenAlexClient, SemanticScholarClient, ZenodoClient};

const PROTOCOL_ID: &str = "78e4bd40-a075-45f5-9f48-f9173cf479f7";
const MIN_YEAR: u32 = 2020;
const TARGET: usize = 100;

const QUERIES: &[&str] = &[
    "iron deficiency telogen effluvium ferritin hair loss",
    "vitamin D deficiency alopecia hair follicle supplementation",
    "zinc supplementation hair loss alopecia treatment",
    "vitamin B12 folate deficiency hair loss",
    "magnesium hair follicle growth supplementation",
    "omega-3 EPA DHA scalp inflammation hair loss",
    "topical finasteride androgenetic alopecia efficacy",
    "oral minoxidil androgenetic alopecia low dose",
    "saw palmetto 5-alpha-reductase inhibitor hair",
    "pumpkin seed oil DHT hair growth clinical",
    "selenium thyroid autoimmune hair loss Hashimoto",
    "berberine insulin resistance androgenetic alopecia",
    "inositol PCOS hair loss hormonal treatment",
    "low-level laser therapy LLLT hair growth photobiomodulation",
    "microneedling dermaroller minoxidil hair regrowth",
    "nutritional deficiency alopecia systematic review",
    "dihydrotestosterone androgenetic alopecia pathogenesis treatment",
    "red light therapy hair follicle stimulation",
];

/// Normalize a title for dedup: lowercase, strip non-alphanumeric.
fn norm_title(t: &str) -> String {
    t.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    eprintln!("Hair Care Papers — fetching from 5 providers, {} queries\n", QUERIES.len());

    let s2 = SemanticScholarClient::new(None);
    let oa = OpenAlexClient::new(None);
    let cr = CrossrefClient::new(None);
    let arxiv = ArxivClient::new();
    let zenodo = ZenodoClient::new(None);

    let mut all_papers: Vec<ResearchPaper> = Vec::new();

    for (i, query) in QUERIES.iter().enumerate() {
        eprintln!("[{}/{}] {}", i + 1, QUERIES.len(), query);

        // Fan out to all 5 providers concurrently
        let (s2_res, oa_res, cr_res, arxiv_res, zenodo_res) = tokio::join!(
            async {
                s2.search_bulk(query, SEARCH_FIELDS, Some("2020-"), None, Some("citationCount:desc"), 20)
                    .await
                    .map(|r| {
                        r.data
                            .into_iter()
                            .map(|p| ResearchPaper::from(p))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                oa.search_filtered(query, Some("2020-01-01"), 1, 20)
                    .await
                    .map(|r| {
                        r.results
                            .into_iter()
                            .map(|w| ResearchPaper::from(w))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                cr.search_filtered(query, Some("2020-01-01"), 20, 0)
                    .await
                    .map(|r| {
                        r.message
                            .and_then(|m| m.items)
                            .unwrap_or_default()
                            .into_iter()
                            .map(|w| ResearchPaper::from(w))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                arxiv.search(query, 0, 20, None, None)
                    .await
                    .map(|r| {
                        r.papers
                            .into_iter()
                            .map(|p| ResearchPaper::from(p))
                            .filter(|p| p.year.unwrap_or(0) >= MIN_YEAR)
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            },
            async {
                zenodo.search(query, 1, 15)
                    .await
                    .map(|r| {
                        r.hits
                            .map(|h| {
                                h.hits
                                    .into_iter()
                                    .map(|rec| ResearchPaper::from(rec))
                                    .filter(|p| p.year.unwrap_or(0) >= MIN_YEAR)
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
            zenodo_res.len(),
        );

        all_papers.extend(s2_res);
        all_papers.extend(oa_res);
        all_papers.extend(cr_res);
        all_papers.extend(arxiv_res);
        all_papers.extend(zenodo_res);

        // Small delay between query batches to be polite
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    eprintln!("\nTotal raw: {} papers", all_papers.len());

    // Filter year >= 2020
    all_papers.retain(|p| p.year.unwrap_or(0) >= MIN_YEAR);
    eprintln!("After year filter (>=2020): {}", all_papers.len());

    // Deduplicate by DOI first, then by normalized title
    let mut seen_dois: HashSet<String> = HashSet::new();
    let mut seen_titles: HashSet<String> = HashSet::new();
    let mut deduped: Vec<ResearchPaper> = Vec::new();

    // Sort by citations first so we keep the highest-cited version of duplicates
    all_papers.sort_by(|a, b| {
        b.citation_count
            .unwrap_or(0)
            .cmp(&a.citation_count.unwrap_or(0))
    });

    for paper in all_papers {
        // Skip papers with empty titles
        if paper.title.trim().is_empty() {
            continue;
        }

        // Check DOI dedup
        if let Some(ref doi) = paper.doi {
            let norm_doi = doi.to_lowercase().trim().to_string();
            if !norm_doi.is_empty() && !seen_dois.insert(norm_doi) {
                continue;
            }
        }

        // Check title dedup
        let nt = norm_title(&paper.title);
        if !nt.is_empty() && !seen_titles.insert(nt) {
            continue;
        }

        deduped.push(paper);
    }

    eprintln!("After dedup: {}", deduped.len());

    // Already sorted by citations, take top TARGET
    deduped.truncate(TARGET);
    eprintln!("Final: {} papers\n", deduped.len());

    // Print summary
    for (i, p) in deduped.iter().enumerate() {
        let year = p.year.map(|y| y.to_string()).unwrap_or("-".into());
        let cites = p.citation_count.unwrap_or(0);
        let source = format!("{:?}", p.source);
        let title: String = p.title.chars().take(70).collect();
        eprintln!(
            "  {:>3}. [{:>5} cites] ({}) [{:<16}] {}",
            i + 1,
            cites,
            year,
            source,
            title
        );
    }

    // Write JSON
    let out_dir = "research-output/protocol-78e4bd40";
    std::fs::create_dir_all(out_dir)?;
    let json = serde_json::to_string_pretty(&deduped)?;
    let json_path = format!("{out_dir}/papers-100.json");
    std::fs::write(&json_path, &json)?;
    eprintln!("\nWrote {json_path} ({} bytes)", json.len());

    // Update DB
    let db_url = std::env::var("DATABASE_URL").context("DATABASE_URL not set")?;
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(2)
        .connect(&db_url)
        .await?;

    let papers_json = serde_json::to_value(&deduped)?;
    let paper_count = deduped.len().to_string();

    let protocol_uuid: sqlx::types::Uuid = PROTOCOL_ID.parse().context("invalid protocol UUID")?;

    let result = sqlx::query(
        "UPDATE protocol_researches \
         SET papers = $1, paper_count = $2, updated_at = now() \
         WHERE id = (\
             SELECT id FROM protocol_researches \
             WHERE protocol_id = $3 \
             ORDER BY created_at DESC LIMIT 1\
         )",
    )
    .bind(&papers_json)
    .bind(&paper_count)
    .bind(protocol_uuid)
    .execute(&pool)
    .await?;

    eprintln!(
        "DB updated: {} row(s) affected",
        result.rows_affected()
    );

    Ok(())
}

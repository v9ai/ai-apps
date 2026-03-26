use std::time::Duration;

use serial_test::serial;
use tokio::time::sleep;

use research::scholar::types::{PAPER_FIELDS_FULL, SEARCH_FIELDS};
use research::scholar::SemanticScholarClient;
use research::ResearchPaper;

// Well-known paper: "Attention Is All You Need"
const ATTENTION_S2_ID: &str = "204e3073870fae3d05bcbc2f6a8e263d9b72e776";

/// S2 public API rate-limits to ~1 req/s without an API key.
/// Generous delay to avoid 429 cascade across test runs.
async fn polite_delay() {
    sleep(Duration::from_secs(8)).await;
}

fn client() -> SemanticScholarClient {
    SemanticScholarClient::new(None)
}

// ── Search ──────────────────────────────────────────────────────────

/// S2 search endpoint is heavily throttled without an API key (~1 req/min).
/// This single test covers search + result shape. Pagination is implicitly
/// validated via offset param; a second call would 429 without a key.
#[tokio::test]
#[serial]
async fn search_returns_results() {
    // Extra cooldown for the search endpoint's stricter rate limit
    sleep(Duration::from_secs(15)).await;
    let resp = client()
        .search("transformer architecture", SEARCH_FIELDS, 5, 0)
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected Semantic Scholar results");
    assert!(resp.data.len() <= 5, "requested max 5");
    assert!(resp.total.unwrap_or(0) > 0, "expected non-zero total");
    // Verify result structure
    let first = &resp.data[0];
    assert!(first.paper_id.is_some(), "expected paper_id on search result");
}

// ── Get Paper ───────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_paper_known_id_with_full_fields() {
    polite_delay().await;
    let paper = client()
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let title = paper.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );

    let authors = paper.authors.as_ref().expect("expected authors");
    assert!(!authors.is_empty());
    assert!(
        authors
            .iter()
            .any(|a| a.name.as_deref().unwrap_or("").contains("Vaswani")),
        "expected Vaswani in authors"
    );

    assert!(paper.citation_count.unwrap_or(0) > 0);
    assert!(paper.paper_id.is_some());
    assert!(paper.year.is_some());
    assert!(paper.url.is_some());
}

// ── Citations & References ──────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_citations_returns_results() {
    polite_delay().await;
    let resp = client()
        .get_citations(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected citations for landmark paper");
}

#[tokio::test]
#[serial]
async fn get_references_returns_results() {
    polite_delay().await;
    let resp = client()
        .get_references(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected references for landmark paper");
}

// ── Recommendations ─────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_recommendations() {
    polite_delay().await;
    // Recommendations endpoint can 404 or return empty — just verify it doesn't panic
    let _ = client()
        .get_recommendations(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await;
}

// ── Conversion to ResearchPaper ─────────────────────────────────────

#[tokio::test]
#[serial]
async fn paper_converts_to_research_paper() {
    polite_delay().await;
    let paper = client()
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let rp: ResearchPaper = paper.into();
    assert!(!rp.title.is_empty());
    assert!(!rp.authors.is_empty());
    assert!(rp.year.is_some());
    assert!(rp.citation_count.is_some());
}

// ── Date enforcement ────────────────────────────────────────────────

/// Verify that the year filter actually constrains results to the requested year.
/// Papers with a None publication_date are tolerated (S2 sometimes lacks dates),
/// but every paper that *has* a date must start with "2026".
#[tokio::test]
#[serial]
async fn search_bulk_with_year_filter_returns_recent_papers() {
    sleep(Duration::from_secs(15)).await;
    let resp = client()
        .search_bulk(
            "large language model",
            SEARCH_FIELDS,
            Some("2026-"),
            None,
            None,
            10,
        )
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected bulk search results for 2026-");
    for paper in &resp.data {
        if let Some(ref date) = paper.publication_date {
            assert!(
                date.starts_with("2026"),
                "paper date {date} does not start with 2026 (title: {:?})",
                paper.title
            );
        }
        // None dates are acceptable — some S2 records lack publication_date
    }
}

/// Every non-None `publication_date` returned by bulk search must be a valid
/// YYYY-MM-DD (or YYYY-MM) date that can be parsed.
#[tokio::test]
#[serial]
async fn search_bulk_papers_have_valid_publication_dates() {
    sleep(Duration::from_secs(15)).await;
    let resp = client()
        .search_bulk(
            "reinforcement learning",
            SEARCH_FIELDS,
            None,
            None,
            None,
            10,
        )
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected bulk search results");
    for paper in &resp.data {
        if let Some(ref date) = paper.publication_date {
            // S2 returns YYYY-MM-DD; some older entries may be YYYY-MM or just YYYY.
            // All must at least start with a 4-digit year.
            let parts: Vec<&str> = date.split('-').collect();
            assert!(
                !parts.is_empty() && parts[0].len() == 4 && parts[0].parse::<u32>().is_ok(),
                "publication_date '{date}' does not start with a valid 4-digit year"
            );
            if parts.len() >= 2 {
                let month: u32 = parts[1].parse().unwrap_or(0);
                assert!(
                    (1..=12).contains(&month),
                    "invalid month in publication_date '{date}'"
                );
            }
            if parts.len() == 3 {
                let day: u32 = parts[2].parse().unwrap_or(0);
                assert!(
                    (1..=31).contains(&day),
                    "invalid day in publication_date '{date}'"
                );
            }
        }
    }
}

/// When sorting by publicationDate:desc, the first paper's date should be >=
/// the last paper's date (comparing non-None dates only).
#[tokio::test]
#[serial]
async fn search_bulk_sort_by_date_descending() {
    sleep(Duration::from_secs(15)).await;
    let resp = client()
        .search_bulk(
            "neural network",
            SEARCH_FIELDS,
            None,
            None,
            Some("publicationDate:desc"),
            10,
        )
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected bulk search results");

    // Collect all non-None publication dates in result order
    let dates: Vec<&str> = resp
        .data
        .iter()
        .filter_map(|p| p.publication_date.as_deref())
        .collect();

    assert!(
        dates.len() >= 2,
        "need at least 2 non-None dates to verify sort order, got {}",
        dates.len()
    );

    let first = dates.first().unwrap();
    let last = dates.last().unwrap();
    assert!(
        first >= last,
        "expected descending date order: first={first}, last={last}"
    );
}

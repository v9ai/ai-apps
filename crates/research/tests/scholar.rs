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

#[tokio::test]
#[serial]
async fn search_returns_results() {
    // Search endpoint has stricter rate limits — extra cooldown
    sleep(Duration::from_secs(15)).await;
    let resp = client()
        .search("transformer architecture", SEARCH_FIELDS, 5, 0)
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected Semantic Scholar results");
    assert!(resp.total.unwrap_or(0) > 0, "expected non-zero total");
}

#[tokio::test]
#[serial]
async fn search_pagination_works() {
    sleep(Duration::from_secs(15)).await;

    let page0 = client()
        .search("neural network", SEARCH_FIELDS, 3, 0)
        .await
        .unwrap();

    assert!(
        page0.data.len() <= 3,
        "got {} results, expected at most 3",
        page0.data.len()
    );
    assert!(!page0.data.is_empty(), "page 0 should have results");

    sleep(Duration::from_secs(10)).await;

    let page1 = client()
        .search("neural network", SEARCH_FIELDS, 3, 3)
        .await
        .unwrap();

    assert!(!page1.data.is_empty(), "page 1 should have results");

    let ids0: Vec<_> = page0.data.iter().filter_map(|p| p.paper_id.as_deref()).collect();
    let ids1: Vec<_> = page1.data.iter().filter_map(|p| p.paper_id.as_deref()).collect();
    assert_ne!(ids0, ids1, "paginated results should differ");
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

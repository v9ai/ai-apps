use std::time::Duration;

use serial_test::serial;
use tokio::time::sleep;

use research::scholar::types::{PAPER_FIELDS_FULL, SEARCH_FIELDS};
use research::scholar::SemanticScholarClient;
use research::ResearchPaper;

// Well-known paper: "Attention Is All You Need"
const ATTENTION_S2_ID: &str = "204e3073870fae3d05bcbc2f6a8e263d9b72e776";

/// S2 public API rate-limits aggressively without an API key.
/// Polite delay between tests to stay under the limit.
async fn polite_delay() {
    sleep(Duration::from_secs(4)).await;
}

// ── Search ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_returns_results() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .search("transformer architecture", SEARCH_FIELDS, 5, 0)
        .await
        .unwrap();

    assert!(!resp.data.is_empty(), "expected Semantic Scholar results");
}

#[tokio::test]
#[serial]
async fn search_respects_limit() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .search("deep learning", SEARCH_FIELDS, 3, 0)
        .await
        .unwrap();

    assert!(
        resp.data.len() <= 3,
        "got {} results, expected at most 3",
        resp.data.len()
    );
}

#[tokio::test]
#[serial]
async fn search_pagination_works() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);

    let page0 = client
        .search("neural network", SEARCH_FIELDS, 3, 0)
        .await
        .unwrap();

    polite_delay().await;

    let page1 = client
        .search("neural network", SEARCH_FIELDS, 3, 3)
        .await
        .unwrap();

    assert!(!page0.data.is_empty(), "page 0 should have results");
    assert!(!page1.data.is_empty(), "page 1 should have results");

    let ids0: Vec<_> = page0.data.iter().filter_map(|p| p.paper_id.as_deref()).collect();
    let ids1: Vec<_> = page1.data.iter().filter_map(|p| p.paper_id.as_deref()).collect();
    assert_ne!(ids0, ids1, "paginated results should differ");
}

#[tokio::test]
#[serial]
async fn search_total_populated() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .search("BERT", SEARCH_FIELDS, 5, 0)
        .await
        .unwrap();

    assert!(resp.total.unwrap_or(0) > 0, "expected non-zero total");
}

// ── Get Paper ───────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_paper_known_id() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let title = paper.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );
}

#[tokio::test]
#[serial]
async fn get_paper_has_authors() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let authors = paper.authors.as_ref().expect("expected authors");
    assert!(!authors.is_empty(), "expected at least one author");
    assert!(
        authors
            .iter()
            .any(|a| a.name.as_deref().unwrap_or("").contains("Vaswani")),
        "expected Vaswani in authors: {:?}",
        authors
    );
}

#[tokio::test]
#[serial]
async fn get_paper_has_citations() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let cites = paper.citation_count.unwrap_or(0);
    assert!(
        cites > 0,
        "expected non-zero citation count for landmark paper"
    );
}

// ── Citations & References ──────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_citations_returns_results() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .get_citations(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await
        .unwrap();

    assert!(
        !resp.data.is_empty(),
        "expected citations for landmark paper"
    );
}

#[tokio::test]
#[serial]
async fn get_references_returns_results() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .get_references(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await
        .unwrap();

    assert!(
        !resp.data.is_empty(),
        "expected references for landmark paper"
    );
}

// ── Recommendations ─────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_recommendations_returns_results() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let resp = client
        .get_recommendations(ATTENTION_S2_ID, SEARCH_FIELDS, 5)
        .await;

    // Recommendations endpoint may return empty for some papers or be unavailable
    if let Ok(resp) = resp {
        // If it succeeds, we should get results
        assert!(
            !resp.recommended_papers.is_empty(),
            "expected recommendations when endpoint is available"
        );
    }
}

// ── Conversion to ResearchPaper ─────────────────────────────────────

#[tokio::test]
#[serial]
async fn paper_converts_to_research_paper() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    let rp: ResearchPaper = paper.into();
    assert!(!rp.title.is_empty());
    assert!(!rp.authors.is_empty());
    assert!(rp.year.is_some());
    assert!(rp.citation_count.is_some());
}

// ── Field completeness ──────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn paper_fields_populated() {
    polite_delay().await;
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(ATTENTION_S2_ID, PAPER_FIELDS_FULL)
        .await
        .unwrap();

    assert!(paper.paper_id.is_some(), "expected paper_id");
    assert!(paper.title.is_some(), "expected title");
    assert!(paper.year.is_some(), "expected year");
    assert!(paper.citation_count.is_some(), "expected citation_count");
    assert!(paper.authors.is_some(), "expected authors");
    assert!(paper.url.is_some(), "expected url");
}

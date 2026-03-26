use serial_test::serial;

use research::arxiv::{ArxivClient, ArxivPaper};

// ── Search ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_returns_results() {
    let client = ArxivClient::new();
    let resp = client
        .search("transformer attention mechanism", 0, 5, None, None)
        .await
        .unwrap();

    assert!(resp.total_results > 0, "expected non-zero total_results");
    assert!(!resp.papers.is_empty(), "expected papers from search");
    assert!(resp.papers.len() <= 5, "requested max 5");
}

#[tokio::test]
#[serial]
async fn search_respects_max_results() {
    let client = ArxivClient::new();
    let resp = client
        .search("deep learning", 0, 3, None, None)
        .await
        .unwrap();

    assert!(
        resp.papers.len() <= 3,
        "got {} papers, expected at most 3",
        resp.papers.len()
    );
}

#[tokio::test]
#[serial]
async fn search_pagination_works() {
    let client = ArxivClient::new();

    let page0 = client
        .search("neural network", 0, 2, None, None)
        .await
        .unwrap();
    let page1 = client
        .search("neural network", 2, 2, None, None)
        .await
        .unwrap();

    assert!(!page0.papers.is_empty(), "page 0 should have results");
    assert!(!page1.papers.is_empty(), "page 1 should have results");

    // Different pages should return different papers
    let ids0: Vec<&str> = page0.papers.iter().map(|p| p.arxiv_id.as_str()).collect();
    let ids1: Vec<&str> = page1.papers.iter().map(|p| p.arxiv_id.as_str()).collect();
    assert_ne!(ids0, ids1, "paginated results should differ");
}

#[tokio::test]
#[serial]
async fn search_sort_by_submitted_date() {
    let client = ArxivClient::new();
    let resp = client
        .search("large language model", 0, 5, Some("submittedDate"), Some("descending"))
        .await
        .unwrap();

    assert!(!resp.papers.is_empty(), "expected results sorted by date");
}

#[tokio::test]
#[serial]
async fn search_empty_query_returns_ok() {
    let client = ArxivClient::new();
    // arXiv API handles empty-ish queries gracefully
    let resp = client
        .search("xyzzynonexistentterm999", 0, 5, None, None)
        .await
        .unwrap();

    assert_eq!(resp.papers.len(), 0, "nonsense query should yield no papers");
}

// ── Get Paper by ID ─────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_paper_known_id() {
    let client = ArxivClient::new();
    // "Attention Is All You Need"
    let paper = client.get_paper("1706.03762").await.unwrap();

    assert!(
        paper.title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {}",
        paper.title
    );
    assert!(
        paper.authors.iter().any(|a| a.contains("Vaswani")),
        "expected Vaswani in authors: {:?}",
        paper.authors
    );
    assert!(
        paper.categories.contains(&"cs.CL".to_string()),
        "expected cs.CL category: {:?}",
        paper.categories
    );
    assert!(paper.pdf_url.is_some(), "expected pdf_url");
    assert!(paper.published.starts_with("2017"), "expected 2017 publication");
}

#[tokio::test]
#[serial]
async fn get_paper_not_found() {
    let client = ArxivClient::new();
    let result = client.get_paper("0000.00000").await;

    assert!(result.is_err(), "non-existent ID should error");
}

// ── Fetch Batch ─────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn fetch_batch_multiple_ids() {
    let client = ArxivClient::new();
    let ids = vec![
        "1706.03762".to_string(), // Attention Is All You Need
        "1810.04805".to_string(), // BERT
    ];

    let papers = client.fetch_batch(&ids, 10).await.unwrap();

    assert_eq!(papers.len(), 2, "expected 2 papers from batch fetch");
    assert_titles_contain(&papers, "attention");
    assert_titles_contain(&papers, "bert");
}

#[tokio::test]
#[serial]
async fn fetch_batch_empty_input() {
    let client = ArxivClient::new();
    let papers = client.fetch_batch(&[], 10).await.unwrap();
    assert!(papers.is_empty(), "empty input should return empty vec");
}

#[tokio::test]
#[serial]
async fn fetch_batch_respects_batch_size() {
    let client = ArxivClient::new();
    let ids = vec![
        "1706.03762".to_string(),
        "1810.04805".to_string(),
        "2005.14165".to_string(), // GPT-3
    ];

    // batch_size=1 forces 3 separate requests
    let papers = client.fetch_batch(&ids, 1).await.unwrap();
    assert_eq!(papers.len(), 3, "should fetch all 3 papers in separate batches");
}

// ── Paper field completeness ────────────────────────────────────────

#[tokio::test]
#[serial]
async fn paper_fields_are_populated() {
    let client = ArxivClient::new();
    let paper = client.get_paper("1706.03762").await.unwrap();

    assert!(!paper.arxiv_id.is_empty(), "arxiv_id should be set");
    assert!(!paper.title.is_empty(), "title should be set");
    assert!(!paper.summary.is_empty(), "summary should be set");
    assert!(!paper.authors.is_empty(), "authors should be set");
    assert!(!paper.published.is_empty(), "published should be set");
    assert!(paper.updated.is_some(), "updated should be present for revised papers");
    assert!(!paper.categories.is_empty(), "categories should be set");
    assert!(paper.link_url.is_some(), "link_url should be set");
}

// ── Helpers ─────────────────────────────────────────────────────────

fn assert_titles_contain(papers: &[ArxivPaper], needle: &str) {
    let found = papers
        .iter()
        .any(|p| p.title.to_lowercase().contains(needle));
    assert!(
        found,
        "expected at least one paper title containing '{needle}', got: {:?}",
        papers.iter().map(|p| &p.title).collect::<Vec<_>>()
    );
}

// ── Date enforcement tests ────────────────────────────────────────

use chrono::{Datelike, Duration, NaiveDate, Utc};
use research::arxiv::types::{ArxivCategory, DateRange, SearchQuery, SortBy, SortOrder};

#[test]
fn date_range_validation() {
    // Valid 8-digit dates succeed
    assert!(DateRange::new("20240101", "20240630").is_ok());

    // Valid 12-digit (YYYYMMDDHHmm) dates succeed
    assert!(DateRange::new("202401010000", "202406301200").is_ok());

    // Wildcard dates succeed
    assert!(DateRange::new("*", "20240630").is_ok());
    assert!(DateRange::new("20240101", "*").is_ok());
    assert!(DateRange::new("*", "*").is_ok());

    // Invalid format: dashes are rejected
    assert!(
        DateRange::new("2024-01-01", "2024-06-30").is_err(),
        "dates with dashes should be rejected"
    );

    // Invalid format: wrong length
    assert!(
        DateRange::new("2024010", "20240630").is_err(),
        "7-digit date should be rejected"
    );
    assert!(
        DateRange::new("202401011", "20240630").is_err(),
        "9-digit date should be rejected"
    );

    // Invalid format: non-digit characters
    assert!(
        DateRange::new("2024ABCD", "20240630").is_err(),
        "non-digit characters should be rejected"
    );

    // Invalid format: empty string
    assert!(
        DateRange::new("", "20240630").is_err(),
        "empty string should be rejected"
    );

    // Note: DateRange::new does not validate end < start semantically —
    // it only checks format. This is by design (the arXiv API handles ordering).
}

#[tokio::test]
#[serial]
async fn search_with_date_range_returns_recent_papers() {
    let client = ArxivClient::new();

    let today = Utc::now().date_naive();
    let from_date = today - Duration::days(30);

    let from_str = from_date.format("%Y%m%d").to_string();
    let to_str = today.format("%Y%m%d").to_string();

    let date_range = DateRange::new(&from_str, &to_str).expect("valid date range");

    let query = SearchQuery::new()
        .category(ArxivCategory::CsAI)
        .date_range(date_range)
        .sort_by(SortBy::SubmittedDate)
        .sort_order(SortOrder::Descending)
        .max_results(5);

    let resp = client.search_advanced(&query).await.unwrap();

    // arXiv might return 0 results on some days for narrow date windows,
    // but if we get results, verify they are within the expected range.
    if !resp.papers.is_empty() {
        // Allow 7-day grace period for arXiv indexing lag
        let earliest_allowed = from_date - Duration::days(7);

        for paper in &resp.papers {
            // Published field is ISO 8601: "2024-03-15T12:00:00Z"
            let pub_date_str = &paper.published;
            let parsed = NaiveDate::parse_from_str(
                &pub_date_str[..10],
                "%Y-%m-%d",
            );
            assert!(
                parsed.is_ok(),
                "could not parse published date '{}' for paper '{}'",
                pub_date_str,
                paper.title
            );
            let pub_date = parsed.unwrap();
            assert!(
                pub_date >= earliest_allowed,
                "paper '{}' published on {} is before the allowed earliest date {} \
                 (from_date={}, 7-day grace)",
                paper.title,
                pub_date,
                earliest_allowed,
                from_date,
            );
        }
    }
}

#[tokio::test]
#[serial]
async fn search_results_published_field_is_valid_date() {
    let client = ArxivClient::new();

    let resp = client
        .search("machine learning", 0, 5, Some("submittedDate"), Some("descending"))
        .await
        .unwrap();

    assert!(
        !resp.papers.is_empty(),
        "expected at least one paper for 'machine learning'"
    );

    for paper in &resp.papers {
        let pub_str = &paper.published;

        // Must be at least 10 characters for YYYY-MM-DD prefix
        assert!(
            pub_str.len() >= 10,
            "published field '{}' is too short to contain a date for paper '{}'",
            pub_str,
            paper.title,
        );

        // The first 10 chars must parse as a valid YYYY-MM-DD date
        let parsed = NaiveDate::parse_from_str(&pub_str[..10], "%Y-%m-%d");
        assert!(
            parsed.is_ok(),
            "published field '{}' does not start with a valid YYYY-MM-DD date for paper '{}': {:?}",
            pub_str,
            paper.title,
            parsed.err(),
        );

        // Sanity: year should be between 1990 and 2030
        let date = parsed.unwrap();
        assert!(
            date.year() >= 1990 && date.year() <= 2030,
            "published date {} has implausible year for paper '{}'",
            date,
            paper.title,
        );
    }
}

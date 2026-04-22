use serial_test::serial;

use research::crossref::{CrossrefClient, CrossrefWork};
use research::ResearchPaper;

// ── Search ──────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn search_returns_results() {
    let client = CrossrefClient::new(None);
    let resp = client.search("CRISPR genome editing", 5, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items in response");
    assert!(!items.is_empty(), "expected Crossref search results");
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn search_respects_rows() {
    let client = CrossrefClient::new(None);
    let resp = client.search("machine learning", 3, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items");
    assert!(
        items.len() <= 3,
        "got {} items, expected at most 3",
        items.len()
    );
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn search_pagination_works() {
    let client = CrossrefClient::new(None);

    let page0 = client.search("deep learning", 3, 0).await.unwrap();
    let page1 = client.search("deep learning", 3, 3).await.unwrap();

    let items0 = page0.message.as_ref().and_then(|m| m.items.as_ref()).unwrap();
    let items1 = page1.message.as_ref().and_then(|m| m.items.as_ref()).unwrap();

    assert!(!items0.is_empty(), "page 0 should have results");
    assert!(!items1.is_empty(), "page 1 should have results");

    let dois0: Vec<_> = items0.iter().filter_map(|w| w.doi.as_deref()).collect();
    let dois1: Vec<_> = items1.iter().filter_map(|w| w.doi.as_deref()).collect();
    assert_ne!(dois0, dois1, "paginated results should differ");
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn search_total_results_populated() {
    let client = CrossrefClient::new(None);
    let resp = client.search("transformer", 5, 0).await.unwrap();

    let total = resp
        .message
        .as_ref()
        .and_then(|m| m.total_results)
        .unwrap_or(0);
    assert!(total > 0, "expected non-zero total_results");
}

// ── Get Work by DOI ─────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn get_work_known_doi() {
    let client = CrossrefClient::new(None);
    // "CRISPR-Cas9" landmark paper in Nature
    let work = client.get_work("10.1038/nature12373").await.unwrap();

    let title = work
        .title
        .as_ref()
        .and_then(|t| t.first())
        .cloned()
        .unwrap_or_default();
    assert!(!title.is_empty(), "expected non-empty title for DOI");
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn get_work_has_authors() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();

    let authors = work.author.as_ref().expect("expected authors");
    assert!(!authors.is_empty(), "expected at least one author");
    // Verify authors have structured name fields
    assert!(
        authors.iter().all(|a| a.family.is_some()),
        "expected every author to have a family name: {:?}",
        authors
    );
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn get_work_has_citation_count() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();

    let count = work.is_referenced_by_count.unwrap_or(0);
    assert!(count > 0, "expected non-zero citation count for landmark paper");
}

// ── Conversion to ResearchPaper ─────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn work_converts_to_research_paper() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();

    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty());
    assert!(paper.doi.is_some(), "expected DOI on crossref paper");
}

// ── Abstract / JATS stripping ───────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn jats_tags_stripped_from_abstract() {
    let work = CrossrefWork {
        doi: Some("10.1234/test".into()),
        title: Some(vec!["Test".into()]),
        abstract_text: Some(
            "<jats:p>This is <jats:italic>important</jats:italic> text.</jats:p>".into(),
        ),
        author: None,
        published: None,
        is_referenced_by_count: None,
        url: None,
        link: None,
        container_title: None,
        work_type: None,
    };

    let paper: ResearchPaper = work.into();
    let abs = paper.abstract_text.unwrap();
    assert!(!abs.contains('<'), "JATS tags should be stripped: {abs}");
    assert!(abs.contains("important"), "content should remain");
}

// ── Field completeness ──────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn work_fields_populated() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();

    assert!(work.doi.is_some(), "expected doi");
    assert!(work.title.is_some(), "expected title");
    assert!(work.author.is_some(), "expected author");
    assert!(work.is_referenced_by_count.is_some(), "expected citation count");
}

// ── Date enforcement ─────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn search_results_have_published_date() {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let client = CrossrefClient::new(None);
    let resp = client.search("machine learning", 20, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items");

    let with_date = items.iter().filter(|w| w.published.is_some()).count();
    let ratio = with_date as f64 / items.len() as f64;
    assert!(
        ratio >= 0.5,
        "expected most results to have a published date, got {with_date}/{} ({:.0}%)",
        items.len(),
        ratio * 100.0,
    );
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn crossref_date_year_extraction() {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let client = CrossrefClient::new(None);
    let resp = client.search("machine learning", 20, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items");

    let current_year = 2026u32; // conservative upper bound
    for work in items.iter().filter(|w| w.published.is_some()) {
        let dp = work.published.as_ref().unwrap();
        if let Some(year) = dp.year() {
            assert!(
                (1900..=current_year + 1).contains(&year),
                "year {year} outside reasonable range for work: {:?}",
                work.title,
            );
        }
    }
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn client_side_date_filter_works() {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let client = CrossrefClient::new(None);
    let resp = client.search("machine learning", 20, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items");

    let filtered: Vec<&CrossrefWork> = items
        .iter()
        .filter(|w| {
            w.published
                .as_ref()
                .and_then(|dp| dp.year())
                .map_or(false, |y| y >= 2024)
        })
        .collect();

    // Every filtered result must satisfy the predicate.
    for work in &filtered {
        let year = work
            .published
            .as_ref()
            .and_then(|dp| dp.year())
            .expect("filtered work must have year");
        assert!(
            year >= 2024,
            "filtered work has year {year} < 2024: {:?}",
            work.title,
        );
    }
}

#[tokio::test]
#[ignore = "requires live Crossref API"]
async fn crossref_date_has_date_parts() {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let client = CrossrefClient::new(None);
    let resp = client.search("machine learning", 10, 0).await.unwrap();

    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items");

    let with_date: Vec<_> = items.iter().filter(|w| w.published.is_some()).collect();
    assert!(!with_date.is_empty(), "need at least one work with published date");

    for work in &with_date {
        let dp = work.published.as_ref().unwrap();
        let parts = dp
            .date_parts
            .as_ref()
            .expect("DateParts.date_parts should be Some");
        assert!(!parts.is_empty(), "date_parts outer vec should not be empty");
        let inner = parts.first().unwrap();
        assert!(
            !inner.is_empty(),
            "date_parts inner vec should contain at least a year: {:?}",
            work.title,
        );
        // First element is the year — sanity check it is positive.
        assert!(inner[0] > 0, "year should be positive");
    }
}

use serial_test::serial;

use research::openalex::OpenAlexClient;
use research::ResearchPaper;

// ── Search ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_returns_results() {
    let client = OpenAlexClient::new(None);
    let resp = client.search("machine learning", 1, 5).await.unwrap();

    assert!(!resp.results.is_empty(), "expected OpenAlex search results");
    assert!(resp.results.len() <= 5, "requested max 5");
}

#[tokio::test]
#[serial]
async fn search_respects_per_page() {
    let client = OpenAlexClient::new(None);
    let resp = client.search("deep learning", 1, 3).await.unwrap();

    assert!(
        resp.results.len() <= 3,
        "got {} results, expected at most 3",
        resp.results.len()
    );
}

#[tokio::test]
#[serial]
async fn search_pagination_works() {
    let client = OpenAlexClient::new(None);

    let page1 = client.search("neural network", 1, 3).await.unwrap();
    let page2 = client.search("neural network", 2, 3).await.unwrap();

    assert!(!page1.results.is_empty(), "page 1 should have results");
    assert!(!page2.results.is_empty(), "page 2 should have results");

    let ids1: Vec<_> = page1.results.iter().filter_map(|w| w.id.as_deref()).collect();
    let ids2: Vec<_> = page2.results.iter().filter_map(|w| w.id.as_deref()).collect();
    assert_ne!(ids1, ids2, "paginated results should differ");
}

#[tokio::test]
#[serial]
async fn search_meta_populated() {
    let client = OpenAlexClient::new(None);
    let resp = client.search("transformer", 1, 5).await.unwrap();

    let meta = resp.meta.expect("expected meta in response");
    assert!(meta.count.unwrap_or(0) > 0, "expected non-zero count");
}

// ── Get Work ────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_work_known_id() {
    let client = OpenAlexClient::new(None);
    // "Attention Is All You Need"
    let work = client
        .get_work("https://openalex.org/W2626778328")
        .await
        .unwrap();

    let title = work.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );
}

#[tokio::test]
#[serial]
async fn get_work_has_authors() {
    let client = OpenAlexClient::new(None);
    let work = client
        .get_work("https://openalex.org/W2626778328")
        .await
        .unwrap();

    let authors = work.authorships.as_ref().expect("expected authorships");
    assert!(!authors.is_empty(), "expected at least one author");

    let has_vaswani = authors.iter().any(|a| {
        a.author
            .as_ref()
            .and_then(|au| au.display_name.as_deref())
            .unwrap_or("")
            .contains("Vaswani")
    });
    assert!(has_vaswani, "expected Vaswani in authors");
}

#[tokio::test]
#[serial]
async fn get_work_abstract_reconstruction() {
    let client = OpenAlexClient::new(None);
    let work = client
        .get_work("https://openalex.org/W2626778328")
        .await
        .unwrap();

    if let Some(abstract_text) = work.reconstruct_abstract() {
        assert!(
            abstract_text.len() > 20,
            "reconstructed abstract too short: {abstract_text}"
        );
    }
    // Some works may not have an inverted index
}

// ── Conversion to ResearchPaper ─────────────────────────────────────

#[tokio::test]
#[serial]
async fn work_converts_to_research_paper() {
    let client = OpenAlexClient::new(None);
    let work = client
        .get_work("https://openalex.org/W2626778328")
        .await
        .unwrap();

    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty(), "expected non-empty title");
    assert!(!paper.authors.is_empty(), "expected authors");
    assert!(paper.year.is_some(), "expected year");
}

// ── Field completeness ──────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn work_fields_populated() {
    let client = OpenAlexClient::new(None);
    let work = client
        .get_work("https://openalex.org/W2626778328")
        .await
        .unwrap();

    assert!(work.id.is_some(), "expected id");
    assert!(work.title.is_some(), "expected title");
    assert!(work.publication_year.is_some(), "expected publication_year");
    assert!(work.cited_by_count.is_some(), "expected cited_by_count");
}

// ── Date enforcement ────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_results_have_publication_year() {
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let client = OpenAlexClient::new(None);
    let resp = client.search("deep learning", 1, 10).await.unwrap();

    assert!(!resp.results.is_empty(), "expected results");
    let with_year = resp
        .results
        .iter()
        .filter(|w| w.publication_year.is_some())
        .count();
    let ratio = with_year as f64 / resp.results.len() as f64;
    assert!(
        ratio >= 0.8,
        "expected >= 80% of results to have publication_year, got {:.0}% ({}/{})",
        ratio * 100.0,
        with_year,
        resp.results.len()
    );
}

#[tokio::test]
#[serial]
async fn search_results_publication_year_is_reasonable() {
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let current_year = chrono::Utc::now().year() as u32;
    let client = OpenAlexClient::new(None);
    let resp = client.search("deep learning", 1, 10).await.unwrap();

    for work in &resp.results {
        if let Some(year) = work.publication_year {
            assert!(
                (1900..=current_year + 1).contains(&year),
                "publication_year {} is outside [1900, {}] for work {:?}",
                year,
                current_year + 1,
                work.title
            );
        }
    }
}

#[tokio::test]
#[serial]
async fn client_side_year_filter_works() {
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let client = OpenAlexClient::new(None);
    let resp = client.search("large language model", 1, 25).await.unwrap();

    let filtered: Vec<_> = resp
        .results
        .iter()
        .filter(|w| w.publication_year.map_or(false, |y| y >= 2025))
        .collect();

    // There should be at least some recent papers on this hot topic
    assert!(
        !filtered.is_empty(),
        "expected at least one work with year >= 2025"
    );
    for work in &filtered {
        let year = work.publication_year.unwrap();
        assert!(
            year >= 2025,
            "filtered work has year {} < 2025: {:?}",
            year,
            work.title
        );
    }
}

#[tokio::test]
#[serial]
async fn publication_date_field_format() {
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let client = OpenAlexClient::new(None);
    let resp = client.search("deep learning", 1, 10).await.unwrap();

    let date_re = regex::Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
    let mut checked = 0;
    for work in &resp.results {
        if let Some(ref date) = work.publication_date {
            assert!(
                date_re.is_match(date),
                "publication_date '{}' does not match YYYY-MM-DD for work {:?}",
                date,
                work.title
            );
            checked += 1;
        }
    }
    assert!(
        checked > 0,
        "expected at least one work to have a publication_date"
    );
}

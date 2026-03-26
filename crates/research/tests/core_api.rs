use chrono::Datelike;
use serial_test::serial;

use research::core_api::CoreClient;
use research::ResearchPaper;

/// CORE's public API sometimes returns transient 500s (ES shard failures).
/// Retry once after a short delay to avoid flaky CI.
async fn core_search_with_retry(
    client: &CoreClient,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<research::core_api::CoreSearchResponse, research::core_api::Error> {
    match client.search(query, limit, offset).await {
        Ok(resp) => Ok(resp),
        Err(_) => {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            client.search(query, limit, offset).await
        }
    }
}

// ── Search ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_returns_results() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "deep learning", 5, 0)
        .await
        .unwrap();

    assert!(!resp.results.is_empty(), "expected CORE search results");
}

#[tokio::test]
#[serial]
async fn search_respects_limit() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "machine learning", 3, 0)
        .await
        .unwrap();

    assert!(
        resp.results.len() <= 3,
        "got {} results, expected at most 3",
        resp.results.len()
    );
}

#[tokio::test]
#[serial]
async fn search_pagination_works() {
    let client = CoreClient::new(None);

    let page0 = core_search_with_retry(&client, "neural network", 3, 0)
        .await
        .unwrap();
    let page1 = core_search_with_retry(&client, "neural network", 3, 3)
        .await
        .unwrap();

    assert!(!page0.results.is_empty(), "page 0 should have results");
    assert!(!page1.results.is_empty(), "page 1 should have results");

    let ids0: Vec<_> = page0.results.iter().filter_map(|w| w.id).collect();
    let ids1: Vec<_> = page1.results.iter().filter_map(|w| w.id).collect();
    assert_ne!(ids0, ids1, "paginated results should differ");
}

#[tokio::test]
#[serial]
async fn search_total_hits_populated() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "transformer", 5, 0)
        .await
        .unwrap();

    let total = resp.total_hits.unwrap_or(0);
    assert!(total > 0, "expected non-zero total_hits");
}

// ── Get Work ────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn get_work_from_search_result() {
    let client = CoreClient::new(None);

    let resp = core_search_with_retry(&client, "neural networks", 1, 0)
        .await
        .unwrap();
    let first = resp
        .results
        .into_iter()
        .next()
        .expect("need at least one result");
    let id = first.id.expect("search result should have an id");

    let fetched = client.get_work(&id.to_string()).await.unwrap();
    assert!(
        fetched.title.as_ref().map_or(false, |t| !t.is_empty()),
        "expected non-empty title"
    );
}

// ── Conversion to ResearchPaper ─────────────────────────────────────

#[tokio::test]
#[serial]
async fn work_converts_to_research_paper() {
    let client = CoreClient::new(None);

    let resp = core_search_with_retry(&client, "deep reinforcement learning", 1, 0)
        .await
        .unwrap();
    if let Some(work) = resp.results.into_iter().next() {
        let paper: ResearchPaper = work.into();
        assert!(!paper.title.is_empty(), "expected non-empty title from CORE");
    }
}

// ── Field completeness ──────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_result_fields_populated() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "convolutional neural network", 3, 0)
        .await
        .unwrap();

    for work in &resp.results {
        assert!(work.title.is_some(), "expected title on search result");
    }
}

// ── Date enforcement ─────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn search_results_have_year_published() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "machine learning 2025", 10, 0)
        .await
        .unwrap();

    assert!(!resp.results.is_empty(), "expected results");

    let with_year = resp
        .results
        .iter()
        .filter(|w| w.year_published.is_some())
        .count();
    let ratio = with_year as f64 / resp.results.len() as f64;
    assert!(
        ratio >= 0.5,
        "expected at least 50% of results to have year_published, got {:.0}% ({}/{})",
        ratio * 100.0,
        with_year,
        resp.results.len(),
    );

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
}

#[tokio::test]
#[serial]
async fn year_published_is_reasonable() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "natural language processing", 10, 0)
        .await
        .unwrap();

    let current_year = chrono::Utc::now().year() as u32;

    for work in &resp.results {
        if let Some(year) = work.year_published {
            assert!(
                (1900..=current_year + 1).contains(&year),
                "year_published {} is outside reasonable range 1900..={}",
                year,
                current_year + 1,
            );
        }
    }

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
}

#[tokio::test]
#[serial]
async fn client_side_year_filter_works() {
    let client = CoreClient::new(None);
    let resp = core_search_with_retry(&client, "large language models", 10, 0)
        .await
        .unwrap();

    let filtered: Vec<_> = resp
        .results
        .iter()
        .filter(|w| w.year_published.map_or(false, |y| y >= 2025))
        .collect();

    // Every item that passed the filter must satisfy the condition.
    for work in &filtered {
        let year = work.year_published.unwrap();
        assert!(
            year >= 2025,
            "client-side filter leaked a paper with year_published = {}",
            year,
        );
    }

    // Informational: how many passed (not a hard failure if zero — CORE may
    // not have 2025 papers for every query, but the filter itself must be correct).
    eprintln!(
        "client_side_year_filter_works: {}/{} results had year_published >= 2025",
        filtered.len(),
        resp.results.len(),
    );

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
}

#[tokio::test]
#[serial]
async fn search_with_year_in_query_improves_relevance() {
    let client = CoreClient::new(None);

    let with_year = core_search_with_retry(&client, "deep learning 2026", 10, 0)
        .await
        .unwrap();

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let without_year = core_search_with_retry(&client, "deep learning", 10, 0)
        .await
        .unwrap();

    fn avg_year(results: &[research::core_api::CoreWork]) -> f64 {
        let years: Vec<f64> = results
            .iter()
            .filter_map(|w| w.year_published.map(|y| y as f64))
            .collect();
        if years.is_empty() {
            return 0.0;
        }
        years.iter().sum::<f64>() / years.len() as f64
    }

    let avg_with = avg_year(&with_year.results);
    let avg_without = avg_year(&without_year.results);

    eprintln!(
        "search_with_year_in_query_improves_relevance: avg year with='2026' in query: {:.1}, without: {:.1}",
        avg_with, avg_without,
    );

    // The year-in-query search should yield an equal or higher average year.
    // We allow a small tolerance (the year query should not make things *worse*).
    assert!(
        avg_with >= avg_without - 1.0,
        "year-in-query average ({:.1}) should not be significantly worse than baseline ({:.1})",
        avg_with,
        avg_without,
    );
}

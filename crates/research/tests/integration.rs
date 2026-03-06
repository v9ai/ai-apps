use serial_test::serial;

use research::openalex::OpenAlexClient;
use research::crossref::CrossrefClient;
use research::core_api::CoreClient;
use research::scholar::SemanticScholarClient;
use research::ResearchPaper;

// ── OpenAlex ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn openalex_search_returns_results() {
    let client = OpenAlexClient::new(None);
    let resp = client.search("machine learning", 1, 5).await.unwrap();
    assert!(!resp.results.is_empty(), "expected OpenAlex search results");
}

#[tokio::test]
#[serial]
async fn openalex_get_work_by_id() {
    let client = OpenAlexClient::new(None);
    // "Attention Is All You Need" — well-known, stable OpenAlex ID
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    let title = work.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );
}

#[tokio::test]
#[serial]
async fn openalex_abstract_reconstruction() {
    let client = OpenAlexClient::new(None);
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    if let Some(abstract_text) = work.reconstruct_abstract() {
        assert!(
            abstract_text.len() > 20,
            "reconstructed abstract too short: {abstract_text}"
        );
    }
    // Some works may not have an inverted index — that's OK
}

#[tokio::test]
#[serial]
async fn openalex_to_research_paper() {
    let client = OpenAlexClient::new(None);
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty(), "expected non-empty title");
    assert!(!paper.authors.is_empty(), "expected authors");
}

// ── Crossref ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn crossref_search_returns_results() {
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
#[serial]
async fn crossref_get_work_by_doi() {
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
#[serial]
async fn crossref_to_research_paper() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();
    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty());
    assert!(paper.doi.is_some(), "expected DOI on crossref paper");
}

// ── CORE ──────────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn core_search_returns_results() {
    let client = CoreClient::new(None);
    let resp = client.search("deep learning", 5, 0).await.unwrap();
    assert!(!resp.results.is_empty(), "expected CORE search results");
}

#[tokio::test]
#[serial]
async fn core_get_work_and_convert() {
    let client = CoreClient::new(None);
    // Search first to get a valid ID
    let resp = client.search("neural networks", 1, 0).await.unwrap();
    if let Some(work) = resp.results.into_iter().next() {
        if let Some(id) = work.id {
            let fetched = client.get_work(&id.to_string()).await.unwrap();
            let paper: ResearchPaper = fetched.into();
            assert!(!paper.title.is_empty(), "expected non-empty title from CORE");
        }
    }
}

// ── Semantic Scholar ──────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn scholar_search_returns_results() {
    let client = SemanticScholarClient::new(None);
    let resp = client
        .search(
            "transformer architecture",
            research::scholar::types::SEARCH_FIELDS,
            5,
            0,
        )
        .await
        .unwrap();
    assert!(!resp.data.is_empty(), "expected Semantic Scholar results");
}

#[tokio::test]
#[serial]
async fn scholar_get_paper_by_id() {
    let client = SemanticScholarClient::new(None);
    // "Attention Is All You Need" S2 ID
    let paper = client
        .get_paper(
            "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
            research::scholar::types::PAPER_FIELDS_FULL,
        )
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
async fn scholar_to_research_paper() {
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(
            "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
            research::scholar::types::PAPER_FIELDS_FULL,
        )
        .await
        .unwrap();
    let rp: ResearchPaper = paper.into();
    assert!(!rp.title.is_empty());
    assert!(!rp.authors.is_empty());
}

use wiremock::matchers::{method, path, path_regex, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::core_api::CoreClient;

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/search/works/"))
        .and(query_param("q", "deep learning"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "totalHits": 10000,
            "limit": 5,
            "offset": 0,
            "results": [
                {
                    "id": 12345,
                    "title": "Deep Learning in Practice",
                    "abstract": "A comprehensive study.",
                    "doi": "10.1234/dl",
                    "yearPublished": 2021,
                    "citationCount": 200,
                    "authors": [{"name": "Alice"}, {"name": "Bob"}],
                    "downloadUrl": "https://example.com/dl.pdf",
                    "language": {"code": "en", "name": "English"}
                },
                {
                    "id": 67890,
                    "title": "Neural Networks Survey",
                    "yearPublished": 2020
                }
            ]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let resp = client.search("deep learning", 5, 0).await.unwrap();

    assert_eq!(resp.total_hits, Some(10000));
    assert_eq!(resp.results.len(), 2);
    assert_eq!(resp.results[0].title.as_deref(), Some("Deep Learning in Practice"));
    assert_eq!(resp.results[0].year_published, Some(2021));
    assert_eq!(resp.results[0].citation_count, Some(200));
    assert_eq!(resp.results[0].id, Some(12345));
    assert_eq!(
        resp.results[0].language.as_ref().and_then(|l| l.code.as_deref()),
        Some("en")
    );
}

// ── Successful get_work ────────────────────────────────────────────

#[tokio::test]
async fn get_work_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works/12345"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 12345,
            "title": "Specific Paper",
            "abstract": "Full abstract text.",
            "doi": "10.1234/specific",
            "yearPublished": 2023,
            "citationCount": 50,
            "authors": [{"name": "Charlie"}],
            "downloadUrl": "https://example.com/specific.pdf",
            "sourceFulltextUrls": ["https://example.com/alt.pdf"]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let work = client.get_work("12345").await.unwrap();

    assert_eq!(work.id, Some(12345));
    assert_eq!(work.title.as_deref(), Some("Specific Paper"));
    assert_eq!(work.abstract_text.as_deref(), Some("Full abstract text."));
    assert_eq!(work.doi.as_deref(), Some("10.1234/specific"));
    assert_eq!(work.year_published, Some(2023));
    assert_eq!(work.download_url.as_deref(), Some("https://example.com/specific.pdf"));
}

// ── Error: 500 ─────────────────────────────────────────────────────

#[tokio::test]
async fn search_500_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/search/works"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string("Internal Server Error"),
        )
        // 500 is retryable: 1 initial + 3 retries = 4 total attempts
        .expect(4)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 5, 0).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500: {err}");
}

// ── Error: 403 unauthorized ────────────────────────────────────────

#[tokio::test]
async fn search_403_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/search/works"))
        .respond_with(
            ResponseTemplate::new(403)
                .set_body_string("Forbidden: Invalid API key"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 5, 0).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("403"), "expected 403: {err}");
}

// ── Error: 404 on get_work ─────────────────────────────────────────

#[tokio::test]
async fn get_work_404_returns_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(
            ResponseTemplate::new(404)
                .set_body_string("Not Found"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let result = client.get_work("99999999").await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("404"), "expected 404: {err}");
}

// ── Empty results ──────────────────────────────────────────────────

#[tokio::test]
async fn search_empty_results() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/search/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "totalHits": 0,
            "limit": 5,
            "offset": 0,
            "results": []
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let resp = client.search("xyzzy_nonexistent", 5, 0).await.unwrap();

    assert_eq!(resp.total_hits, Some(0));
    assert!(resp.results.is_empty());
}

// ── JSON edge case: minimal work ───────────────────────────────────

#[tokio::test]
async fn get_work_minimal_fields() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 111
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let work = client.get_work("111").await.unwrap();

    assert_eq!(work.id, Some(111));
    assert!(work.title.is_none());
    assert!(work.doi.is_none());
    assert!(work.abstract_text.is_none());
    assert!(work.authors.is_none());
    assert!(work.year_published.is_none());
}

// ── Conversion to ResearchPaper ────────────────────────────────────

#[tokio::test]
async fn work_converts_to_research_paper() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 42,
            "title": "Conversion Test",
            "abstract": "Test abstract.",
            "doi": "10.1234/conv",
            "yearPublished": 2024,
            "citationCount": 10,
            "authors": [{"name": "Diana"}, {"name": "Eve"}],
            "downloadUrl": "https://example.com/conv.pdf"
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let work = client.get_work("42").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    assert_eq!(paper.title, "Conversion Test");
    assert_eq!(paper.year, Some(2024));
    assert_eq!(paper.doi.as_deref(), Some("10.1234/conv"));
    assert_eq!(paper.citation_count, Some(10));
    assert_eq!(paper.authors, vec!["Diana", "Eve"]);
    assert!(paper.pdf_url.as_deref().unwrap().contains("conv.pdf"));
    assert_eq!(paper.source_id, "42");
}

// ── Conversion: fallback to source_fulltext_urls when no download_url

#[tokio::test]
async fn work_uses_source_fulltext_urls_as_fallback() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 55,
            "title": "Fallback URL Test",
            "sourceFulltextUrls": ["https://example.com/alt.pdf"]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let work = client.get_work("55").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    assert_eq!(paper.pdf_url.as_deref(), Some("https://example.com/alt.pdf"));
}

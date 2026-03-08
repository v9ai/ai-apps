use std::time::Instant;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::scholar::SemanticScholarClient;
use research::openalex::OpenAlexClient;
use research::crossref::CrossrefClient;
use research::core_api::CoreClient;

// ── Semantic Scholar retry ───────────────────────────────────────────

#[tokio::test]
async fn scholar_retries_on_429_then_succeeds() {
    let server = MockServer::start().await;

    // First 2 requests return 429, third returns success
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(429))
        .up_to_n_times(2)
        .expect(2)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "offset": 0,
            "next": 1,
            "data": [{
                "paperId": "abc123",
                "title": "Test Paper",
                "year": 2023
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let start = Instant::now();
    let resp = client.search("test", "title,year", 5, 0).await.unwrap();
    let elapsed = start.elapsed();

    assert_eq!(resp.data.len(), 1);
    assert_eq!(resp.data[0].title.as_deref(), Some("Test Paper"));
    // Should have waited at least 1s (first backoff) + 2s (second backoff) = 3s
    assert!(elapsed.as_secs() >= 3, "expected backoff delay, got {elapsed:?}");
}

#[tokio::test]
async fn scholar_gives_up_after_max_retries() {
    let server = MockServer::start().await;

    // Always return 429
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(429))
        .expect(4) // initial + 3 retries
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let result = client.search("test", "title", 5, 0).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("Rate limited") || err.contains("429"), "expected rate limit error, got: {err}");
}

#[tokio::test]
async fn scholar_no_retry_on_non_429_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .expect(1) // should only be called once, no retry
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let result = client.search("test", "title", 5, 0).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500 error, got: {err}");
}

#[tokio::test]
async fn scholar_success_on_first_try() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 0,
            "offset": 0,
            "next": 0,
            "data": []
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", "title", 5, 0).await.unwrap();
    assert!(resp.data.is_empty());
}

// ── OpenAlex retry ───────────────────────────────────────────────────

#[tokio::test]
async fn openalex_retries_on_429_then_succeeds() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(429))
        .up_to_n_times(1)
        .expect(1)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [{
                "id": "https://openalex.org/W123",
                "title": "Test Work",
                "publication_year": 2023
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", 1, 5).await.unwrap();
    assert_eq!(resp.results.len(), 1);
}

#[tokio::test]
async fn openalex_gives_up_after_max_retries() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(429))
        .expect(4)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 1, 5).await;
    assert!(result.is_err());
}

// ── Crossref retry ───────────────────────────────────────────────────

#[tokio::test]
async fn crossref_retries_on_429_then_succeeds() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(429))
        .up_to_n_times(1)
        .expect(1)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "total-results": 1,
                "items": [{
                    "DOI": "10.1234/test",
                    "title": ["Test Paper"]
                }]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", 5, 0).await.unwrap();
    let items = resp.message.unwrap().items.unwrap();
    assert_eq!(items.len(), 1);
}

#[tokio::test]
async fn crossref_gives_up_after_max_retries() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(429))
        .expect(4)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 5, 0).await;
    assert!(result.is_err());
}

// ── CORE retry ───────────────────────────────────────────────────────

#[tokio::test]
async fn core_retries_on_429_then_succeeds() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/search/works"))
        .respond_with(ResponseTemplate::new(429))
        .up_to_n_times(1)
        .expect(1)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path_regex("/search/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "totalHits": 1,
            "results": [{
                "id": 12345,
                "title": "Test Paper"
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", 5, 0).await.unwrap();
    assert_eq!(resp.results.len(), 1);
}

#[tokio::test]
async fn core_gives_up_after_max_retries() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/search/works"))
        .respond_with(ResponseTemplate::new(429))
        .expect(4)
        .mount(&server)
        .await;

    let client = CoreClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 5, 0).await;
    assert!(result.is_err());
}

// ── Backoff timing ───────────────────────────────────────────────────

#[tokio::test]
async fn scholar_backoff_uses_exponential_delay() {
    let server = MockServer::start().await;

    // Return 429 twice, then succeed
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/"))
        .respond_with(ResponseTemplate::new(429))
        .up_to_n_times(2)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "paperId": "test123",
            "title": "Backoff Test"
        })))
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let start = Instant::now();
    let paper = client.get_paper("test123", "title").await.unwrap();
    let elapsed = start.elapsed();

    assert_eq!(paper.title.as_deref(), Some("Backoff Test"));
    // 2^0 = 1s + 2^1 = 2s = 3s minimum
    assert!(elapsed.as_secs() >= 3, "expected >=3s backoff, got {elapsed:?}");
    // Should not take too much longer (allow some slack)
    assert!(elapsed.as_secs() < 8, "backoff took too long: {elapsed:?}");
}

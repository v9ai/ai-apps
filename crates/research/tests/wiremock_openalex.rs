use wiremock::matchers::{method, path, path_regex, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::openalex::OpenAlexClient;

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works"))
        .and(query_param("search", "deep learning"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "meta": {
                "count": 5000,
                "per_page": 5,
                "page": 1
            },
            "results": [
                {
                    "id": "https://openalex.org/W1111",
                    "title": "Deep Learning Review",
                    "publication_year": 2015,
                    "cited_by_count": 30000,
                    "doi": "https://doi.org/10.1234/dl",
                    "authorships": [
                        {"author": {"id": "A1", "display_name": "Yann LeCun"}, "author_position": "first"}
                    ]
                },
                {
                    "id": "https://openalex.org/W2222",
                    "title": "Another Paper",
                    "publication_year": 2020,
                    "cited_by_count": 100
                }
            ]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let resp = client.search("deep learning", 1, 5).await.unwrap();

    assert_eq!(resp.results.len(), 2);
    assert_eq!(resp.results[0].title.as_deref(), Some("Deep Learning Review"));
    assert_eq!(resp.results[0].publication_year, Some(2015));
    assert_eq!(resp.results[0].cited_by_count, Some(30000));

    let meta = resp.meta.unwrap();
    assert_eq!(meta.count, Some(5000));
    assert_eq!(meta.per_page, Some(5));
}

// ── Get work by ID ─────────────────────────────────────────────────

#[tokio::test]
async fn get_work_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works/https://openalex.org/W1111"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W1111",
            "title": "Test Work",
            "publication_year": 2023,
            "cited_by_count": 50,
            "doi": "https://doi.org/10.1234/test",
            "authorships": [
                {"author": {"id": "A1", "display_name": "Alice"}, "author_position": "first"},
                {"author": {"id": "A2", "display_name": "Bob"}, "author_position": "last"}
            ],
            "abstract_inverted_index": {
                "This": [0],
                "is": [1],
                "a": [2],
                "test": [3],
                "abstract": [4]
            },
            "primary_location": {
                "source": {"id": "S1", "display_name": "Nature"},
                "pdf_url": "https://example.com/paper.pdf",
                "landing_page_url": "https://example.com/paper"
            },
            "open_access": {"is_oa": true, "oa_url": "https://example.com/oa"}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let work = client.get_work("https://openalex.org/W1111").await.unwrap();

    assert_eq!(work.title.as_deref(), Some("Test Work"));
    assert_eq!(work.publication_year, Some(2023));
    assert_eq!(work.cited_by_count, Some(50));

    // Test abstract reconstruction
    let abstract_text = work.reconstruct_abstract().unwrap();
    assert_eq!(abstract_text, "This is a test abstract");
}

// ── Error: 500 ─────────────────────────────────────────────────────

#[tokio::test]
async fn search_500_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string("Service Unavailable"),
        )
        // 500 is retryable: 1 initial + 3 retries = 4 total attempts
        .expect(4)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 1, 5).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500: {err}");
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

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let result = client.get_work("https://openalex.org/Wnonexistent").await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("404"), "expected 404: {err}");
}

// ── Empty results ──────────────────────────────────────────────────

#[tokio::test]
async fn search_empty_results() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "meta": {"count": 0, "per_page": 5, "page": 1},
            "results": []
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let resp = client.search("nonexistent_term_xyz", 1, 5).await.unwrap();

    assert!(resp.results.is_empty());
    assert_eq!(resp.meta.unwrap().count, Some(0));
}

// ── JSON edge case: minimal work with only required fields ─────────

#[tokio::test]
async fn get_work_minimal_fields() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W999"
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let work = client.get_work("https://openalex.org/W999").await.unwrap();

    assert_eq!(work.id.as_deref(), Some("https://openalex.org/W999"));
    assert!(work.title.is_none());
    assert!(work.publication_year.is_none());
    assert!(work.cited_by_count.is_none());
    assert!(work.abstract_inverted_index.is_none());
    assert!(work.reconstruct_abstract().is_none());
}

// ── Abstract reconstruction: empty inverted index ──────────────────

#[tokio::test]
async fn get_work_empty_abstract_inverted_index() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W888",
            "title": "No Abstract Paper",
            "abstract_inverted_index": {}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let work = client.get_work("https://openalex.org/W888").await.unwrap();

    // Empty map should return None from reconstruct_abstract
    assert!(work.reconstruct_abstract().is_none());
}

// ── Conversion to ResearchPaper ────────────────────────────────────

#[tokio::test]
async fn work_converts_to_research_paper() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W777",
            "title": "Conversion Test",
            "publication_year": 2024,
            "cited_by_count": 10,
            "doi": "https://doi.org/10.1234/conv",
            "authorships": [
                {"author": {"display_name": "Charlie"}}
            ],
            "primary_location": {
                "pdf_url": "https://example.com/conv.pdf",
                "landing_page_url": "https://example.com/conv"
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = OpenAlexClient::with_base_url(&server.uri(), None);
    let work = client.get_work("https://openalex.org/W777").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    assert_eq!(paper.title, "Conversion Test");
    assert_eq!(paper.year, Some(2024));
    assert_eq!(paper.citation_count, Some(10));
    assert_eq!(paper.authors, vec!["Charlie"]);
    assert!(paper.pdf_url.as_deref().unwrap().contains("conv.pdf"));
}

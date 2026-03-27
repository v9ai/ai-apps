use wiremock::matchers::{method, path, path_regex, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::scholar::SemanticScholarClient;

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/search"))
        .and(query_param("query", "attention"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 42,
            "offset": 0,
            "next": 5,
            "data": [
                {
                    "paperId": "abc123",
                    "title": "Attention Is All You Need",
                    "year": 2017,
                    "citationCount": 90000,
                    "authors": [{"authorId": "1", "name": "Ashish Vaswani"}],
                    "fieldsOfStudy": ["Computer Science"],
                    "url": "https://example.com/paper",
                    "isOpenAccess": true
                },
                {
                    "paperId": "def456",
                    "title": "Self-Attention Networks",
                    "year": 2020,
                    "citationCount": 100
                }
            ]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.search("attention", "title,year", 5, 0).await.unwrap();

    assert_eq!(resp.total, Some(42));
    assert_eq!(resp.data.len(), 2);
    assert_eq!(resp.data[0].title.as_deref(), Some("Attention Is All You Need"));
    assert_eq!(resp.data[0].year, Some(2017));
    assert_eq!(resp.data[0].citation_count, Some(90000));
    assert_eq!(resp.data[1].paper_id.as_deref(), Some("def456"));
}

// ── Successful bulk search ─────────────────────────────────────────

#[tokio::test]
async fn bulk_search_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/search/bulk"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1000,
            "token": "next_page_token",
            "data": [{
                "paperId": "bulk1",
                "title": "Bulk Result",
                "year": 2024,
                "citationCount": 50
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client
        .search_bulk("test", "title,year", None, None, None, 10)
        .await
        .unwrap();

    assert_eq!(resp.total, Some(1000));
    assert_eq!(resp.token.as_deref(), Some("next_page_token"));
    assert_eq!(resp.data.len(), 1);
}

// ── Get paper by ID ────────────────────────────────────────────────

#[tokio::test]
async fn get_paper_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/abc123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "paperId": "abc123",
            "title": "Test Paper",
            "abstract": "This is an abstract.",
            "year": 2023,
            "citationCount": 42,
            "influentialCitationCount": 5,
            "tldr": {"model": "tldr@v2", "text": "A test paper about testing."},
            "authors": [
                {"authorId": "a1", "name": "Alice"},
                {"authorId": "a2", "name": "Bob"}
            ],
            "fieldsOfStudy": ["Computer Science", "Mathematics"],
            "url": "https://example.com/paper/abc123",
            "isOpenAccess": true,
            "openAccessPdf": {"url": "https://example.com/paper/abc123.pdf", "status": "GREEN"},
            "venue": "NeurIPS",
            "publicationDate": "2023-06-15"
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let paper = client.get_paper("abc123", "title,abstract,year").await.unwrap();

    assert_eq!(paper.paper_id.as_deref(), Some("abc123"));
    assert_eq!(paper.title.as_deref(), Some("Test Paper"));
    assert_eq!(paper.abstract_text.as_deref(), Some("This is an abstract."));
    assert_eq!(paper.year, Some(2023));
    assert_eq!(paper.citation_count, Some(42));
    assert_eq!(paper.influential_citation_count, Some(5));
    assert_eq!(
        paper.tldr.as_ref().and_then(|t| t.text.as_deref()),
        Some("A test paper about testing.")
    );
    assert_eq!(paper.authors.as_ref().unwrap().len(), 2);
    assert_eq!(paper.venue.as_deref(), Some("NeurIPS"));
    assert!(paper.is_open_access.unwrap());
    assert!(paper.open_access_pdf.as_ref().unwrap().url.as_deref().unwrap().contains("pdf"));
}

// ── Get citations ──────────────────────────────────────────────────

#[tokio::test]
async fn get_citations_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/abc123/citations"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "data": [
                {
                    "citingPaper": {"paperId": "cit1", "title": "Citing Paper 1"},
                    "intents": ["methodology"],
                    "isInfluential": true
                }
            ],
            "next": 1,
            "offset": 0
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.get_citations("abc123", "title", 10).await.unwrap();

    assert_eq!(resp.data.len(), 1);
    assert!(resp.data[0].is_influential.unwrap());
    assert_eq!(
        resp.data[0].intents.as_deref(),
        Some(vec!["methodology".to_string()].as_slice())
    );
}

// ── Get references ─────────────────────────────────────────────────

#[tokio::test]
async fn get_references_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/abc123/references"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "data": [
                {
                    "citedPaper": {"paperId": "ref1", "title": "Referenced Paper"},
                    "isInfluential": false
                }
            ],
            "next": null,
            "offset": 0
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.get_references("abc123", "title", 10).await.unwrap();

    assert_eq!(resp.data.len(), 1);
    assert!(!resp.data[0].is_influential.unwrap());
}

// ── Get recommendations ────────────────────────────────────────────

#[tokio::test]
async fn get_recommendations_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/recommendations/v1/papers/forpaper/abc123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "recommendedPapers": [
                {"paperId": "rec1", "title": "Recommended Paper 1", "year": 2022},
                {"paperId": "rec2", "title": "Recommended Paper 2", "year": 2023}
            ]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.get_recommendations("abc123", "title,year", 5).await.unwrap();

    assert_eq!(resp.recommended_papers.len(), 2);
    assert_eq!(resp.recommended_papers[0].title.as_deref(), Some("Recommended Paper 1"));
}

// ── Error: non-429 status code ─────────────────────────────────────

#[tokio::test]
async fn search_500_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string("Internal Server Error"),
        )
        // S2 client does not retry on server errors, only on 429
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let result = client.search("test", "title", 5, 0).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500 in error: {err}");
}

#[tokio::test]
async fn get_paper_404_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/"))
        .respond_with(
            ResponseTemplate::new(404)
                .set_body_string("{\"error\": \"Paper not found\"}"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let result = client.get_paper("nonexistent", "title").await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("404"), "expected 404: {err}");
}

// ── Empty results ──────────────────────────────────────────────────

#[tokio::test]
async fn search_empty_results() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 0,
            "offset": 0,
            "next": null,
            "data": []
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.search("xyzzy_nonexistent", "title", 5, 0).await.unwrap();

    assert_eq!(resp.total, Some(0));
    assert!(resp.data.is_empty());
}

// ── JSON edge case: all optional fields null ───────────────────────

#[tokio::test]
async fn search_minimal_paper_fields() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "data": [{
                "paperId": "minimal"
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", "paperId", 1, 0).await.unwrap();

    assert_eq!(resp.data.len(), 1);
    let p = &resp.data[0];
    assert_eq!(p.paper_id.as_deref(), Some("minimal"));
    assert!(p.title.is_none());
    assert!(p.year.is_none());
    assert!(p.citation_count.is_none());
    assert!(p.authors.is_none());
}

// ── JSON edge case: extra unknown fields ignored ───────────────────

#[tokio::test]
async fn search_ignores_unknown_json_fields() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "offset": 0,
            "next": 1,
            "someNewApiField": true,
            "data": [{
                "paperId": "extra",
                "title": "Paper With Extra Fields",
                "brandNewField": {"nested": true}
            }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    // This relies on serde_json::from_value which should ignore unknown fields
    // for structs with Default or #[serde(default)] — Paper has Default
    let resp = client.search("test", "title", 1, 0).await.unwrap();
    assert_eq!(resp.data.len(), 1);
    assert_eq!(resp.data[0].title.as_deref(), Some("Paper With Extra Fields"));
}

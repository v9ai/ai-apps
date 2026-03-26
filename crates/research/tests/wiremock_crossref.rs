use wiremock::matchers::{method, path, path_regex, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::crossref::CrossrefClient;

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works"))
        .and(query_param("query", "CRISPR"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "total-results": 500,
                "items": [
                    {
                        "DOI": "10.1038/test1",
                        "title": ["CRISPR Gene Editing"],
                        "abstract": "A study about CRISPR.",
                        "author": [
                            {"given": "Jennifer", "family": "Doudna"},
                            {"given": "Feng", "family": "Zhang"}
                        ],
                        "published": {"date-parts": [[2013, 2, 15]]},
                        "is-referenced-by-count": 5000,
                        "URL": "https://doi.org/10.1038/test1",
                        "container-title": ["Nature"],
                        "type": "journal-article"
                    }
                ]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let resp = client.search("CRISPR", 5, 0).await.unwrap();

    let msg = resp.message.unwrap();
    assert_eq!(msg.total_results, Some(500));
    let items = msg.items.unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].doi.as_deref(), Some("10.1038/test1"));
    assert_eq!(
        items[0].title.as_ref().and_then(|t| t.first()).map(|s| s.as_str()),
        Some("CRISPR Gene Editing")
    );
    assert_eq!(items[0].is_referenced_by_count, Some(5000));
}

// ── Successful get_work by DOI ─────────────────────────────────────

#[tokio::test]
async fn get_work_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works/10.1234/test"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "DOI": "10.1234/test",
                "title": ["Test Paper Title"],
                "abstract": "A great paper.",
                "author": [{"given": "Alice", "family": "Smith"}],
                "published": {"date-parts": [[2023]]},
                "is-referenced-by-count": 42,
                "URL": "https://doi.org/10.1234/test",
                "link": [{"URL": "https://example.com/paper.pdf", "content-type": "application/pdf"}]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let work = client.get_work("10.1234/test").await.unwrap();

    assert_eq!(work.doi.as_deref(), Some("10.1234/test"));
    assert_eq!(
        work.title.as_ref().and_then(|t| t.first()).map(|s| s.as_str()),
        Some("Test Paper Title")
    );
    assert_eq!(work.is_referenced_by_count, Some(42));
    assert_eq!(
        work.published.as_ref().and_then(|d| d.year()),
        Some(2023)
    );
}

// ── Error: 500 ─────────────────────────────────────────────────────

#[tokio::test]
async fn search_500_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string("Internal Server Error"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 5, 0).await;

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
                .set_body_string("Resource not found"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let result = client.get_work("10.9999/nonexistent").await;

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
            "status": "ok",
            "message": {
                "total-results": 0,
                "items": []
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let resp = client.search("xyzzy_nonexistent", 5, 0).await.unwrap();

    let msg = resp.message.unwrap();
    assert_eq!(msg.total_results, Some(0));
    assert!(msg.items.unwrap().is_empty());
}

// ── JSON edge case: author with only family name ───────────────────

#[tokio::test]
async fn get_work_author_family_only() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "DOI": "10.1234/family",
                "title": ["Family Only Author"],
                "author": [
                    {"family": "Organization Name"},
                    {"given": "Solo"},
                    {"given": "Full", "family": "Name"}
                ]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let work = client.get_work("10.1234/family").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    assert_eq!(paper.authors.len(), 3);
    assert_eq!(paper.authors[0], "Organization Name");
    assert_eq!(paper.authors[1], "Solo");
    assert_eq!(paper.authors[2], "Full Name");
}

// ── Mailto parameter is sent ───────────────────────────────────────

#[tokio::test]
async fn search_sends_mailto_param() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/works"))
        .and(query_param("mailto", "test@example.com"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {"total-results": 0, "items": []}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), Some("test@example.com"));
    let resp = client.search("test", 5, 0).await.unwrap();

    // If the mailto param wasn't sent, the mock wouldn't match and we'd get 404
    assert_eq!(resp.message.unwrap().total_results, Some(0));
}

// ── Conversion: JATS tags in abstract stripped ─────────────────────

#[tokio::test]
async fn get_work_jats_abstract_stripped_on_conversion() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "DOI": "10.1234/jats",
                "title": ["JATS Paper"],
                "abstract": "<jats:p>Results show <jats:bold>significance</jats:bold> in the data.</jats:p>"
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let work = client.get_work("10.1234/jats").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    let abs = paper.abstract_text.unwrap();
    assert!(!abs.contains('<'), "JATS tags should be stripped: {abs}");
    assert!(abs.contains("significance"));
    assert!(abs.contains("Results"));
}

// ── DateParts edge cases ───────────────────────────────────────────

#[tokio::test]
async fn get_work_date_parts_extraction() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "DOI": "10.1234/dates",
                "title": ["Date Test"],
                "published": {"date-parts": [[2020, 6]]}
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = CrossrefClient::with_base_url(&server.uri(), None);
    let work = client.get_work("10.1234/dates").await.unwrap();

    let paper: research::ResearchPaper = work.into();
    assert_eq!(paper.year, Some(2020));
}

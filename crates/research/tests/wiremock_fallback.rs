use wiremock::matchers::{method, path, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::agent::Tool;
use research::crossref::CrossrefClient;
use research::openalex::OpenAlexClient;
use research::scholar::SemanticScholarClient;
use research::tools::{FallbackClients, GetPaperDetail, SearchPapers, SearchToolConfig};

// ── SearchPapers: prefers OpenAlex when available ──────────────────

#[tokio::test]
async fn search_prefers_openalex_over_s2() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // S2 should NOT be called when OpenAlex has results
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1, "data": [{"paperId": "s2paper", "title": "S2 Paper"}]
        })))
        .expect(0)
        .mount(&s2_server)
        .await;

    // OpenAlex returns results
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [{
                "id": "https://openalex.org/W1",
                "title": "OpenAlex Paper",
                "publication_year": 2024
            }]
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = SearchPapers::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"query": "test"}))
        .await
        .unwrap();

    assert!(result.contains("OpenAlex Paper"));
    assert!(result.contains("OpenAlex"));
}

// ── SearchPapers: falls through OpenAlex -> Crossref -> S2 ────────

#[tokio::test]
async fn search_full_fallback_chain_to_s2() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // OpenAlex returns empty
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": []
        })))
        .mount(&oa_server)
        .await;

    // Crossref returns empty
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {"total-results": 0, "items": []}
        })))
        .mount(&cr_server)
        .await;

    // S2 is the final fallback and returns results
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "data": [{
                "paperId": "s2final",
                "title": "S2 Final Fallback",
                "year": 2024,
                "citationCount": 10
            }]
        })))
        .expect(1)
        .mount(&s2_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = SearchPapers::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"query": "rare topic"}))
        .await
        .unwrap();

    assert!(result.contains("S2 Final Fallback"));
    assert!(result.contains("SemanticScholar"));
}

// ── SearchPapers: without fallback uses S2 directly ────────────────

#[tokio::test]
async fn search_without_fallback_uses_s2() {
    let s2_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "data": [{
                "paperId": "direct",
                "title": "Direct S2 Result",
                "citationCount": 5
            }]
        })))
        .expect(1)
        .mount(&s2_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let tool = SearchPapers::with_config(s2, SearchToolConfig::default());

    let result = tool
        .call_json(serde_json::json!({"query": "direct test"}))
        .await
        .unwrap();

    assert!(result.contains("Direct S2 Result"));
}

// ── SearchPapers: respects limit parameter ─────────────────────────

#[tokio::test]
async fn search_respects_limit() {
    let s2_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 3,
            "data": [
                {"paperId": "a", "title": "Paper A"},
                {"paperId": "b", "title": "Paper B"},
                {"paperId": "c", "title": "Paper C"}
            ]
        })))
        .expect(1)
        .mount(&s2_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let tool = SearchPapers::new(s2);

    let result = tool
        .call_json(serde_json::json!({"query": "test", "limit": 3}))
        .await
        .unwrap();

    assert!(result.contains("Paper A"));
    assert!(result.contains("Paper B"));
    assert!(result.contains("Paper C"));
    assert!(result.contains("\"returned\": 3"));
}

// ── GetPaperDetail: DOI lookup via OpenAlex first ──────────────────

#[tokio::test]
async fn detail_doi_lookup_via_openalex() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // OpenAlex handles DOI lookup
    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W555",
            "title": "DOI Paper from OpenAlex",
            "publication_year": 2023,
            "cited_by_count": 100,
            "doi": "https://doi.org/10.1234/test"
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    // S2 should NOT be called
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "paperId": "s2", "title": "S2 Paper"
        })))
        .expect(0)
        .mount(&s2_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = GetPaperDetail::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"paper_id": "DOI:10.1234/test"}))
        .await
        .unwrap();

    assert!(result.contains("DOI Paper from OpenAlex"));
}

// ── GetPaperDetail: DOI fallback to Crossref ───────────────────────

#[tokio::test]
async fn detail_doi_fallback_to_crossref() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // OpenAlex fails
    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(404).set_body_string("Not found"))
        .mount(&oa_server)
        .await;

    // Crossref handles the DOI
    Mock::given(method("GET"))
        .and(path("/works/10.1234/fallback"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "DOI": "10.1234/fallback",
                "title": ["Crossref DOI Paper"],
                "is-referenced-by-count": 50
            }
        })))
        .expect(1)
        .mount(&cr_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = GetPaperDetail::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"paper_id": "DOI:10.1234/fallback"}))
        .await
        .unwrap();

    assert!(result.contains("Crossref DOI Paper"));
}

// ── GetPaperDetail: non-DOI goes straight to S2 ───────────────────

#[tokio::test]
async fn detail_non_doi_uses_s2() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // S2 returns paper
    Mock::given(method("GET"))
        .and(path("/graph/v1/paper/abc123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "paperId": "abc123",
            "title": "S2 Paper Detail",
            "year": 2023,
            "citationCount": 42,
            "authors": [{"name": "Alice"}],
            "url": "https://example.com"
        })))
        .expect(1)
        .mount(&s2_server)
        .await;

    // OpenAlex/Crossref should NOT be called for non-DOI
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&oa_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = GetPaperDetail::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"paper_id": "abc123"}))
        .await
        .unwrap();

    assert!(result.contains("S2 Paper Detail"));
    assert!(result.contains("Alice"));
}

// ── GetPaperDetail: bare DOI starting with 10. ─────────────────────

#[tokio::test]
async fn detail_bare_doi_detected() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/works/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "https://openalex.org/W999",
            "title": "Bare DOI Paper",
            "publication_year": 2024
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = GetPaperDetail::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"paper_id": "10.1234/bare"}))
        .await
        .unwrap();

    assert!(result.contains("Bare DOI Paper"));
}

// ── SearchPapers: OpenAlex error is gracefully handled ─────────────

#[tokio::test]
async fn search_openalex_error_falls_through() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // OpenAlex returns 500
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Server Error"))
        .mount(&oa_server)
        .await;

    // Crossref also returns 500
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Server Error"))
        .mount(&cr_server)
        .await;

    // S2 returns results (final fallback)
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1,
            "data": [{"paperId": "fallback_s2", "title": "S2 After Errors"}]
        })))
        .expect(1)
        .mount(&s2_server)
        .await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = SearchPapers::with_fallback(s2, SearchToolConfig::default(), fallback);
    let result = tool
        .call_json(serde_json::json!({"query": "resilience test"}))
        .await
        .unwrap();

    assert!(result.contains("S2 After Errors"));
}

// ── SearchPapers: invalid args returns error ───────────────────────

#[tokio::test]
async fn search_invalid_args_returns_error() {
    let s2_server = MockServer::start().await;

    let s2 = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let tool = SearchPapers::new(s2);

    // Missing required "query" field
    let result = tool
        .call_json(serde_json::json!({"limit": 5}))
        .await;

    assert!(result.is_err());
}

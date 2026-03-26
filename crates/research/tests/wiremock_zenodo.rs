use wiremock::matchers::{method, path, path_regex, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::zenodo::ZenodoClient;

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records"))
        .and(query_param("q", "climate modeling"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "hits": {
                "total": 150,
                "hits": [
                    {
                        "id": 12345,
                        "doi": "10.5281/zenodo.12345",
                        "title": "Climate Modeling With ML",
                        "metadata": {
                            "title": "Climate Modeling With ML",
                            "description": "<p>A novel approach to <em>climate</em> modeling.</p>",
                            "publication_date": "2024-06-15",
                            "doi": "10.5281/zenodo.12345",
                            "access_right": "open",
                            "creators": [
                                {"name": "Smith, John", "affiliation": "MIT"},
                                {"name": "Doe, Jane", "orcid": "0000-0001-2345-6789"}
                            ],
                            "keywords": ["climate", "machine learning", "modeling"],
                            "resource_type": {"type": "publication", "subtype": "article", "title": "Journal article"},
                            "license": {"id": "cc-by-4.0"}
                        },
                        "files": [{
                            "id": "f1",
                            "key": "paper.pdf",
                            "size": 2048000,
                            "links": {"self": "https://zenodo.org/api/records/12345/files/paper.pdf/content"}
                        }],
                        "links": {
                            "self": "https://zenodo.org/api/records/12345",
                            "self_html": "https://zenodo.org/records/12345",
                            "doi": "https://doi.org/10.5281/zenodo.12345"
                        },
                        "stats": {"downloads": 200, "views": 500}
                    },
                    {
                        "id": 67890,
                        "title": "Dataset for Climate Research",
                        "metadata": {
                            "title": "Dataset for Climate Research",
                            "description": "Supplementary dataset.",
                            "publication_date": "2023-01-01",
                            "creators": [{"name": "Chen, Wei"}],
                            "resource_type": {"type": "dataset", "title": "Dataset"}
                        },
                        "links": {
                            "self_html": "https://zenodo.org/records/67890"
                        }
                    }
                ]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let resp = client.search("climate modeling", 1, 10).await.unwrap();

    let hits = resp.hits.unwrap();
    assert_eq!(hits.total.unwrap(), 150);
    assert_eq!(hits.hits.len(), 2);

    let first = &hits.hits[0];
    assert_eq!(first.id.unwrap(), 12345);
    assert_eq!(first.doi.as_deref().unwrap(), "10.5281/zenodo.12345");

    let meta = first.metadata.as_ref().unwrap();
    assert_eq!(meta.title.as_deref().unwrap(), "Climate Modeling With ML");
    assert_eq!(meta.keywords.as_ref().unwrap().len(), 3);

    // PDF URL extraction
    assert!(first.pdf_url().unwrap().contains("paper.pdf"));

    // Plain description strips HTML
    let desc = first.plain_description().unwrap();
    assert!(!desc.contains('<'));
    assert!(desc.contains("climate"));
}

// ── Get record by ID ─────────────────────────────────────────────

#[tokio::test]
async fn get_record_success() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records/12345"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 12345,
            "doi": "10.5281/zenodo.12345",
            "metadata": {
                "title": "Full Record Test",
                "description": "<p>Full description here.</p>",
                "publication_date": "2024-03-15",
                "doi": "10.5281/zenodo.12345",
                "access_right": "open",
                "creators": [
                    {"name": "Author, A", "affiliation": "University X", "orcid": "0000-0002-0000-0001"}
                ],
                "keywords": ["test", "zenodo"],
                "resource_type": {"type": "publication", "subtype": "preprint", "title": "Preprint"},
                "license": {"id": "cc-by-4.0"},
                "journal": {
                    "title": "arXiv",
                    "volume": "2024"
                },
                "related_identifiers": [{
                    "identifier": "10.1038/ncomms12345",
                    "relation": "isSupplementTo",
                    "scheme": "doi"
                }],
                "subjects": [{"term": "Computer Science", "scheme": "url"}],
                "language": "eng",
                "version": "v1.0"
            },
            "files": [
                {"id": "f1", "key": "article.pdf", "size": 512000, "checksum": "md5:abc123",
                 "links": {"self": "https://zenodo.org/api/records/12345/files/article.pdf/content"}},
                {"id": "f2", "key": "data.zip", "size": 8192000,
                 "links": {"self": "https://zenodo.org/api/records/12345/files/data.zip/content"}}
            ],
            "links": {
                "self": "https://zenodo.org/api/records/12345",
                "self_html": "https://zenodo.org/records/12345",
                "doi": "https://doi.org/10.5281/zenodo.12345"
            },
            "stats": {
                "downloads": 1000,
                "unique_downloads": 800,
                "views": 5000,
                "unique_views": 4000
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let record = client.get_record(12345).await.unwrap();

    assert_eq!(record.id.unwrap(), 12345);

    let meta = record.metadata.as_ref().unwrap();
    assert_eq!(meta.publication_date.as_deref().unwrap(), "2024-03-15");
    assert_eq!(meta.access_right.as_deref().unwrap(), "open");
    assert_eq!(meta.language.as_deref().unwrap(), "eng");
    assert_eq!(meta.version.as_deref().unwrap(), "v1.0");

    let journal = meta.journal.as_ref().unwrap();
    assert_eq!(journal.title.as_deref().unwrap(), "arXiv");

    let related = meta.related_identifiers.as_ref().unwrap();
    assert_eq!(related[0].relation.as_deref().unwrap(), "isSupplementTo");

    let subjects = meta.subjects.as_ref().unwrap();
    assert_eq!(subjects[0].term.as_deref().unwrap(), "Computer Science");

    // Files
    let files = record.files.as_ref().unwrap();
    assert_eq!(files.len(), 2);
    assert_eq!(files[0].checksum.as_deref().unwrap(), "md5:abc123");

    // PDF URL (picks first .pdf file)
    assert!(record.pdf_url().unwrap().contains("article.pdf"));

    // Stats
    let stats = record.stats.as_ref().unwrap();
    assert_eq!(stats.downloads.unwrap(), 1000);
    assert_eq!(stats.unique_views.unwrap(), 4000);
}

// ── Error: 500 ─────────────────────────────────────────────────────

#[tokio::test]
async fn search_500_returns_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/records"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .expect(4) // 1 initial + 3 retries
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 1, 10).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500: {err}");
}

// ── Error: 404 on get_record ─────────────────────────────────────

#[tokio::test]
async fn get_record_404_returns_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records/99999"))
        .respond_with(ResponseTemplate::new(404).set_body_string("Not Found"))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let result = client.get_record(99999).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("404"), "expected 404: {err}");
}

// ── Empty results ──────────────────────────────────────────────────

#[tokio::test]
async fn search_empty_results() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "hits": {"total": 0, "hits": []}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let resp = client.search("nonexistent_xyz_abc", 1, 10).await.unwrap();

    let hits = resp.hits.unwrap();
    assert_eq!(hits.total.unwrap(), 0);
    assert!(hits.hits.is_empty());
}

// ── Minimal record with only required fields ─────────────────────

#[tokio::test]
async fn get_record_minimal_fields() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records/11111"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 11111,
            "metadata": {
                "title": "Minimal Record",
                "creators": [{"name": "Solo, Author"}],
                "resource_type": {"type": "other"}
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let record = client.get_record(11111).await.unwrap();

    assert_eq!(record.id.unwrap(), 11111);
    assert!(record.doi.is_none());
    assert!(record.files.is_none());
    assert!(record.stats.is_none());
    assert!(record.pdf_url().is_none());
    assert!(record.plain_description().is_none());

    let meta = record.metadata.unwrap();
    assert_eq!(meta.title.as_deref().unwrap(), "Minimal Record");
    assert!(meta.keywords.is_none());
    assert!(meta.journal.is_none());
    assert!(meta.related_identifiers.is_none());
}

// ── Filtered search with type and sort ───────────────────────────

#[tokio::test]
async fn search_filtered_with_type_and_sort() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records"))
        .and(query_param("q", "neural networks"))
        .and(query_param("type", "dataset"))
        .and(query_param("sort", "mostrecent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "hits": {
                "total": 5,
                "hits": [{
                    "id": 99999,
                    "metadata": {
                        "title": "Neural Network Dataset",
                        "creators": [{"name": "Researcher, A"}],
                        "resource_type": {"type": "dataset", "title": "Dataset"}
                    }
                }]
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let resp = client
        .search_filtered("neural networks", Some("dataset"), Some("mostrecent"), 1, 10)
        .await
        .unwrap();

    let hits = resp.hits.unwrap();
    assert_eq!(hits.total.unwrap(), 5);
    assert_eq!(hits.hits.len(), 1);
    assert_eq!(
        hits.hits[0].metadata.as_ref().unwrap().resource_type.as_ref().unwrap().resource_type.as_deref().unwrap(),
        "dataset"
    );
}

// ── Conversion to ResearchPaper ──────────────────────────────────

#[tokio::test]
async fn record_converts_to_research_paper() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records/55555"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 55555,
            "doi": "10.5281/zenodo.55555",
            "metadata": {
                "title": "Conversion Test Paper",
                "description": "<p>Testing the <strong>From</strong> conversion.</p>",
                "publication_date": "2025-01-20",
                "doi": "10.5281/zenodo.55555",
                "creators": [
                    {"name": "Alpha, A"},
                    {"name": "Beta, B"}
                ],
                "keywords": ["testing", "rust"],
                "resource_type": {"type": "publication", "subtype": "article", "title": "Journal article"}
            },
            "files": [{
                "key": "manuscript.pdf",
                "links": {"self": "https://zenodo.org/api/records/55555/files/manuscript.pdf/content"}
            }],
            "links": {
                "self_html": "https://zenodo.org/records/55555"
            }
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let record = client.get_record(55555).await.unwrap();

    let paper: research::ResearchPaper = record.into();
    assert_eq!(paper.title, "Conversion Test Paper");
    assert_eq!(paper.year, Some(2025));
    assert_eq!(paper.doi.as_deref(), Some("10.5281/zenodo.55555"));
    assert_eq!(paper.authors, vec!["Alpha, A", "Beta, B"]);
    assert_eq!(paper.source_id, "55555");
    assert_eq!(paper.published_date.as_deref(), Some("2025-01-20"));
    assert!(paper.pdf_url.as_deref().unwrap().contains("manuscript.pdf"));
    assert_eq!(paper.url.as_deref(), Some("https://zenodo.org/records/55555"));

    // Abstract should have HTML stripped
    let abs = paper.abstract_text.as_ref().unwrap();
    assert!(!abs.contains('<'));
    assert!(abs.contains("From"));

    // Keywords become fields_of_study
    assert_eq!(paper.fields_of_study.as_ref().unwrap(), &["testing", "rust"]);

    // Primary category from resource_type.title
    assert_eq!(paper.primary_category.as_deref(), Some("Journal article"));

    // Categories from resource_type
    let cats = paper.categories.as_ref().unwrap();
    assert!(cats.contains(&"publication".to_string()));
    assert!(cats.contains(&"article".to_string()));

    // Source is Zenodo
    assert!(matches!(paper.source, research::paper::PaperSource::Zenodo));
}

// ── Rate limited (429) ───────────────────────────────────────────

#[tokio::test]
async fn search_rate_limited() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/records"))
        .respond_with(ResponseTemplate::new(429).set_body_string("Too Many Requests"))
        .expect(1..)
        .mount(&server)
        .await;

    let client = ZenodoClient::with_base_url(&server.uri(), None);
    let result = client.search("test", 1, 10).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(
        matches!(err, research::zenodo::Error::RateLimited { .. } | research::zenodo::Error::Api { .. }),
        "expected rate limit or api error, got: {err:?}"
    );
}

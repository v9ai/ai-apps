use std::time::Duration;

use crate::retry::{retry_get, RetryConfig};

use super::{
    error::Error,
    types::{ZenodoRecord, ZenodoSearchResponse},
};

const BASE_URL: &str = "https://zenodo.org/api";

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(2),
    max_delay: Duration::from_secs(30),
    jitter: true,
};

/// Client for the Zenodo REST API.
///
/// No API key required for public records. Provide an optional access token
/// for higher rate limits (100 req/min vs 60 req/min unauthenticated).
#[derive(Clone)]
pub struct ZenodoClient {
    http: reqwest::Client,
    base_url: String,
}

impl ZenodoClient {
    pub fn new(access_token: Option<&str>) -> Self {
        Self::with_base_url(BASE_URL, access_token)
    }

    pub fn with_base_url(base_url: &str, access_token: Option<&str>) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(token) = access_token {
            if let Ok(val) =
                reqwest::header::HeaderValue::from_str(&format!("Bearer {token}"))
            {
                headers.insert(reqwest::header::AUTHORIZATION, val);
            }
        }
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .user_agent("research-crate/0.1")
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self {
            http,
            base_url: base_url.to_string(),
        }
    }

    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        let resp = retry_get(&self.http, url, &params, &RETRY_CONFIG, "Zenodo").await?;
        let status = resp.status();
        if !status.is_success() {
            let message = resp.text().await.unwrap_or_default();
            return Err(Error::Api {
                status: status.as_u16(),
                message,
            });
        }
        Ok(resp.json().await?)
    }

    /// Search records by keyword.
    ///
    /// Supports Elasticsearch query syntax in `query`:
    /// `title:"deep learning"`, `creators.name:Smith`, boolean operators.
    pub async fn search(
        &self,
        query: &str,
        page: u32,
        size: u32,
    ) -> Result<ZenodoSearchResponse, Error> {
        self.search_filtered(query, None, None, page, size).await
    }

    /// Search records with optional type and sort filters.
    ///
    /// `resource_type`: `"publication"`, `"dataset"`, `"software"`, etc.
    /// `sort`: `"bestmatch"` (default), `"mostrecent"`, `"-mostrecent"`.
    pub async fn search_filtered(
        &self,
        query: &str,
        resource_type: Option<&str>,
        sort: Option<&str>,
        page: u32,
        size: u32,
    ) -> Result<ZenodoSearchResponse, Error> {
        let url = format!("{}/records", self.base_url);
        let mut params = vec![
            ("q".into(), query.to_string()),
            ("page".into(), page.to_string()),
            ("size".into(), size.to_string()),
        ];
        if let Some(rt) = resource_type {
            params.push(("type".into(), rt.to_string()));
        }
        if let Some(s) = sort {
            params.push(("sort".into(), s.to_string()));
        }
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get a single record by its Zenodo numeric ID.
    pub async fn get_record(&self, id: u64) -> Result<ZenodoRecord, Error> {
        let url = format!("{}/records/{id}", self.base_url);
        let val = self.get_json(&url, vec![]).await?;
        Ok(serde_json::from_value(val)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path, query_param};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn sample_search_response() -> serde_json::Value {
        serde_json::json!({
            "hits": {
                "total": 2,
                "hits": [
                    {
                        "id": 12345,
                        "doi": "10.5281/zenodo.12345",
                        "title": "Machine Learning for Climate Science",
                        "metadata": {
                            "title": "Machine Learning for Climate Science",
                            "description": "<p>We present a novel approach...</p>",
                            "publication_date": "2024-03-15",
                            "doi": "10.5281/zenodo.12345",
                            "access_right": "open",
                            "creators": [
                                {"name": "Smith, John", "affiliation": "MIT", "orcid": "0000-0001-2345-6789"},
                                {"name": "Doe, Jane", "affiliation": "Stanford"}
                            ],
                            "keywords": ["machine learning", "climate"],
                            "resource_type": {
                                "type": "publication",
                                "subtype": "article",
                                "title": "Journal article"
                            },
                            "license": {"id": "cc-by-4.0"}
                        },
                        "files": [
                            {
                                "id": "abc-123",
                                "key": "paper.pdf",
                                "size": 1024000,
                                "links": {"self": "https://zenodo.org/api/records/12345/files/paper.pdf/content"}
                            }
                        ],
                        "links": {
                            "self": "https://zenodo.org/api/records/12345",
                            "self_html": "https://zenodo.org/records/12345",
                            "doi": "https://doi.org/10.5281/zenodo.12345"
                        },
                        "stats": {
                            "downloads": 500,
                            "unique_downloads": 300,
                            "views": 1200,
                            "unique_views": 900
                        }
                    },
                    {
                        "id": 67890,
                        "doi": "10.5281/zenodo.67890",
                        "title": "Deep Learning Survey",
                        "metadata": {
                            "title": "Deep Learning Survey",
                            "description": "A comprehensive survey.",
                            "publication_date": "2023-11-01",
                            "doi": "10.5281/zenodo.67890",
                            "creators": [
                                {"name": "Chen, Wei"}
                            ],
                            "resource_type": {
                                "type": "publication",
                                "subtype": "preprint",
                                "title": "Preprint"
                            }
                        },
                        "links": {
                            "self": "https://zenodo.org/api/records/67890",
                            "self_html": "https://zenodo.org/records/67890"
                        }
                    }
                ]
            }
        })
    }

    fn sample_record_response() -> serde_json::Value {
        serde_json::json!({
            "id": 12345,
            "doi": "10.5281/zenodo.12345",
            "title": "Machine Learning for Climate Science",
            "metadata": {
                "title": "Machine Learning for Climate Science",
                "description": "<p>We present a <em>novel</em> approach to climate modeling.</p>",
                "publication_date": "2024-03-15",
                "doi": "10.5281/zenodo.12345",
                "access_right": "open",
                "creators": [
                    {"name": "Smith, John", "affiliation": "MIT", "orcid": "0000-0001-2345-6789"},
                    {"name": "Doe, Jane", "affiliation": "Stanford"}
                ],
                "keywords": ["machine learning", "climate"],
                "resource_type": {
                    "type": "publication",
                    "subtype": "article",
                    "title": "Journal article"
                },
                "license": {"id": "cc-by-4.0"},
                "journal": {
                    "title": "Nature Climate Change",
                    "volume": "14",
                    "issue": "3",
                    "pages": "201-215"
                },
                "related_identifiers": [
                    {
                        "identifier": "10.1038/s41558-024-01234-5",
                        "relation": "isIdenticalTo",
                        "scheme": "doi"
                    }
                ],
                "subjects": [
                    {"term": "Climate Science", "scheme": "url"}
                ],
                "language": "eng",
                "version": "v1.0"
            },
            "files": [
                {
                    "id": "abc-123",
                    "key": "paper.pdf",
                    "size": 1024000,
                    "checksum": "md5:abc123def456",
                    "links": {"self": "https://zenodo.org/api/records/12345/files/paper.pdf/content"}
                },
                {
                    "id": "def-456",
                    "key": "supplementary.csv",
                    "size": 2048,
                    "links": {"self": "https://zenodo.org/api/records/12345/files/supplementary.csv/content"}
                }
            ],
            "links": {
                "self": "https://zenodo.org/api/records/12345",
                "self_html": "https://zenodo.org/records/12345",
                "doi": "https://doi.org/10.5281/zenodo.12345"
            },
            "stats": {
                "downloads": 500,
                "unique_downloads": 300,
                "views": 1200,
                "unique_views": 900
            }
        })
    }

    #[tokio::test]
    async fn search_basic() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records"))
            .and(query_param("q", "machine learning"))
            .and(query_param("page", "1"))
            .and(query_param("size", "10"))
            .respond_with(ResponseTemplate::new(200).set_body_json(sample_search_response()))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let resp = client.search("machine learning", 1, 10).await.unwrap();

        let hits = resp.hits.unwrap();
        assert_eq!(hits.total.unwrap(), 2);
        assert_eq!(hits.hits.len(), 2);

        let first = &hits.hits[0];
        assert_eq!(first.id.unwrap(), 12345);
        assert_eq!(first.doi.as_deref().unwrap(), "10.5281/zenodo.12345");
        assert_eq!(
            first.metadata.as_ref().unwrap().title.as_deref().unwrap(),
            "Machine Learning for Climate Science"
        );

        let creators = first
            .metadata
            .as_ref()
            .unwrap()
            .creators
            .as_ref()
            .unwrap();
        assert_eq!(creators.len(), 2);
        assert_eq!(creators[0].name.as_deref().unwrap(), "Smith, John");
    }

    #[tokio::test]
    async fn search_filtered_with_type_and_sort() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records"))
            .and(query_param("q", "deep learning"))
            .and(query_param("type", "publication"))
            .and(query_param("sort", "mostrecent"))
            .respond_with(ResponseTemplate::new(200).set_body_json(sample_search_response()))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let resp = client
            .search_filtered("deep learning", Some("publication"), Some("mostrecent"), 1, 10)
            .await
            .unwrap();

        assert!(resp.hits.is_some());
    }

    #[tokio::test]
    async fn get_record_by_id() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records/12345"))
            .respond_with(ResponseTemplate::new(200).set_body_json(sample_record_response()))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let record = client.get_record(12345).await.unwrap();

        assert_eq!(record.id.unwrap(), 12345);

        let meta = record.metadata.as_ref().unwrap();
        assert_eq!(
            meta.publication_date.as_deref().unwrap(),
            "2024-03-15"
        );
        assert_eq!(meta.access_right.as_deref().unwrap(), "open");
        assert_eq!(
            meta.keywords.as_ref().unwrap(),
            &["machine learning", "climate"]
        );
        assert_eq!(
            meta.resource_type.as_ref().unwrap().subtype.as_deref().unwrap(),
            "article"
        );
        assert_eq!(
            meta.journal.as_ref().unwrap().title.as_deref().unwrap(),
            "Nature Climate Change"
        );

        // Files
        let files = record.files.as_ref().unwrap();
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].key.as_deref().unwrap(), "paper.pdf");

        // PDF URL extraction
        assert!(record.pdf_url().unwrap().contains("paper.pdf"));

        // Stats
        let stats = record.stats.as_ref().unwrap();
        assert_eq!(stats.downloads.unwrap(), 500);
        assert_eq!(stats.views.unwrap(), 1200);
    }

    #[tokio::test]
    async fn get_record_not_found() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records/99999"))
            .respond_with(ResponseTemplate::new(404).set_body_string("Not found"))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let err = client.get_record(99999).await.unwrap_err();
        match err {
            Error::Api { status, .. } => assert_eq!(status, 404),
            other => panic!("expected Api error, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn search_empty_results() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "hits": {
                        "total": 0,
                        "hits": []
                    }
                })),
            )
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let resp = client.search("xyznonexistent", 1, 10).await.unwrap();
        let hits = resp.hits.unwrap();
        assert_eq!(hits.total.unwrap(), 0);
        assert!(hits.hits.is_empty());
    }

    #[tokio::test]
    async fn search_handles_rate_limit() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records"))
            .respond_with(ResponseTemplate::new(429).set_body_string("Too Many Requests"))
            .expect(1..)
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let err = client.search("test", 1, 10).await.unwrap_err();
        assert!(matches!(err, Error::RateLimited { .. } | Error::Api { .. }));
    }

    #[tokio::test]
    async fn plain_description_strips_html() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records/12345"))
            .respond_with(ResponseTemplate::new(200).set_body_json(sample_record_response()))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let record = client.get_record(12345).await.unwrap();
        let desc = record.plain_description().unwrap();
        assert!(!desc.contains('<'));
        assert!(desc.contains("novel"));
    }

    #[tokio::test]
    async fn deserialization_handles_minimal_record() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/records/11111"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": 11111,
                "metadata": {
                    "title": "Minimal",
                    "creators": [{"name": "Author, A"}],
                    "resource_type": {"type": "dataset"}
                }
            })))
            .mount(&server)
            .await;

        let client = ZenodoClient::with_base_url(&server.uri(), None);
        let record = client.get_record(11111).await.unwrap();
        assert_eq!(record.id.unwrap(), 11111);
        assert!(record.doi.is_none());
        assert!(record.files.is_none());
        assert!(record.stats.is_none());
        assert!(record.pdf_url().is_none());

        let meta = record.metadata.unwrap();
        assert_eq!(meta.title.as_deref().unwrap(), "Minimal");
        assert!(meta.keywords.is_none());
        assert!(meta.journal.is_none());
    }
}

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Semaphore;
use tokio::time::sleep;

use crate::retry::{backoff_delay, retry_get, RetryAction, RetryConfig};

use super::{
    error::Error,
    types::{
        BulkSearchResponse, CitationsResponse, Paper, RecommendationsResponse, ReferencesResponse,
        SearchResponse,
    },
};

const BASE_URL: &str = "https://api.semanticscholar.org";

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(1),
    max_delay: Duration::from_secs(30),
    jitter: true,
};

/// Async client for the Semantic Scholar Academic Graph, Recommendations, and Datasets APIs.
///
/// Without an API key requests share the unauthenticated rate-limit pool. With a free
/// key (`x-api-key` header) you get 1 req/s dedicated. Set the `SEMANTIC_SCHOLAR_API_KEY`
/// env var or pass it to [`SemanticScholarClient::new`].
#[derive(Clone)]
pub struct SemanticScholarClient {
    http: reqwest::Client,
    base_url: String,
    rate_limiter: Option<Arc<Semaphore>>,
}

impl SemanticScholarClient {
    pub fn new(api_key: Option<&str>) -> Self {
        Self::with_base_url(BASE_URL, api_key)
    }

    pub fn with_base_url(base_url: &str, api_key: Option<&str>) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(key) = api_key {
            if let Ok(val) = reqwest::header::HeaderValue::from_str(key) {
                headers.insert("x-api-key", val);
            }
        }
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self { http, base_url: base_url.to_string(), rate_limiter: None }
    }

    /// Create a client with a shared semaphore for cross-worker rate limiting.
    pub fn with_rate_limiter(api_key: Option<&str>, limiter: Arc<Semaphore>) -> Self {
        let mut client = Self::new(api_key);
        client.rate_limiter = Some(limiter);
        client
    }

    /// Create a client with both a custom base URL and a shared semaphore.
    pub fn with_base_url_and_rate_limiter(base_url: &str, api_key: Option<&str>, limiter: Arc<Semaphore>) -> Self {
        let mut client = Self::with_base_url(base_url, api_key);
        client.rate_limiter = Some(limiter);
        client
    }

    /// Minimum time to hold a semaphore permit (3 seconds).
    /// Turns concurrency semaphore into a rate limiter: Semaphore(N) → max N req/3s.
    /// Unauthenticated S2 limit is ~100 req/5min ≈ 1 req/3s; with API key it's ~1 req/s.
    const MIN_PERMIT_HOLD: Duration = Duration::from_secs(3);

    /// Sleep for the remainder of [`MIN_PERMIT_HOLD`] if a permit is held.
    async fn enforce_min_hold(
        acquire_time: std::time::Instant,
        permit: &Option<tokio::sync::SemaphorePermit<'_>>,
    ) {
        if permit.is_some() {
            let elapsed = acquire_time.elapsed();
            if elapsed < Self::MIN_PERMIT_HOLD {
                sleep(Self::MIN_PERMIT_HOLD - elapsed).await;
            }
        }
    }

    /// Low-level GET with exponential-backoff retry.
    /// When a rate_limiter is set, acquires a permit before each HTTP request
    /// and uses a manual retry loop to coordinate with the semaphore.
    /// Without a rate_limiter, delegates to the shared `retry_get` utility.
    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        // Fast path: no semaphore — use the shared retry utility.
        if self.rate_limiter.is_none() {
            let resp = retry_get(&self.http, url, &params, &RETRY_CONFIG, "SemanticScholar").await?;
            let status = resp.status();
            if !status.is_success() {
                let message = resp.text().await.unwrap_or_default();
                return Err(Error::Api {
                    status: status.as_u16(),
                    message,
                });
            }
            return Ok(resp.json().await?);
        }

        // Slow path: semaphore-gated retry loop.
        // Safety: early return on line above guarantees rate_limiter is Some.
        let sem = self.rate_limiter.as_ref().expect("rate_limiter checked above");
        for attempt in 0..=RETRY_CONFIG.max_retries {
            if attempt > 0 {
                let delay = backoff_delay(&RETRY_CONFIG, attempt - 1);
                tracing::warn!(
                    api = "SemanticScholar",
                    attempt,
                    delay_ms = delay.as_millis() as u64,
                    "retrying after backoff"
                );
                sleep(delay).await;
            }

            let acquire_time = std::time::Instant::now();
            let _permit = Some(sem.acquire().await.map_err(|_| Error::Api {
                status: 503,
                message: "rate limiter closed".into(),
            })?);

            let result = self.http.get(url).query(&params).send().await;

            match result {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    let action = RetryAction::from_status(status);

                    if action.should_retry() {
                        // Hold permit for min duration even on retryable status.
                        Self::enforce_min_hold(acquire_time, &_permit).await;
                        if attempt == RETRY_CONFIG.max_retries {
                            if status == 429 {
                                return Err(Error::RateLimited { retry_after: 0 });
                            }
                            let message = resp.text().await.unwrap_or_default();
                            return Err(Error::Api { status, message });
                        }
                        continue;
                    }

                    if !resp.status().is_success() {
                        let message = resp.text().await.unwrap_or_default();
                        return Err(Error::Api { status, message });
                    }

                    let body = resp.json().await?;
                    Self::enforce_min_hold(acquire_time, &_permit).await;
                    return Ok(body);
                }
                Err(err) => {
                    Self::enforce_min_hold(acquire_time, &_permit).await;
                    if (err.is_timeout() || err.is_connect()) && attempt < RETRY_CONFIG.max_retries {
                        continue;
                    }
                    return Err(Error::Http(err));
                }
            }
        }

        Err(Error::Api {
            status: 503,
            message: "retries exhausted".into(),
        })
    }

    /// **Bulk keyword search** — efficient large-scale discovery, up to 10M results.
    ///
    /// Supports advanced query syntax: `"exact phrase"`, `+must`, `-exclude`, `term1 | term2`.
    ///
    /// # Arguments
    /// * `query` — search string
    /// * `fields` — comma-separated fields (see [`crate::scholar::types::PAPER_FIELDS_FULL`])
    /// * `year` — year filter: `"2023"`, `"2020-2025"`, `"2020-"`, `"-2023"`
    /// * `min_citations` — only return papers with at least this many citations
    /// * `sort` — sort key, e.g. `"citationCount:desc"`, `"publicationDate:desc"`, `"paperId:asc"`
    /// * `limit` — results per page (max 1000)
    pub async fn search_bulk(
        &self,
        query: &str,
        fields: &str,
        year: Option<&str>,
        min_citations: Option<u32>,
        sort: Option<&str>,
        limit: u32,
    ) -> Result<BulkSearchResponse, Error> {
        let url = format!("{}/graph/v1/paper/search/bulk", self.base_url);
        let mut params = vec![
            ("query".into(), query.to_string()),
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        if let Some(y) = year {
            params.push(("year".into(), y.to_string()));
        }
        if let Some(mc) = min_citations {
            params.push(("minCitationCount".into(), mc.to_string()));
        }
        if let Some(s) = sort {
            params.push(("sort".into(), s.to_string()));
        }
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// **Relevance-ranked search** — richer ranking signal, max 1000 results.
    ///
    /// Use for precise targeted queries where ranking quality matters more than scale.
    pub async fn search(
        &self,
        query: &str,
        fields: &str,
        limit: u32,
        offset: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{}/graph/v1/paper/search", self.base_url);
        let params = vec![
            ("query".into(), query.to_string()),
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
            ("offset".into(), offset.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get full details for a single paper.
    ///
    /// `paper_id` accepts any format: S2PaperId, `DOI:10.xxx/yyy`, `arXiv:1705.10311`,
    /// `PMID:12345`, `ACL:P19-1002`, etc.
    pub async fn get_paper(&self, paper_id: &str, fields: &str) -> Result<Paper, Error> {
        let url = format!("{}/graph/v1/paper/{paper_id}", self.base_url);
        let params = vec![("fields".into(), fields.to_string())];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers that **cite** this paper (forward citations).
    ///
    /// `fields` controls nested paper attributes returned inside each `citingPaper`.
    pub async fn get_citations(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<CitationsResponse, Error> {
        let url = format!("{}/graph/v1/paper/{paper_id}/citations", self.base_url);
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers this paper **references** (backward citations).
    pub async fn get_references(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<ReferencesResponse, Error> {
        let url = format!("{}/graph/v1/paper/{paper_id}/references", self.base_url);
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers **similar** to the given paper (Recommendations API).
    ///
    /// Uses SPECTER2 embeddings and citation graph signals under the hood.
    pub async fn get_recommendations(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<RecommendationsResponse, Error> {
        let url =
            format!("{}/recommendations/v1/papers/forpaper/{paper_id}", self.base_url);
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }
}

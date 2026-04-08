use std::collections::HashMap;
use std::sync::Arc;

use futures::stream::{self, StreamExt};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT};
use tracing::{debug, warn};

use crate::error::Error;
use crate::types::*;

const HF_API_BASE: &str = "https://huggingface.co/api";
const HF_RAW_BASE: &str = "https://huggingface.co";

/// Async client for parallel Hugging Face Hub operations.
///
/// Bounded concurrency via `buffer_unordered` — safe to throw thousands
/// of repo IDs at without overwhelming the API.
pub struct HfClient {
    http: reqwest::Client,
    concurrency: usize,
    api_base: String,
    raw_base: String,
}

impl HfClient {
    /// Create a new client.
    ///
    /// - `token`: optional HF bearer token for private repos / higher rate limits.
    /// - `concurrency`: max parallel HTTP requests (clamped 1..=64).
    pub fn new(token: Option<&str>, concurrency: usize) -> Result<Self, Error> {
        Self::build(token, concurrency, HF_API_BASE.into(), HF_RAW_BASE.into())
    }

    /// Convenience: read `HF_TOKEN` env var.
    pub fn from_env(concurrency: usize) -> Result<Self, Error> {
        let token = std::env::var("HF_TOKEN").ok();
        Self::new(token.as_deref(), concurrency)
    }

    /// Create a client with custom base URLs (for testing or self-hosted HF Hub).
    #[cfg(test)]
    pub(crate) fn with_base_urls(
        token: Option<&str>,
        concurrency: usize,
        api_base: String,
        raw_base: String,
    ) -> Result<Self, Error> {
        Self::build(token, concurrency, api_base, raw_base)
    }

    fn build(
        token: Option<&str>,
        concurrency: usize,
        api_base: String,
        raw_base: String,
    ) -> Result<Self, Error> {
        let concurrency = concurrency.clamp(1, 64);
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static("hf/0.1"));
        if let Some(t) = token {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {t}"))?,
            );
        }
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .pool_max_idle_per_host(concurrency)
            .build()
            .map_err(Error::ClientBuild)?;
        Ok(Self {
            http,
            concurrency,
            api_base,
            raw_base,
        })
    }

    // ── Repo metadata ──────────────────────────────────────────

    /// Fetch `RepoInfo` for many repos in parallel.
    pub async fn fetch_repo_info(
        &self,
        requests: &[FetchRequest],
    ) -> Vec<FetchResult<RepoInfo>> {
        let client = &self.http;
        let api_base = &self.api_base;
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                let api_base = api_base.clone();
                async move {
                    let url = format!(
                        "{}/{}/{}",
                        api_base,
                        req.repo_type.api_prefix(),
                        req.repo_id
                    );
                    debug!(repo = %req.repo_id, %url, "fetching repo info");
                    match fetch_json::<RepoInfo>(&client, &url, &req.repo_id).await {
                        Ok(data) => FetchResult::Ok { repo_id: req.repo_id, data },
                        Err(error) => FetchResult::Err { repo_id: req.repo_id, error },
                    }
                }
            })
            .buffer_unordered(self.concurrency)
            .collect()
            .await
    }

    // ── Model cards ────────────────────────────────────────────

    /// Fetch README.md (model card) for many model repos.
    pub async fn fetch_model_cards(
        &self,
        repo_ids: &[impl AsRef<str>],
    ) -> Result<HashMap<String, String>, Error> {
        let results = self
            .fetch_raw_files(
                &repo_ids
                    .iter()
                    .map(|r| FetchRequest::model(r.as_ref()).with_path("README.md"))
                    .collect::<Vec<_>>(),
            )
            .await;

        let mut out = HashMap::with_capacity(results.len());
        for r in results {
            match r {
                FetchResult::Ok { repo_id, data } => { out.insert(repo_id, data); }
                FetchResult::Err { repo_id, error } => {
                    warn!(%repo_id, %error, "failed to fetch model card");
                }
            }
        }
        Ok(out)
    }

    // ── Raw file download ──────────────────────────────────────

    /// Download raw file contents from many repos in parallel.
    /// Each `FetchRequest` must have `.path` set.
    pub async fn fetch_raw_files(
        &self,
        requests: &[FetchRequest],
    ) -> Vec<FetchResult<String>> {
        let client = &self.http;
        let raw_base = &self.raw_base;
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                let raw_base = raw_base.clone();
                async move {
                    let path = req.path.as_deref().unwrap_or("README.md");
                    let rev = req.revision.as_deref().unwrap_or("main");
                    let prefix = req.repo_type.raw_prefix();
                    let url = if prefix.is_empty() {
                        format!(
                            "{}/{}/resolve/{}/{}",
                            raw_base, req.repo_id, rev, path
                        )
                    } else {
                        format!(
                            "{}/{}/{}/resolve/{}/{}",
                            raw_base, prefix, req.repo_id, rev, path
                        )
                    };
                    debug!(repo = %req.repo_id, %path, "fetching raw file");
                    match fetch_text(&client, &url, &req.repo_id).await {
                        Ok(data) => FetchResult::Ok { repo_id: req.repo_id, data },
                        Err(error) => FetchResult::Err { repo_id: req.repo_id, error },
                    }
                }
            })
            .buffer_unordered(self.concurrency)
            .collect()
            .await
    }

    // ── Dataset rows ───────────────────────────────────────────

    /// Fetch first `limit` rows from dataset repos via the rows API.
    pub async fn fetch_dataset_rows(
        &self,
        repo_ids: &[impl AsRef<str>],
        config: &str,
        split: &str,
        limit: usize,
    ) -> Vec<FetchResult<serde_json::Value>> {
        let client = &self.http;
        let config = Arc::new(config.to_owned());
        let split = Arc::new(split.to_owned());

        stream::iter(repo_ids.iter().map(|r| r.as_ref().to_owned()))
            .map(|repo_id| {
                let client = client.clone();
                let config = Arc::clone(&config);
                let split = Arc::clone(&split);
                async move {
                    let url = format!(
                        "https://datasets-server.huggingface.co/rows\
                         ?dataset={}&config={}&split={}&offset=0&length={}",
                        repo_id, config, split, limit
                    );
                    debug!(%repo_id, "fetching dataset rows");
                    match fetch_json::<serde_json::Value>(&client, &url, &repo_id).await {
                        Ok(data) => FetchResult::Ok { repo_id, data },
                        Err(error) => FetchResult::Err { repo_id, error },
                    }
                }
            })
            .buffer_unordered(self.concurrency)
            .collect()
            .await
    }

    // ── List repo files ────────────────────────────────────────

    /// List sibling files for many repos in parallel.
    pub async fn list_repo_files(
        &self,
        requests: &[FetchRequest],
    ) -> Vec<FetchResult<Vec<SiblingFile>>> {
        let client = &self.http;
        let api_base = &self.api_base;
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                let api_base = api_base.clone();
                async move {
                    let url = format!(
                        "{}/{}/{}",
                        api_base,
                        req.repo_type.api_prefix(),
                        req.repo_id
                    );
                    match fetch_json::<serde_json::Value>(&client, &url, &req.repo_id).await {
                        Ok(val) => {
                            let siblings: Vec<SiblingFile> = val
                                .get("siblings")
                                .and_then(|s| serde_json::from_value(s.clone()).ok())
                                .unwrap_or_default();
                            FetchResult::Ok { repo_id: req.repo_id, data: siblings }
                        }
                        Err(error) => FetchResult::Err { repo_id: req.repo_id, error },
                    }
                }
            })
            .buffer_unordered(self.concurrency)
            .collect()
            .await
    }

    // ── Listing / browsing ──────────────────────────────────────

    /// List repos from the HF Hub API with cursor-based pagination.
    pub async fn list_repos(&self, opts: &ListOptions) -> Result<Vec<RepoInfo>, Error> {
        let prefix = opts.repo_type.api_prefix();
        let limit = opts.limit.min(100);
        let mut all = Vec::new();
        let mut page = 0;

        // Build optional filter query params
        let mut params: Vec<(&str, String)> = Vec::new();
        if opts.full { params.push(("full", "true".into())); }
        if let Some(ref q) = opts.search { params.push(("search", url_encode(q))); }
        if let Some(ref a) = opts.author { params.push(("author", url_encode(a))); }
        if let Some(ref filters) = opts.filter {
            for f in filters { params.push(("filter", url_encode(f))); }
        }
        if let Some(ref t) = opts.pipeline_tag_filter { params.push(("pipeline_tag", url_encode(t))); }
        if let Some(ref l) = opts.library_filter { params.push(("library", url_encode(l))); }
        let extra: String = params.iter().map(|(k, v)| format!("&{k}={v}")).collect();

        let mut next_url = Some(format!(
            "{}/{}?sort={}&direction={}&limit={}{}",
            self.api_base, prefix, opts.sort, opts.direction, limit, extra
        ));

        let list_id = format!("list:{prefix}");

        while let Some(url) = next_url.take() {
            if opts.max_pages > 0 && page >= opts.max_pages {
                break;
            }
            debug!(page, %url, "listing repos");

            let resp = send_checked(&self.http, &url, &list_id).await?;

            // Extract cursor from Link header: <URL>; rel="next"
            next_url = resp
                .headers()
                .get("link")
                .and_then(|v| v.to_str().ok())
                .and_then(parse_next_link);

            let bytes = resp.bytes().await.map_err(|e| Error::Http {
                repo: list_id.clone(),
                source: e,
            })?;
            let batch: Vec<RepoInfo> = serde_json::from_slice(&bytes).map_err(|e| Error::Json {
                repo: format!("{list_id}:page{page}"),
                source: e,
            })?;

            if batch.is_empty() {
                break;
            }
            all.extend(batch);
            page += 1;
        }

        Ok(all)
    }

    /// Fetch popular models sorted by downloads (with full metadata).
    pub async fn list_popular_models(&self, count: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::models().max_pages(count.div_ceil(100))).await
    }

    /// Fetch popular datasets sorted by downloads (with full metadata).
    pub async fn list_popular_datasets(&self, count: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::datasets().max_pages(count.div_ceil(100))).await
    }

    /// Fetch popular spaces sorted by likes (with full metadata).
    pub async fn list_popular_spaces(&self, count: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::spaces().max_pages(count.div_ceil(100))).await
    }

    /// Search models by text query, sorted by downloads.
    pub async fn search_models(&self, query: &str, limit: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::models().search(query).max_pages(limit.div_ceil(100))).await
    }

    /// List all repos (of a given type) by a specific author/organization.
    pub async fn list_by_author(
        &self,
        author: &str,
        repo_type: RepoType,
        limit: usize,
    ) -> Result<Vec<RepoInfo>, Error> {
        let opts = match repo_type {
            RepoType::Model => ListOptions::models(),
            RepoType::Dataset => ListOptions::datasets(),
            RepoType::Space => ListOptions::spaces(),
        };
        self.list_repos(&opts.author(author).max_pages(limit.div_ceil(100))).await
    }

    /// List models that use a specific library (e.g. "transformers", "pytorch").
    pub async fn list_by_library(
        &self,
        library: &str,
        limit: usize,
    ) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::models().library(library).max_pages(limit.div_ceil(100))).await
    }

    /// List models by pipeline tag (e.g. "text-generation", "image-classification").
    pub async fn list_by_pipeline(
        &self,
        tag: &str,
        limit: usize,
    ) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions::models().pipeline_tag(tag).max_pages(limit.div_ceil(100))).await
    }
}

#[cfg(feature = "sqlite")]
impl HfClient {
    /// Fetch popular models, datasets, and spaces and save to SQLite.
    /// Returns the total number of repos synced.
    pub async fn sync_popular(
        &self,
        db: &crate::db::HfDb,
        models: usize,
        datasets: usize,
        spaces: usize,
    ) -> Result<usize, Error> {
        let mut total = 0;

        if models > 0 {
            let repos = self.list_popular_models(models).await?;
            let count = db.upsert_repos(&repos, RepoType::Model)?;
            tracing::info!(count, "synced popular models");
            total += count;
        }

        if datasets > 0 {
            let repos = self.list_popular_datasets(datasets).await?;
            let count = db.upsert_repos(&repos, RepoType::Dataset)?;
            tracing::info!(count, "synced popular datasets");
            total += count;
        }

        if spaces > 0 {
            let repos = self.list_popular_spaces(spaces).await?;
            let count = db.upsert_repos(&repos, RepoType::Space)?;
            tracing::info!(count, "synced popular spaces");
            total += count;
        }

        Ok(total)
    }
}

// ── Internal helpers ───────────────────────────────────────────

/// Send a GET request and check the response status.
/// Returns the raw `Response` on success, or an appropriate `Error` on 429/4xx/5xx.
async fn send_checked(
    client: &reqwest::Client,
    url: &str,
    repo_id: &str,
) -> Result<reqwest::Response, Error> {
    let resp = client.get(url).send().await.map_err(|e| Error::Http {
        repo: repo_id.to_owned(),
        source: e,
    })?;

    let status = resp.status();
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        let retry = parse_retry_after(&resp);
        return Err(Error::RateLimited { retry_after_secs: retry });
    }
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(Error::Api {
            repo: repo_id.to_owned(),
            status: status.as_u16(),
            body,
        });
    }
    Ok(resp)
}

/// Parse `retry-after` header value, defaulting to 60s if missing or non-numeric.
fn parse_retry_after(resp: &reqwest::Response) -> u64 {
    resp.headers()
        .get("retry-after")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| match s.parse::<u64>() {
            Ok(n) => Some(n),
            Err(_) => {
                warn!(value = s, "non-numeric retry-after header, defaulting to 60s");
                None
            }
        })
        .unwrap_or(60)
}

async fn fetch_json<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
    repo_id: &str,
) -> Result<T, Error> {
    let resp = send_checked(client, url, repo_id).await?;
    let bytes = resp.bytes().await.map_err(|e| Error::Http {
        repo: repo_id.to_owned(),
        source: e,
    })?;
    serde_json::from_slice(&bytes).map_err(|e| Error::Json {
        repo: repo_id.to_owned(),
        source: e,
    })
}

async fn fetch_text(
    client: &reqwest::Client,
    url: &str,
    repo_id: &str,
) -> Result<String, Error> {
    let resp = send_checked(client, url, repo_id).await?;
    resp.text().await.map_err(|e| Error::Http {
        repo: repo_id.to_owned(),
        source: e,
    })
}

/// Parse `Link: <URL>; rel="next"` header value.
fn parse_next_link(header: &str) -> Option<String> {
    for part in header.split(',') {
        let part = part.trim();
        if part.contains("rel=\"next\"") {
            let url = part.split('>').next()?.trim_start_matches('<');
            return Some(url.to_owned());
        }
    }
    None
}

/// Simple percent-encoding for URL query parameter values.
/// Encodes spaces, ampersands, equals, and other unsafe characters.
fn url_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            b' ' => out.push('+'),
            _ => {
                out.push('%');
                out.push(char::from(HEX[(b >> 4) as usize]));
                out.push(char::from(HEX[(b & 0x0f) as usize]));
            }
        }
    }
    out
}

const HEX: [u8; 16] = *b"0123456789ABCDEF";

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    // ── Pure function tests ────────────────────────────────────

    #[test]
    fn parse_next_link_basic() {
        let header = r#"<https://huggingface.co/api/models?cursor=abc123>; rel="next""#;
        assert_eq!(
            parse_next_link(header),
            Some("https://huggingface.co/api/models?cursor=abc123".into())
        );
    }

    #[test]
    fn parse_next_link_multiple_rels() {
        let header = r#"<https://example.com/prev>; rel="prev", <https://example.com/next>; rel="next""#;
        assert_eq!(
            parse_next_link(header),
            Some("https://example.com/next".into())
        );
    }

    #[test]
    fn parse_next_link_no_next() {
        let header = r#"<https://example.com/prev>; rel="prev""#;
        assert_eq!(parse_next_link(header), None);
    }

    #[test]
    fn parse_next_link_empty() {
        assert_eq!(parse_next_link(""), None);
    }

    #[test]
    fn url_encode_spaces() {
        assert_eq!(url_encode("hello world"), "hello+world");
    }

    #[test]
    fn url_encode_special_chars() {
        assert_eq!(url_encode("a&b=c#d"), "a%26b%3Dc%23d");
    }

    #[test]
    fn url_encode_passthrough() {
        let s = "abcXYZ012-_.~";
        assert_eq!(url_encode(s), s);
    }

    #[test]
    fn url_encode_unicode() {
        // "é" is 0xC3 0xA9 in UTF-8
        let encoded = url_encode("é");
        assert_eq!(encoded, "%C3%A9");
    }

    // ── Constructor tests ──────────────────────────────────────

    #[test]
    fn new_without_token() {
        let client = HfClient::new(None, 8).unwrap();
        assert_eq!(client.concurrency, 8);
        assert_eq!(client.api_base, HF_API_BASE);
    }

    #[test]
    fn new_with_token() {
        let client = HfClient::new(Some("hf_test_token"), 4).unwrap();
        assert_eq!(client.concurrency, 4);
    }

    #[test]
    fn new_clamps_concurrency_low() {
        let client = HfClient::new(None, 0).unwrap();
        assert_eq!(client.concurrency, 1);
    }

    #[test]
    fn new_clamps_concurrency_high() {
        let client = HfClient::new(None, 999).unwrap();
        assert_eq!(client.concurrency, 64);
    }

    // ── HTTP mock tests ────────────────────────────────────────

    fn mock_repo_json() -> serde_json::Value {
        serde_json::json!({
            "_id": "abc123",
            "id": "meta-llama/Llama-3-8B",
            "modelId": "meta-llama/Llama-3-8B",
            "author": "meta-llama",
            "lastModified": "2024-06-01T00:00:00.000Z",
            "downloads": 5000000,
            "likes": 12000,
            "library_name": "transformers",
            "pipeline_tag": "text-generation",
            "tags": ["transformers", "pytorch"]
        })
    }

    #[tokio::test]
    async fn fetch_repo_info_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/models/meta-llama/Llama-3-8B"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_repo_json()))
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let requests = vec![FetchRequest::model("meta-llama/Llama-3-8B")];
        let results = client.fetch_repo_info(&requests).await;

        assert_eq!(results.len(), 1);
        assert!(results[0].is_ok());
        if let FetchResult::Ok { data, .. } = &results[0] {
            assert_eq!(data.author.as_deref(), Some("meta-llama"));
            assert_eq!(data.downloads, Some(5000000));
        }
    }

    #[tokio::test]
    async fn fetch_repo_info_404() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/models/nonexistent/model"))
            .respond_with(ResponseTemplate::new(404).set_body_string("not found"))
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let requests = vec![FetchRequest::model("nonexistent/model")];
        let results = client.fetch_repo_info(&requests).await;

        assert_eq!(results.len(), 1);
        assert!(!results[0].is_ok());
    }

    #[tokio::test]
    async fn fetch_repo_info_429() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/models/org/model"))
            .respond_with(
                ResponseTemplate::new(429)
                    .insert_header("retry-after", "30"),
            )
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let requests = vec![FetchRequest::model("org/model")];
        let results = client.fetch_repo_info(&requests).await;

        assert_eq!(results.len(), 1);
        assert!(!results[0].is_ok());
        if let FetchResult::Err { error, .. } = &results[0] {
            let msg = error.to_string();
            assert!(msg.contains("429"), "error should mention 429: {msg}");
        }
    }

    #[tokio::test]
    async fn fetch_model_cards_partial_failure() {
        let server = MockServer::start().await;
        // Model A succeeds
        Mock::given(method("GET"))
            .and(path("/org-a/model-a/resolve/main/README.md"))
            .respond_with(ResponseTemplate::new(200).set_body_string("# Model A\nGreat model."))
            .mount(&server)
            .await;
        // Model B fails
        Mock::given(method("GET"))
            .and(path("/org-b/model-b/resolve/main/README.md"))
            .respond_with(ResponseTemplate::new(404).set_body_string("not found"))
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let ids = vec!["org-a/model-a", "org-b/model-b"];
        let cards = client.fetch_model_cards(&ids).await.unwrap();

        assert_eq!(cards.len(), 1);
        assert!(cards.contains_key("org-a/model-a"));
        assert!(cards["org-a/model-a"].contains("Model A"));
    }

    #[tokio::test]
    async fn list_repos_single_page() {
        let server = MockServer::start().await;
        let repos_json = serde_json::json!([mock_repo_json()]);

        Mock::given(method("GET"))
            .and(path("/models"))
            .respond_with(ResponseTemplate::new(200).set_body_json(repos_json))
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let opts = ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: false,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        };
        let repos = client.list_repos(&opts).await.unwrap();
        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].author.as_deref(), Some("meta-llama"));
    }

    #[tokio::test]
    async fn list_repos_rate_limited() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/models"))
            .respond_with(
                ResponseTemplate::new(429)
                    .insert_header("retry-after", "45"),
            )
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let opts = ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: false,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        };
        let err = client.list_repos(&opts).await.unwrap_err();
        let msg = err.to_string();
        assert!(msg.contains("429"), "should be rate limited: {msg}");
    }

    #[tokio::test]
    async fn list_repos_respects_max_pages() {
        let server = MockServer::start().await;
        let repos_json = serde_json::json!([mock_repo_json()]);

        // Page 1: returns data + a Link header for page 2
        Mock::given(method("GET"))
            .and(path("/models"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&repos_json)
                    .insert_header(
                        "link",
                        &format!(r#"<{}/models?cursor=page2>; rel="next""#, server.uri()),
                    ),
            )
            .expect(1)
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let opts = ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: false,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        };
        let repos = client.list_repos(&opts).await.unwrap();
        // Should only have page 1 results since max_pages=1
        assert_eq!(repos.len(), 1);
    }

    #[tokio::test]
    async fn fetch_raw_files_429_returns_rate_limited() {
        // Regression: fetch_text previously didn't handle 429, returning
        // Error::Api instead of Error::RateLimited
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/org/model/resolve/main/README.md"))
            .respond_with(
                ResponseTemplate::new(429)
                    .insert_header("retry-after", "15"),
            )
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let requests = vec![FetchRequest::model("org/model").with_path("README.md")];
        let results = client.fetch_raw_files(&requests).await;

        assert_eq!(results.len(), 1);
        assert!(!results[0].is_ok());
        if let FetchResult::Err { error, .. } = &results[0] {
            let msg = error.to_string();
            assert!(
                msg.contains("429"),
                "fetch_text should return RateLimited on 429, got: {msg}"
            );
        }
    }

    #[tokio::test]
    async fn list_repos_pagination_follows_link() {
        let server = MockServer::start().await;

        let repo1 = serde_json::json!([{
            "id": "org/model-page1",
            "author": "org",
            "downloads": 100
        }]);
        let repo2 = serde_json::json!([{
            "id": "org/model-page2",
            "author": "org",
            "downloads": 50
        }]);

        // Page 1 returns data + Link header pointing to page 2
        Mock::given(method("GET"))
            .and(path("/models"))
            .and(wiremock::matchers::query_param_is_missing("cursor"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&repo1)
                    .insert_header(
                        "link",
                        &format!(r#"<{}/models?cursor=page2&sort=downloads&direction=-1&limit=100>; rel="next""#, server.uri()),
                    ),
            )
            .mount(&server)
            .await;

        // Page 2 returns data, no Link header
        Mock::given(method("GET"))
            .and(path("/models"))
            .and(wiremock::matchers::query_param("cursor", "page2"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&repo2),
            )
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let opts = ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 0, // unlimited
            full: false,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        };
        let repos = client.list_repos(&opts).await.unwrap();
        assert_eq!(repos.len(), 2, "should collect from both pages");
        assert_eq!(repos[0].repo_id.as_deref(), Some("org/model-page1"));
        assert_eq!(repos[1].repo_id.as_deref(), Some("org/model-page2"));
    }

    #[tokio::test]
    async fn list_repos_api_error_propagates() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/models"))
            .respond_with(
                ResponseTemplate::new(500).set_body_string("internal server error"),
            )
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let opts = ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: 1,
            full: false,
            search: None,
            author: None,
            filter: None,
            pipeline_tag_filter: None,
            library_filter: None,
        };
        let err = client.list_repos(&opts).await.unwrap_err();
        let msg = err.to_string();
        assert!(msg.contains("500"), "should propagate 500: {msg}");
        assert!(msg.contains("internal server error"), "should include body: {msg}");
    }

    #[tokio::test]
    async fn list_repo_files_extracts_siblings() {
        let server = MockServer::start().await;
        let repo_json = serde_json::json!({
            "id": "org/model",
            "siblings": [
                {"rfilename": "config.json", "size": 100},
                {"rfilename": "model.safetensors", "size": 16000000000_u64}
            ]
        });

        Mock::given(method("GET"))
            .and(path("/models/org/model"))
            .respond_with(ResponseTemplate::new(200).set_body_json(repo_json))
            .mount(&server)
            .await;

        let client = HfClient::with_base_urls(None, 4, server.uri(), server.uri()).unwrap();
        let requests = vec![FetchRequest::model("org/model")];
        let results = client.list_repo_files(&requests).await;

        assert_eq!(results.len(), 1);
        assert!(results[0].is_ok());
        if let FetchResult::Ok { data, .. } = &results[0] {
            assert_eq!(data.len(), 2);
            assert_eq!(data[0].filename, "config.json");
            assert_eq!(data[1].filename, "model.safetensors");
        }
    }
}

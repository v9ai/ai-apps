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
}

impl HfClient {
    /// Create a new client.
    ///
    /// - `token`: optional HF bearer token for private repos / higher rate limits.
    /// - `concurrency`: max parallel HTTP requests (clamped 1..=64).
    pub fn new(token: Option<&str>, concurrency: usize) -> Result<Self, Error> {
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
        Ok(Self { http, concurrency })
    }

    /// Convenience: read `HF_TOKEN` env var.
    pub fn from_env(concurrency: usize) -> Result<Self, Error> {
        let token = std::env::var("HF_TOKEN").ok();
        Self::new(token.as_deref(), concurrency)
    }

    // ── Repo metadata ──────────────────────────────────────────

    /// Fetch `RepoInfo` for many repos in parallel.
    pub async fn fetch_repo_info(
        &self,
        requests: &[FetchRequest],
    ) -> Vec<FetchResult<RepoInfo>> {
        let client = &self.http;
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                async move {
                    let url = format!(
                        "{}/{}/{}",
                        HF_API_BASE,
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
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                async move {
                    let path = req.path.as_deref().unwrap_or("README.md");
                    let rev = req.revision.as_deref().unwrap_or("main");
                    let url = format!(
                        "{}/{}/{}/resolve/{}/{}",
                        HF_RAW_BASE,
                        req.repo_type.api_prefix(),
                        req.repo_id,
                        rev,
                        path
                    );
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
        stream::iter(requests.iter().cloned())
            .map(|req| {
                let client = client.clone();
                async move {
                    let url = format!(
                        "{}/{}/{}",
                        HF_API_BASE,
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
        let full_param = if opts.full { "&full=true" } else { "" };
        let mut next_url = Some(format!(
            "{}/{}?sort={}&direction={}&limit={}{}",
            HF_API_BASE, prefix, opts.sort, opts.direction, limit, full_param
        ));

        while let Some(url) = next_url.take() {
            if opts.max_pages > 0 && page >= opts.max_pages {
                break;
            }
            debug!(page, %url, "listing repos");

            let resp = self.http.get(&url).send().await.map_err(|e| Error::Http {
                repo: format!("list:{prefix}"),
                source: e,
            })?;

            let status = resp.status();
            if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                let retry = resp
                    .headers()
                    .get("retry-after")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(60);
                return Err(Error::RateLimited { retry_after_secs: retry });
            }
            if !status.is_success() {
                let body = resp.text().await.unwrap_or_default();
                return Err(Error::Api {
                    repo: format!("list:{prefix}"),
                    status: status.as_u16(),
                    body,
                });
            }

            // Extract cursor from Link header: <URL>; rel="next"
            next_url = resp
                .headers()
                .get("link")
                .and_then(|v| v.to_str().ok())
                .and_then(parse_next_link);

            let bytes = resp.bytes().await.map_err(|e| Error::Http {
                repo: format!("list:{prefix}"),
                source: e,
            })?;
            let batch: Vec<RepoInfo> = serde_json::from_slice(&bytes).map_err(|e| Error::Json {
                repo: format!("list:{prefix}:page{page}"),
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
        self.list_repos(&ListOptions {
            repo_type: RepoType::Model,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: (count + 99) / 100,
            full: true,
        })
        .await
    }

    /// Fetch popular datasets sorted by downloads (with full metadata).
    pub async fn list_popular_datasets(&self, count: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions {
            repo_type: RepoType::Dataset,
            sort: "downloads".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: (count + 99) / 100,
            full: true,
        })
        .await
    }

    /// Fetch popular spaces sorted by likes (with full metadata).
    pub async fn list_popular_spaces(&self, count: usize) -> Result<Vec<RepoInfo>, Error> {
        self.list_repos(&ListOptions {
            repo_type: RepoType::Space,
            sort: "likes".into(),
            direction: "-1".into(),
            limit: 100,
            max_pages: (count + 99) / 100,
            full: true,
        })
        .await
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

async fn fetch_json<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
    repo_id: &str,
) -> Result<T, Error> {
    let resp = client.get(url).send().await.map_err(|e| Error::Http {
        repo: repo_id.to_owned(),
        source: e,
    })?;

    let status = resp.status();
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        let retry = resp
            .headers()
            .get("retry-after")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok())
            .unwrap_or(60);
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
    let resp = client.get(url).send().await.map_err(|e| Error::Http {
        repo: repo_id.to_owned(),
        source: e,
    })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(Error::Api {
            repo: repo_id.to_owned(),
            status: status.as_u16(),
            body,
        });
    }

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

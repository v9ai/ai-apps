use crate::gh::error::{GhError, Result};
use crate::gh::types::*;
use reqwest::{header, Client};
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, warn};

const BASE_URL: &str = "https://api.github.com";
const BACKOFF_SECS: &[u64] = &[1, 2, 4];

#[derive(Clone)]
pub struct GhClient {
    inner: Client,
    token: String,
}

impl GhClient {
    pub fn new(token: impl Into<String>) -> Result<Self> {
        let token = token.into();
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::ACCEPT,
            header::HeaderValue::from_static("application/vnd.github+json"),
        );
        headers.insert(
            "X-GitHub-Api-Version",
            header::HeaderValue::from_static("2022-11-28"),
        );

        let inner = Client::builder()
            .user_agent("leadgen/0.1")
            .default_headers(headers)
            .build()
            .map_err(GhError::Http)?;

        Ok(Self { inner, token })
    }

    /// Build from `GITHUB_TOKEN` or `GH_TOKEN` env var.
    pub fn from_env() -> Result<Self> {
        let token = std::env::var("GITHUB_TOKEN")
            .or_else(|_| std::env::var("GH_TOKEN"))
            .map_err(|_| GhError::Other("GITHUB_TOKEN / GH_TOKEN not set".into()))?;
        Self::new(token)
    }

    // ── core request helpers ────────────────────────────────────────────

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        self.get_url(&format!("{BASE_URL}{path}")).await
    }

    async fn get_url<T: DeserializeOwned>(&self, url: &str) -> Result<T> {
        for (attempt, &delay_secs) in BACKOFF_SECS.iter().enumerate() {
            match self.get_url_once(url).await {
                Err(GhError::RateLimit { .. }) if attempt < BACKOFF_SECS.len() - 1 => {
                    warn!("rate-limited on {url}, retrying in {delay_secs}s");
                    tokio::time::sleep(Duration::from_secs(delay_secs)).await;
                }
                other => return other,
            }
        }
        self.get_url_once(url).await
    }

    async fn get_url_once<T: DeserializeOwned>(&self, url: &str) -> Result<T> {
        debug!("GET {url}");
        let resp = self
            .inner
            .get(url)
            .bearer_auth(&self.token)
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();

        if status == 404 {
            return Err(GhError::NotFound(url.to_string()));
        }
        if status == 429
            || (status == 403 && resp.headers().contains_key("x-ratelimit-remaining"))
        {
            let reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            return Err(GhError::RateLimit { reset_at: reset });
        }
        if !resp.status().is_success() {
            let body: GhApiError = resp.json().await.map_err(GhError::Http)?;
            return Err(GhError::Api {
                status,
                message: body.message,
            });
        }

        resp.json().await.map_err(GhError::Http)
    }

    /// Fetch raw text content of a file via the GitHub contents API.
    /// Returns `None` for 404.
    pub async fn get_file_content(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> Result<Option<String>> {
        let url = format!("{BASE_URL}/repos/{owner}/{repo}/contents/{path}");
        debug!("GET (raw) {url}");

        let resp = self
            .inner
            .get(&url)
            .bearer_auth(&self.token)
            .header(header::ACCEPT, "application/vnd.github.raw+json")
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();
        match status {
            404 => Ok(None),
            200 => Ok(Some(resp.text().await.map_err(GhError::Http)?)),
            429 | 403 => {
                let reset = resp
                    .headers()
                    .get("x-ratelimit-reset")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("unknown")
                    .to_string();
                Err(GhError::RateLimit { reset_at: reset })
            }
            _ => {
                let body: GhApiError = resp.json().await.map_err(GhError::Http)?;
                Err(GhError::Api {
                    status,
                    message: body.message,
                })
            }
        }
    }

    // ── org / repo endpoints ────────────────────────────────────────────

    pub async fn org(&self, login: &str) -> Result<GhOrg> {
        self.get(&format!("/orgs/{login}")).await
    }

    pub async fn org_repos(&self, login: &str, per_page: u8) -> Result<Vec<GhRepo>> {
        self.get(&format!(
            "/orgs/{login}/repos?per_page={per_page}&sort=pushed&direction=desc"
        ))
        .await
    }

    pub async fn repo_languages(
        &self,
        owner: &str,
        repo: &str,
    ) -> Result<HashMap<String, u64>> {
        self.get(&format!("/repos/{owner}/{repo}/languages")).await
    }

    pub async fn repo_contributors(
        &self,
        owner: &str,
        repo: &str,
    ) -> Result<Vec<GhContributor>> {
        self.get(&format!(
            "/repos/{owner}/{repo}/contributors?per_page=100&anon=false"
        ))
        .await
    }

    pub async fn repo_releases(&self, owner: &str, repo: &str) -> Result<Vec<GhRelease>> {
        self.get(&format!("/repos/{owner}/{repo}/releases?per_page=30"))
            .await
    }

    pub async fn repo_commit_activity(
        &self,
        owner: &str,
        repo: &str,
    ) -> Result<Vec<GhCommitActivity>> {
        self.get(&format!(
            "/repos/{owner}/{repo}/stats/commit_activity"
        ))
        .await
    }

    pub async fn get_user(&self, login: &str) -> Result<GhUser> {
        self.get(&format!("/users/{login}")).await
    }

    pub async fn search_repos(
        &self,
        topic: &str,
        language: Option<&str>,
        min_stars: u32,
        per_page: u8,
    ) -> Result<SearchReposResponse> {
        let mut q = format!("topic:{topic} stars:>={min_stars}");
        if let Some(lang) = language {
            q.push_str(&format!(" language:{lang}"));
        }
        let url = format!(
            "{BASE_URL}/search/repositories?q={}&sort=updated&per_page={per_page}",
            urlencoding(&q),
        );
        self.get_url(&url).await
    }
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .flat_map(|c| match c {
            ' ' => vec!['+'],
            c if c.is_alphanumeric() || "-_.~:".contains(c) => vec![c],
            c => {
                let encoded = format!("%{:02X}", c as u32);
                encoded.chars().collect()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::urlencoding;

    #[test]
    fn spaces_become_plus() {
        assert_eq!(urlencoding("hello world"), "hello+world");
    }

    #[test]
    fn alphanumeric_passthrough() {
        assert_eq!(urlencoding("abc123"), "abc123");
    }

    #[test]
    fn safe_chars_passthrough() {
        assert_eq!(urlencoding("topic:llm-rag"), "topic:llm-rag");
    }

    #[test]
    fn gt_and_eq_are_encoded() {
        assert_eq!(urlencoding(">=10"), "%3E%3D10");
    }

    #[test]
    fn full_search_query() {
        let q = "topic:llm stars:>=100 language:Python";
        let enc = urlencoding(q);
        assert_eq!(enc, "topic:llm+stars:%3E%3D100+language:Python");
    }
}

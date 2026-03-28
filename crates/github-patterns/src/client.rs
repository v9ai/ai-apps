use crate::error::{GhError, Result};
use crate::types::*;
use reqwest::{header, Client};
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use tracing::debug;

const BASE_URL: &str = "https://api.github.com";

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
            .user_agent("github-patterns/0.1")
            .default_headers(headers)
            .build()
            .map_err(GhError::Http)?;

        Ok(Self { inner, token })
    }

    /// Build from `GITHUB_TOKEN` env var.
    pub fn from_env() -> Result<Self> {
        let token = std::env::var("GITHUB_TOKEN")
            .or_else(|_| std::env::var("GH_TOKEN"))
            .map_err(|_| GhError::Other("GITHUB_TOKEN / GH_TOKEN not set".into()))?;
        Self::new(token)
    }

    // ── core request helper ──────────────────────────────────────────────────

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        self.get_url(&format!("{BASE_URL}{path}")).await
    }

    async fn get_url<T: DeserializeOwned>(&self, url: &str) -> Result<T> {
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
        if status == 403 || status == 429 {
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
            return Err(GhError::Api { status, message: body.message });
        }

        resp.json().await.map_err(GhError::Http)
    }

    // ── org / repo endpoints ─────────────────────────────────────────────────

    pub async fn org(&self, login: &str) -> Result<GhOrg> {
        self.get(&format!("/orgs/{login}")).await
    }

    pub async fn org_repos(&self, login: &str, per_page: u8) -> Result<Vec<GhRepo>> {
        self.get(&format!(
            "/orgs/{login}/repos?per_page={per_page}&sort=pushed&direction=desc"
        ))
        .await
    }

    pub async fn repo_languages(&self, owner: &str, repo: &str) -> Result<HashMap<String, u64>> {
        self.get(&format!("/repos/{owner}/{repo}/languages")).await
    }

    pub async fn repo_contributors(&self, owner: &str, repo: &str) -> Result<Vec<GhContributor>> {
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
        self.get(&format!("/repos/{owner}/{repo}/stats/commit_activity"))
            .await
    }

    /// Search repos by topic + optional language.
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

pub(crate) fn urlencoding(s: &str) -> String {
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
        // colon and hyphen are in the safe set
        assert_eq!(urlencoding("topic:llm-rag"), "topic:llm-rag");
    }

    #[test]
    fn gt_and_eq_are_encoded() {
        assert_eq!(urlencoding(">=10"), "%3E%3D10");
    }

    #[test]
    fn full_search_query() {
        // Typical query built by search_repos
        let q = "topic:llm stars:>=100 language:Python";
        let enc = urlencoding(q);
        assert_eq!(enc, "topic:llm+stars:%3E%3D100+language:Python");
    }
}

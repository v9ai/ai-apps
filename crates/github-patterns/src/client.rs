use crate::error::{GhError, Result};
use crate::types::*;
use reqwest::{header, Client};
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, warn};

const BASE_URL: &str = "https://api.github.com";
/// Delays for retry attempts: 1 s, 2 s, 4 s.
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

    // ── core request helpers ─────────────────────────────────────────────────

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        self.get_url(&format!("{BASE_URL}{path}")).await
    }

    /// JSON GET with exponential backoff on 429 / secondary-rate-limit 403.
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
        if status == 429 || (status == 403 && resp.headers().contains_key("x-ratelimit-remaining")) {
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

    /// Fetch the raw text content of a file via the GitHub contents API.
    /// Returns `None` when the file does not exist (404).
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
                Err(GhError::Api { status, message: body.message })
            }
        }
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

    /// Fetch full profile for a single user login.
    pub async fn get_user(&self, login: &str) -> Result<GhUser> {
        self.get(&format!("/users/{login}")).await
    }

    /// Search GitHub users by query string.
    ///
    /// Supports qualifiers like `location:London`, `language:python`, `type:user`.
    pub async fn search_users(
        &self,
        query: &str,
        sort: Option<&str>,
        order: Option<&str>,
        per_page: u8,
        page: u32,
    ) -> Result<SearchUsersResponse> {
        let mut url = format!(
            "{BASE_URL}/search/users?q={}&per_page={per_page}&page={page}",
            urlencoding(query),
        );
        if let Some(s) = sort {
            url.push_str(&format!("&sort={s}"));
        }
        if let Some(o) = order {
            url.push_str(&format!("&order={o}"));
        }
        self.get_url(&url).await
    }

    /// Fetch stargazers of a repo (paginated).
    pub async fn repo_stargazers(
        &self,
        owner: &str,
        repo: &str,
        per_page: u8,
        page: u32,
    ) -> Result<Vec<StargazerItem>> {
        self.get(&format!(
            "/repos/{owner}/{repo}/stargazers?per_page={per_page}&page={page}"
        ))
        .await
    }

    // ── GraphQL endpoints ────────────────────────────────────────────────

    const GQL_URL: &'static str = "https://api.github.com/graphql";

    /// POST a GraphQL query and return the parsed `data` field.
    async fn graphql<T: DeserializeOwned>(&self, query: &str, variables: Option<&serde_json::Value>) -> Result<T> {
        let body = if let Some(vars) = variables {
            serde_json::json!({ "query": query, "variables": vars })
        } else {
            serde_json::json!({ "query": query })
        };

        debug!("GraphQL POST");
        let resp = self
            .inner
            .post(Self::GQL_URL)
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();
        if status == 429 || status == 403 {
            let reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            return Err(GhError::RateLimit { reset_at: reset });
        }
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(GhError::Api { status, message: text });
        }

        let raw: serde_json::Value = resp.json().await.map_err(GhError::Http)?;
        if let Some(errors) = raw.get("errors") {
            let msg = errors.to_string();
            return Err(GhError::Api { status: 200, message: msg });
        }
        let data = raw.get("data").ok_or_else(|| GhError::Other("no data field in GraphQL response".into()))?;
        serde_json::from_value(data.clone()).map_err(GhError::Deserialize)
    }

    /// Shared GraphQL fields for User objects — used across batch, followers, and org member queries.
    const USER_GQL_FIELDS: &'static str = r#"
        login id: databaseId
        url bio company location email name
        avatarUrl websiteUrl twitterUsername
        publicRepositories: repositories(privacy: PUBLIC) { totalCount }
        publicGists: gists(privacy: PUBLIC) { totalCount }
        followers { totalCount }
        following { totalCount }
        isHireable
        createdAt updatedAt
        contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalRepositoriesWithContributedCommits
        }
        pinnedItems(first: 6) {
            nodes { ... on Repository { name stargazerCount primaryLanguage { name } } }
        }
        repositoriesContributedTo(first: 10, contributionTypes: COMMIT, orderBy: {field: STARGAZERS, direction: DESC}) {
            nodes { nameWithOwner stargazerCount primaryLanguage { name } repositoryTopics(first: 5) { nodes { topic { name } } } }
        }
        organizations(first: 5) { nodes { login name } }
        status { message }
    "#;

    /// Parse a GraphQL user JSON node into a GhUser struct.
    fn parse_gql_user(value: &serde_json::Value) -> GhUser {
        use crate::types::{PinnedRepo, ContributedRepo, OrgMembership};

        let login = value["login"].as_str().unwrap_or_default().to_string();
        let id = value["id"].as_u64().unwrap_or(0);
        let html_url = value["url"].as_str().unwrap_or_default().to_string();
        let avatar_url = value["avatarUrl"].as_str().unwrap_or_default().to_string();
        let name = value["name"].as_str().map(String::from);
        let email = value["email"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let bio = value["bio"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let company = value["company"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let location = value["location"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let blog = value["websiteUrl"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let twitter_username = value["twitterUsername"].as_str().filter(|s| !s.is_empty()).map(String::from);
        let public_repos = value["publicRepositories"]["totalCount"].as_u64().unwrap_or(0) as u32;
        let public_gists = value["publicGists"]["totalCount"].as_u64().unwrap_or(0) as u32;
        let followers = value["followers"]["totalCount"].as_u64().unwrap_or(0) as u32;
        let following = value["following"]["totalCount"].as_u64().unwrap_or(0) as u32;
        let hireable = value["isHireable"].as_bool();
        let created_at = value["createdAt"]
            .as_str()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or_else(chrono::Utc::now);
        let updated_at = value["updatedAt"]
            .as_str()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or_else(chrono::Utc::now);

        // ── Enriched: contributionsCollection ────────────────────────
        let cc = &value["contributionsCollection"];
        let total_commit_contributions = cc["totalCommitContributions"].as_u64().map(|v| v as u32);
        let total_pr_contributions = cc["totalPullRequestContributions"].as_u64().map(|v| v as u32);
        let total_review_contributions = cc["totalPullRequestReviewContributions"].as_u64().map(|v| v as u32);
        let total_repos_contributed_to = cc["totalRepositoriesWithContributedCommits"].as_u64().map(|v| v as u32);

        // ── Enriched: pinnedItems ────────────────────────────────────
        let pinned_repos_json = value["pinnedItems"]["nodes"]
            .as_array()
            .map(|nodes| {
                let repos: Vec<PinnedRepo> = nodes
                    .iter()
                    .filter(|n| n.get("name").is_some())
                    .map(|n| PinnedRepo {
                        name: n["name"].as_str().unwrap_or_default().to_string(),
                        stars: n["stargazerCount"].as_u64().unwrap_or(0) as u32,
                        language: n["primaryLanguage"]["name"].as_str().map(String::from),
                    })
                    .collect();
                serde_json::to_string(&repos).unwrap_or_default()
            })
            .filter(|s| s != "[]");

        // ── Enriched: repositoriesContributedTo ──────────────────────
        let contributed_repos_json = value["repositoriesContributedTo"]["nodes"]
            .as_array()
            .map(|nodes| {
                let repos: Vec<ContributedRepo> = nodes
                    .iter()
                    .filter(|n| n.get("nameWithOwner").is_some())
                    .map(|n| {
                        let topics: Vec<String> = n["repositoryTopics"]["nodes"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|t| t["topic"]["name"].as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default();
                        ContributedRepo {
                            name_with_owner: n["nameWithOwner"].as_str().unwrap_or_default().to_string(),
                            stars: n["stargazerCount"].as_u64().unwrap_or(0) as u32,
                            language: n["primaryLanguage"]["name"].as_str().map(String::from),
                            topics,
                        }
                    })
                    .collect();
                serde_json::to_string(&repos).unwrap_or_default()
            })
            .filter(|s| s != "[]");

        // ── Enriched: organizations ──────────────────────────────────
        let organizations_json = value["organizations"]["nodes"]
            .as_array()
            .map(|nodes| {
                let orgs: Vec<OrgMembership> = nodes
                    .iter()
                    .map(|n| OrgMembership {
                        login: n["login"].as_str().unwrap_or_default().to_string(),
                        name: n["name"].as_str().map(String::from),
                    })
                    .collect();
                serde_json::to_string(&orgs).unwrap_or_default()
            })
            .filter(|s| s != "[]");

        // ── Enriched: status message ─────────────────────────────────
        let status_message = value["status"]["message"]
            .as_str()
            .filter(|s| !s.is_empty())
            .map(String::from);

        GhUser {
            login, id, html_url, avatar_url, name, email, bio, company, location,
            blog, twitter_username, public_repos, public_gists, followers, following,
            hireable, created_at, updated_at,
            total_commit_contributions, total_pr_contributions,
            total_review_contributions, total_repos_contributed_to,
            pinned_repos_json, contributed_repos_json, organizations_json,
            status_message,
        }
    }

    /// Batch-fetch full user profiles via GraphQL. Up to 30 logins per call.
    pub async fn get_users_graphql(&self, logins: &[String]) -> Result<Vec<GhUser>> {
        if logins.is_empty() {
            return Ok(vec![]);
        }

        let fields = Self::USER_GQL_FIELDS;
        let mut parts = Vec::with_capacity(logins.len());
        for (i, login) in logins.iter().enumerate() {
            let escaped = login.replace('\\', "\\\\").replace('"', "\\\"");
            parts.push(format!("u{i}: user(login: \"{escaped}\") {{ {fields} }}"));
        }
        let query = format!("query {{ {} }}", parts.join("\n"));

        let raw: HashMap<String, serde_json::Value> = self.graphql(&query, None).await?;
        let mut users = Vec::with_capacity(raw.len());
        for value in raw.values() {
            if value.is_null() {
                continue;
            }
            users.push(Self::parse_gql_user(value));
        }
        Ok(users)
    }

    /// Fetch public members of a GitHub organization via GraphQL.
    pub async fn get_org_members_graphql(&self, org: &str, first: u32) -> Result<Vec<GhUser>> {
        let fields = Self::USER_GQL_FIELDS;
        let query = format!(
            r#"query {{ organization(login: "{org}") {{ membersWithRole(first: {first}) {{ nodes {{ {fields} }} }} }} }}"#,
        );
        let raw: serde_json::Value = self.graphql(&query, None).await?;
        let nodes = raw["organization"]["membersWithRole"]["nodes"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        Ok(nodes.iter().filter(|v| !v.is_null()).map(Self::parse_gql_user).collect())
    }

    /// Fetch followers of a user via GraphQL (enriched profiles).
    pub async fn get_user_followers_graphql(&self, login: &str, first: u32) -> Result<Vec<GhUser>> {
        let fields = Self::USER_GQL_FIELDS;
        let query = format!(
            r#"query {{ user(login: "{login}") {{ followers(first: {first}) {{ nodes {{ {fields} }} }} }} }}"#,
        );
        let raw: serde_json::Value = self.graphql(&query, None).await?;
        let nodes = raw["user"]["followers"]["nodes"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        Ok(nodes.iter().filter(|v| !v.is_null()).map(Self::parse_gql_user).collect())
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

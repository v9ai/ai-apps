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
    /// The `q` parameter supports GitHub qualifiers:
    ///   `type:user`, `location:Berlin`, `language:python`,
    ///   `followers:>100`, `repos:>10`, `created:>2020-01-01`,
    ///   plus free-text matching against username, bio, email, and name.
    pub async fn search_users(
        &self,
        q: &str,
        sort: Option<&str>,
        order: Option<&str>,
        per_page: u8,
        page: u32,
    ) -> Result<SearchUsersResponse> {
        let mut url = format!(
            "{BASE_URL}/search/users?q={}&per_page={per_page}&page={page}",
            urlencoding(q),
        );
        if let Some(s) = sort {
            url.push_str(&format!("&sort={s}"));
        }
        if let Some(o) = order {
            url.push_str(&format!("&order={o}"));
        }
        self.get_url(&url).await
    }

    /// List stargazers of a repo (login + id).
    /// Paginated — call with increasing `page` until empty.
    pub async fn repo_stargazers(
        &self,
        owner: &str,
        repo: &str,
        per_page: u8,
        page: u32,
    ) -> Result<Vec<GhUserStub>> {
        self.get(&format!(
            "/repos/{owner}/{repo}/stargazers?per_page={per_page}&page={page}"
        ))
        .await
    }

    /// List public members of a GitHub org (login + id).
    /// Paginated — call with increasing `page` until empty.
    pub async fn org_members(
        &self,
        org: &str,
        per_page: u8,
        page: u32,
    ) -> Result<Vec<GhUserStub>> {
        self.get(&format!(
            "/orgs/{org}/members?per_page={per_page}&page={page}"
        ))
        .await
    }

    /// Search repos by free-form query string.
    /// Returns repo items — use `repo.full_name` to get the owner.
    pub async fn search_repos_query(
        &self,
        q: &str,
        sort: Option<&str>,
        per_page: u8,
        page: u32,
    ) -> Result<SearchReposResponse> {
        let mut url = format!(
            "{BASE_URL}/search/repositories?q={}&per_page={per_page}&page={page}",
            urlencoding(q),
        );
        if let Some(s) = sort {
            url.push_str(&format!("&sort={s}"));
        }
        self.get_url(&url).await
    }

    // ── GraphQL batch user fetch ──────────────────────────────────────────

    /// Fetch full profiles for multiple users in a single GraphQL request.
    /// Much more efficient than individual REST `/users/{login}` calls and
    /// avoids secondary rate limits. Returns users in the same order as `logins`;
    /// missing/errored users are silently omitted.
    pub async fn get_users_graphql(&self, logins: &[&str]) -> Result<Vec<GhUser>> {
        if logins.is_empty() {
            return Ok(vec![]);
        }
        // Build aliased GraphQL query: u0: user(login:"x") { ... }, u1: ...
        // NOTE: `email` field requires `user:email` or `read:user` scope on the PAT.
        let fields = r#"login
            id: databaseId
            url
            avatarUrl
            name
            email
            bio
            company
            location
            websiteUrl
            twitterUsername
            repositories(privacy: PUBLIC) { totalCount }
            gists(privacy: PUBLIC) { totalCount }
            followers { totalCount }
            following { totalCount }
            isHireable
            createdAt
            updatedAt"#;

        let aliases: Vec<String> = logins
            .iter()
            .enumerate()
            .map(|(i, login)| {
                // Escape any quotes in login (shouldn't happen but be safe)
                let escaped = login.replace('"', r#"\""#);
                format!("u{i}: user(login: \"{escaped}\") {{ {fields} }}")
            })
            .collect();

        let query = format!("query {{ {} }}", aliases.join("\n"));

        let body = serde_json::json!({ "query": query });

        let resp = self
            .inner
            .post("https://api.github.com/graphql")
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();
        if status == 401 || status == 403 {
            let reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            if status == 403 {
                return Err(GhError::RateLimit { reset_at: reset });
            }
            let body_text = resp.text().await.unwrap_or_default();
            return Err(GhError::Api { status, message: body_text });
        }
        if !resp.status().is_success() {
            let body_text = resp.text().await.unwrap_or_default();
            return Err(GhError::Api { status, message: body_text });
        }

        let json: serde_json::Value = resp.json().await.map_err(GhError::Http)?;

        // Check for top-level errors
        if let Some(errors) = json.get("errors") {
            let err_str = serde_json::to_string(errors).unwrap_or_default();
            tracing::warn!("GraphQL errors ({} logins): {}", logins.len(), &err_str[..err_str.len().min(300)]);
            if json.get("data").is_none() {
                return Err(GhError::Other(format!("GraphQL errors: {err_str}")));
            }
        }

        let data = match json.get("data") {
            Some(d) => d,
            None => {
                tracing::warn!("GraphQL response has no 'data' field for {} logins", logins.len());
                return Ok(vec![]);
            }
        };

        let mut users = Vec::with_capacity(logins.len());
        let mut null_count = 0u32;
        let mut missing_count = 0u32;
        let mut parse_fail = 0u32;
        for i in 0..logins.len() {
            let key = format!("u{i}");
            if let Some(node) = data.get(&key) {
                if node.is_null() {
                    null_count += 1;
                    continue;
                }
                if let Some(user) = graphql_node_to_user(node) {
                    users.push(user);
                } else {
                    parse_fail += 1;
                }
            } else {
                missing_count += 1;
            }
        }
        if users.is_empty() && logins.len() > 5 {
            tracing::warn!(
                "get_users_graphql: 0/{} users parsed (null={null_count}, missing={missing_count}, parse_fail={parse_fail})",
                logins.len()
            );
            // Log first few data keys for debugging
            if let Some(obj) = data.as_object() {
                let keys: Vec<&String> = obj.keys().take(5).collect();
                tracing::warn!("  data keys sample: {:?}, total keys: {}", keys, obj.len());
            }
        }

        Ok(users)
    }

    /// Search repos by query and return fully-hydrated owner profiles (users only).
    /// Org-owned repos are filtered out (owner is not a User). This is ideal for
    /// finding individual developers who built production code with a given SDK.
    pub async fn search_repos_with_owners_graphql(
        &self,
        query: &str,
        count: u32,
    ) -> Result<Vec<GhUser>> {
        let fields = r#"login
                id: databaseId
                url
                avatarUrl
                name
                email
                bio
                company
                location
                websiteUrl
                twitterUsername
                repositories(privacy: PUBLIC) { totalCount }
                gists(privacy: PUBLIC) { totalCount }
                followers { totalCount }
                following { totalCount }
                isHireable
                createdAt
                updatedAt"#;

        let gql = format!(
            r#"query {{ search(query: "{}", type: REPOSITORY, first: {}) {{ nodes {{ ... on Repository {{ nameWithOwner owner {{ ... on User {{ {} }} }} }} }} }} }}"#,
            query.replace('"', r#"\""#),
            count.min(100),
            fields,
        );

        let body = serde_json::json!({ "query": gql });

        let resp = self
            .inner
            .post("https://api.github.com/graphql")
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();
        if status == 403 {
            let reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            return Err(GhError::RateLimit { reset_at: reset });
        }
        if !resp.status().is_success() {
            let body_text = resp.text().await.unwrap_or_default();
            return Err(GhError::Api { status, message: body_text });
        }

        let json: serde_json::Value = resp.json().await.map_err(GhError::Http)?;

        if let Some(errors) = json.get("errors") {
            if json.get("data").is_none() {
                return Err(GhError::Other(format!(
                    "GraphQL errors: {}",
                    serde_json::to_string(errors).unwrap_or_default()
                )));
            }
        }

        let nodes = json
            .get("data")
            .and_then(|d| d.get("search"))
            .and_then(|s| s.get("nodes"))
            .and_then(|n| n.as_array());

        let nodes = match nodes {
            Some(n) => n,
            None => return Ok(vec![]),
        };

        let mut users = Vec::new();
        let mut seen_logins = std::collections::HashSet::new();
        for node in nodes {
            // owner is null for org-owned repos (User spread doesn't match)
            let owner = match node.get("owner") {
                Some(o) if !o.is_null() && o.get("login").is_some() => o,
                _ => continue,
            };
            if let Some(user) = graphql_node_to_user(owner) {
                if seen_logins.insert(user.login.clone()) {
                    users.push(user);
                }
            }
        }

        Ok(users)
    }

    /// Fetch full profiles of org members in a single GraphQL query.
    /// Returns up to 100 members with full user data — no separate hydration needed.
    /// Falls back to empty vec on 403 (org members hidden) or other errors.
    pub async fn get_org_members_graphql(&self, org: &str) -> Result<Vec<GhUser>> {
        let fields = r#"login
            id: databaseId
            url
            avatarUrl
            name
            email
            bio
            company
            location
            websiteUrl
            twitterUsername
            repositories(privacy: PUBLIC) { totalCount }
            gists(privacy: PUBLIC) { totalCount }
            followers { totalCount }
            following { totalCount }
            isHireable
            createdAt
            updatedAt"#;

        let query = format!(
            r#"query {{ organization(login: "{}") {{ membersWithRole(first: 100) {{ nodes {{ {} }} }} }} }}"#,
            org.replace('"', r#"\""#),
            fields,
        );

        let body = serde_json::json!({ "query": query });

        let resp = self
            .inner
            .post("https://api.github.com/graphql")
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .map_err(GhError::Http)?;

        let status = resp.status().as_u16();
        if status == 403 {
            let reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            return Err(GhError::RateLimit { reset_at: reset });
        }
        if !resp.status().is_success() {
            let body_text = resp.text().await.unwrap_or_default();
            return Err(GhError::Api { status, message: body_text });
        }

        let json: serde_json::Value = resp.json().await.map_err(GhError::Http)?;

        // GraphQL returns errors for hidden orgs / permission issues
        if let Some(errors) = json.get("errors") {
            let msg = serde_json::to_string(errors).unwrap_or_default();
            if msg.contains("not found") || msg.contains("visible") {
                return Ok(vec![]); // org members not public
            }
            if json.get("data").and_then(|d| d.get("organization")).map_or(true, |o| o.is_null()) {
                return Err(GhError::Other(format!("GraphQL errors: {msg}")));
            }
        }

        let nodes = json
            .get("data")
            .and_then(|d| d.get("organization"))
            .and_then(|o| o.get("membersWithRole"))
            .and_then(|m| m.get("nodes"))
            .and_then(|n| n.as_array());

        let nodes = match nodes {
            Some(n) => n,
            None => return Ok(vec![]),
        };

        let users: Vec<GhUser> = nodes
            .iter()
            .filter_map(|node| graphql_node_to_user(node))
            .collect();

        Ok(users)
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

/// Convert a GraphQL user node (serde_json::Value) into a GhUser.
fn graphql_node_to_user(node: &serde_json::Value) -> Option<GhUser> {
    use chrono::{DateTime, Utc};

    let login = node.get("login")?.as_str()?.to_string();
    // "id" when aliased (get_users_graphql), "databaseId" when direct
    let id = node.get("id").or_else(|| node.get("databaseId")).and_then(|v| v.as_u64()).unwrap_or(0);
    let url = node.get("url")?.as_str()?.to_string();
    let avatar_url = node
        .get("avatarUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let name = node.get("name").and_then(|v| v.as_str()).map(String::from);
    let email = node
        .get("email")
        .and_then(|v| v.as_str())
        .filter(|e| !e.is_empty())
        .map(String::from);
    let bio = node.get("bio").and_then(|v| v.as_str()).filter(|b| !b.is_empty()).map(String::from);
    let company = node
        .get("company")
        .and_then(|v| v.as_str())
        .filter(|c| !c.is_empty())
        .map(String::from);
    let location = node
        .get("location")
        .and_then(|v| v.as_str())
        .filter(|l| !l.is_empty())
        .map(String::from);
    let blog = node
        .get("websiteUrl")
        .and_then(|v| v.as_str())
        .filter(|b| !b.is_empty())
        .map(String::from);
    let twitter_username = node
        .get("twitterUsername")
        .and_then(|v| v.as_str())
        .filter(|t| !t.is_empty())
        .map(String::from);
    let public_repos = node
        .get("repositories")
        .and_then(|v| v.get("totalCount"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let public_gists = node
        .get("gists")
        .and_then(|v| v.get("totalCount"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let followers = node
        .get("followers")
        .and_then(|v| v.get("totalCount"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let following = node
        .get("following")
        .and_then(|v| v.get("totalCount"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let hireable = node.get("isHireable").and_then(|v| v.as_bool());
    let created_at: DateTime<Utc> = node
        .get("createdAt")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(Utc::now);
    let updated_at: DateTime<Utc> = node
        .get("updatedAt")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(Utc::now);

    Some(GhUser {
        login,
        id,
        html_url: url,
        avatar_url,
        name,
        email,
        bio,
        company,
        location,
        blog,
        twitter_username,
        public_repos,
        public_gists,
        followers,
        following,
        hireable,
        created_at,
        updated_at,
    })
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

use crate::types::{GhCandidate, RepoInfo};
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};

const GH_GQL: &str = "https://api.github.com/graphql";

const SEARCH_USERS: &str = r#"
query($q: String!) {
  search(query: $q, type: USER, first: 10) {
    userCount
    nodes { ... on User { login name bio company location } }
  }
}"#;

const HYDRATE_USER: &str = r#"
query($login: String!) {
  user(login: $login) {
    login name bio company location email websiteUrl twitterUsername
    socialAccounts(first: 10) { nodes { provider url displayName } }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes { ... on Repository {
        name description stargazerCount
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
      }}
    }
    repositories(first: 10, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER) {
      nodes { name description stargazerCount
              primaryLanguage { name }
              repositoryTopics(first: 10) { nodes { topic { name } } } }
    }
  }
}"#;

pub struct Github {
    client: Client,
    token: String,
}

impl Github {
    pub fn new(token: String) -> Result<Self> {
        let client = Client::builder()
            .user_agent("leadmatch/0.1")
            .build()?;
        Ok(Self { client, token })
    }

    async fn gql(&self, query: &str, vars: Value) -> Result<Value> {
        let resp = self
            .client
            .post(GH_GQL)
            .bearer_auth(&self.token)
            .json(&json!({ "query": query, "variables": vars }))
            .send()
            .await?
            .error_for_status()?
            .json::<Value>()
            .await?;
        if let Some(errs) = resp.get("errors") {
            return Err(anyhow!("github gql errors: {}", errs));
        }
        Ok(resp["data"].clone())
    }

    pub async fn search_users(&self, q: &str) -> Result<Vec<String>> {
        let d = self.gql(SEARCH_USERS, json!({ "q": q })).await?;
        let logins = d["search"]["nodes"]
            .as_array()
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|n| n.get("login")?.as_str().map(String::from))
            .collect();
        Ok(logins)
    }

    pub async fn hydrate(&self, login: &str) -> Result<GhCandidate> {
        let d = self.gql(HYDRATE_USER, json!({ "login": login })).await?;
        let u = &d["user"];
        let parse_repos = |v: &Value| -> Vec<RepoInfo> {
            v.as_array()
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .map(|r| RepoInfo {
                    name: r["name"].as_str().unwrap_or("").into(),
                    description: r["description"].as_str().map(String::from),
                    primary_language: r["primaryLanguage"]["name"].as_str().map(String::from),
                    topics: r["repositoryTopics"]["nodes"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default()
                        .into_iter()
                        .filter_map(|t| t["topic"]["name"].as_str().map(String::from))
                        .collect(),
                    stargazers: r["stargazerCount"].as_i64(),
                })
                .collect()
        };

        let twitter = u["twitterUsername"].as_str().map(String::from).or_else(|| {
            u["socialAccounts"]["nodes"]
                .as_array()?
                .iter()
                .find(|n| n["provider"].as_str() == Some("TWITTER"))
                .and_then(|n| n["url"].as_str().map(String::from))
        });

        Ok(GhCandidate {
            login: u["login"].as_str().unwrap_or(login).into(),
            name: u["name"].as_str().map(String::from),
            bio: u["bio"].as_str().map(String::from),
            company: u["company"].as_str().map(String::from),
            location: u["location"].as_str().map(String::from),
            email: u["email"].as_str().map(String::from),
            website_url: u["websiteUrl"].as_str().map(String::from),
            twitter,
            pinned_repos: parse_repos(&u["pinnedItems"]["nodes"]),
            top_repos: parse_repos(&u["repositories"]["nodes"]),
        })
    }
}

/// Build the 3 query variants we'll route between via the bandit.
pub fn build_queries(name: &str, affiliation: Option<&str>, email: Option<&str>) -> Vec<(String, String)> {
    let mut out = vec![("name_only".to_string(), format!("\"{}\" in:name,fullname", name))];
    if let Some(a) = affiliation.filter(|s| !s.is_empty()) {
        out.push(("name_affil".into(), format!("\"{}\" {} in:bio", name, a)));
    }
    if let Some(e) = email {
        if let Some(dom) = e.split('@').nth(1) {
            out.push(("name_email_domain".into(), format!("\"{}\" {}", name, dom)));
        }
    }
    out
}

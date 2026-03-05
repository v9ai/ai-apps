use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// D1 HTTP client — supports both Gateway mode and Cloudflare REST API mode.
#[derive(Clone)]
pub struct D1Client {
    http: reqwest::Client,
    mode: D1Mode,
}

#[derive(Clone)]
enum D1Mode {
    /// Gateway worker: POST {sql, params} to gateway URL with Bearer auth
    Gateway { url: String, key: String },
    /// Cloudflare REST API: POST to /client/v4/accounts/{id}/d1/database/{db}/query
    DirectApi {
        account_id: String,
        database_id: String,
        api_token: String,
    },
}

#[derive(Serialize)]
struct D1Query {
    sql: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<Vec<Value>>,
}

#[derive(Deserialize)]
struct D1ApiResponse {
    result: Vec<D1QueryResult>,
    success: bool,
    #[serde(default)]
    errors: Vec<Value>,
}

#[derive(Deserialize)]
struct D1QueryResult {
    results: Vec<Value>,
    #[allow(dead_code)]
    success: bool,
}

impl D1Client {
    /// Create from environment variables.
    /// Tries Gateway mode first (D1_GATEWAY_URL + D1_GATEWAY_KEY),
    /// falls back to Direct API (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN).
    pub fn from_env() -> Result<Self> {
        let http = reqwest::Client::new();

        // Try gateway mode first
        if let (Ok(url), Ok(key)) = (
            std::env::var("D1_GATEWAY_URL"),
            std::env::var("D1_GATEWAY_KEY"),
        ) {
            eprintln!("D1: using gateway mode");
            return Ok(Self {
                http,
                mode: D1Mode::Gateway { url, key },
            });
        }

        // Fall back to direct API mode
        let account_id =
            std::env::var("CLOUDFLARE_ACCOUNT_ID").context("CLOUDFLARE_ACCOUNT_ID not set")?;
        let database_id = std::env::var("CLOUDFLARE_D1_DATABASE_ID")
            .context("CLOUDFLARE_D1_DATABASE_ID not set")?;
        let api_token =
            std::env::var("CLOUDFLARE_API_TOKEN").context("CLOUDFLARE_API_TOKEN not set")?;

        eprintln!("D1: using direct API mode");
        Ok(Self {
            http,
            mode: D1Mode::DirectApi {
                account_id,
                database_id,
                api_token,
            },
        })
    }

    pub fn new_gateway(gateway_url: String, gateway_key: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            mode: D1Mode::Gateway {
                url: gateway_url,
                key: gateway_key,
            },
        }
    }

    fn url_and_token(&self) -> (String, &str) {
        match &self.mode {
            D1Mode::Gateway { url, key } => (url.clone(), key.as_str()),
            D1Mode::DirectApi {
                account_id,
                database_id,
                api_token,
            } => (
                format!(
                    "https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
                ),
                api_token.as_str(),
            ),
        }
    }

    /// Execute a SQL query and return rows as serde_json::Value arrays.
    pub async fn query(&self, sql: &str, params: Option<Vec<Value>>) -> Result<Vec<Value>> {
        let body = D1Query {
            sql: sql.to_string(),
            params,
        };
        let (url, token) = self.url_and_token();

        let resp = self
            .http
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .timeout(std::time::Duration::from_secs(25))
            .send()
            .await
            .context("D1 request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 error: {status} {text}");
        }

        let data: D1ApiResponse = resp.json().await.context("D1 response parse failed")?;
        if !data.success {
            anyhow::bail!("D1 query failed: {:?}", data.errors);
        }

        let result = data
            .result
            .into_iter()
            .next()
            .context("D1 response had no result")?;

        Ok(result.results)
    }

    /// Execute a SQL query and deserialize rows into T.
    pub async fn query_as<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        params: Option<Vec<Value>>,
    ) -> Result<Vec<T>> {
        let rows = self.query(sql, params).await?;
        rows.into_iter()
            .map(|v| serde_json::from_value(v).context("row deserialize failed"))
            .collect()
    }

    /// Execute a write statement (INSERT/UPDATE/DELETE).
    pub async fn execute(&self, sql: &str, params: Option<Vec<Value>>) -> Result<()> {
        let body = D1Query {
            sql: sql.to_string(),
            params,
        };
        let (url, token) = self.url_and_token();

        let resp = self
            .http
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .timeout(std::time::Duration::from_secs(25))
            .send()
            .await
            .context("D1 request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 error: {status} {text}");
        }

        let data: D1ApiResponse = resp.json().await.context("D1 response parse failed")?;
        if !data.success {
            anyhow::bail!("D1 execute failed: {:?}", data.errors);
        }

        Ok(())
    }

    /// Execute multiple queries in a batch.
    pub async fn batch(&self, queries: Vec<(&str, Option<Vec<Value>>)>) -> Result<Vec<Vec<Value>>> {
        let bodies: Vec<D1Query> = queries
            .into_iter()
            .map(|(sql, params)| D1Query {
                sql: sql.to_string(),
                params,
            })
            .collect();

        let (url, token) = self.url_and_token();

        let resp = self
            .http
            .post(&url)
            .bearer_auth(token)
            .json(&bodies)
            .timeout(std::time::Duration::from_secs(25))
            .send()
            .await
            .context("D1 batch request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 batch error: {status} {text}");
        }

        let data: D1ApiResponse = resp.json().await.context("D1 batch parse failed")?;
        if !data.success {
            anyhow::bail!("D1 batch failed: {:?}", data.errors);
        }

        Ok(data.result.into_iter().map(|r| r.results).collect())
    }
}

use std::time::Duration;

use crate::retry::{retry_get, RetryConfig};

use super::{
    error::Error,
    types::{CoreSearchResponse, CoreWork},
};

const BASE_URL: &str = "https://api.core.ac.uk/v3";

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(2),
    max_delay: Duration::from_secs(30),
    jitter: true,
    retry_on_server_error: true,
};

#[derive(Clone)]
pub struct CoreClient {
    http: reqwest::Client,
    base_url: String,
}

impl CoreClient {
    pub fn new(api_key: Option<&str>) -> Self {
        Self::with_base_url(BASE_URL, api_key)
    }

    pub fn with_base_url(base_url: &str, api_key: Option<&str>) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(key) = api_key {
            if let Ok(val) = reqwest::header::HeaderValue::from_str(&format!("Bearer {key}")) {
                headers.insert(reqwest::header::AUTHORIZATION, val);
            }
        }
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self { http, base_url: base_url.to_string() }
    }

    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        let resp = retry_get(&self.http, url, &params, &RETRY_CONFIG, "CORE").await?;
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

    pub async fn search(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<CoreSearchResponse, Error> {
        let url = format!("{}/search/works/", self.base_url);
        let params = vec![
            ("q".into(), query.to_string()),
            ("limit".into(), limit.to_string()),
            ("offset".into(), offset.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    pub async fn get_work(&self, id: &str) -> Result<CoreWork, Error> {
        let url = format!("{}/works/{id}", self.base_url);
        let val = self.get_json(&url, vec![]).await?;
        Ok(serde_json::from_value(val)?)
    }
}

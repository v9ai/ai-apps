use std::time::Duration;

use tokio::time::sleep;

use super::{
    error::Error,
    types::{CoreSearchResponse, CoreWork},
};

const BASE_URL: &str = "https://api.core.ac.uk/v3";
const MAX_RETRIES: u32 = 3;

#[derive(Clone)]
pub struct CoreClient {
    http: reqwest::Client,
}

impl CoreClient {
    pub fn new(api_key: Option<&str>) -> Self {
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
        Self { http }
    }

    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        let mut retries = 0u32;
        loop {
            let resp = self.http.get(url).query(&params).send().await?;
            let status = resp.status();

            if status.as_u16() == 429 {
                if retries >= MAX_RETRIES {
                    return Err(Error::RateLimited {
                        retry_after: 4u64.pow(retries),
                    });
                }
                let wait_secs = 4u64.pow(retries);
                tracing::warn!(
                    retries,
                    wait_secs,
                    "CORE rate limited (429), backing off"
                );
                sleep(Duration::from_secs(wait_secs)).await;
                retries += 1;
                continue;
            }

            if !status.is_success() {
                let message = resp.text().await.unwrap_or_default();
                return Err(Error::Api {
                    status: status.as_u16(),
                    message,
                });
            }

            return Ok(resp.json().await?);
        }
    }

    pub async fn search(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<CoreSearchResponse, Error> {
        let url = format!("{BASE_URL}/search/works/");
        let params = vec![
            ("q".into(), query.to_string()),
            ("limit".into(), limit.to_string()),
            ("offset".into(), offset.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    pub async fn get_work(&self, id: &str) -> Result<CoreWork, Error> {
        let url = format!("{BASE_URL}/works/{id}");
        let val = self.get_json(&url, vec![]).await?;
        Ok(serde_json::from_value(val)?)
    }
}

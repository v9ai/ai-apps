use std::time::Duration;

use tokio::time::sleep;

use super::{
    error::Error,
    types::{CrossrefResponse, CrossrefWork},
};

const BASE_URL: &str = "https://api.crossref.org";
const MAX_RETRIES: u32 = 3;

#[derive(Clone)]
pub struct CrossrefClient {
    http: reqwest::Client,
    mailto: Option<String>,
    base_url: String,
}

impl CrossrefClient {
    pub fn new(mailto: Option<&str>) -> Self {
        Self::with_base_url(BASE_URL, mailto)
    }

    pub fn with_base_url(base_url: &str, mailto: Option<&str>) -> Self {
        let user_agent = match mailto {
            Some(email) => format!("research-crate/0.1 (mailto:{email})"),
            None => "research-crate/0.1".to_string(),
        };
        let http = reqwest::Client::builder()
            .user_agent(&user_agent)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self {
            http,
            mailto: mailto.map(|s| s.to_string()),
            base_url: base_url.to_string(),
        }
    }

    /// Low-level GET with exponential-backoff retry on 429.
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
                        retry_after: 2u64.pow(retries),
                    });
                }
                let wait_secs = 2u64.pow(retries);
                tracing::warn!(
                    retries,
                    wait_secs,
                    "Crossref rate limited (429), backing off"
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

    /// Search Crossref works by query string.
    pub async fn search(
        &self,
        query: &str,
        rows: u32,
        offset: u32,
    ) -> Result<CrossrefResponse, Error> {
        let url = format!("{}/works", self.base_url);
        let mut params = vec![
            ("query".into(), query.to_string()),
            ("rows".into(), rows.to_string()),
            ("offset".into(), offset.to_string()),
        ];
        if let Some(ref email) = self.mailto {
            params.push(("mailto".into(), email.clone()));
        }
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get a single work by DOI.
    pub async fn get_work(&self, doi: &str) -> Result<CrossrefWork, Error> {
        let url = format!("{}/works/{doi}", self.base_url);
        let params = vec![];
        let val = self.get_json(&url, params).await?;
        let work: CrossrefWork = serde_json::from_value(val["message"].clone())?;
        Ok(work)
    }
}

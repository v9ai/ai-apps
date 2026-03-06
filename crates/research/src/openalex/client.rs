use std::time::Duration;

use tokio::time::sleep;

use super::{
    error::Error,
    types::{SearchResponse, Work},
};

const BASE_URL: &str = "https://api.openalex.org";
const MAX_RETRIES: u32 = 3;

#[derive(Clone)]
pub struct OpenAlexClient {
    http: reqwest::Client,
}

impl OpenAlexClient {
    pub fn new(mailto: Option<&str>) -> Self {
        let user_agent = match mailto {
            Some(email) => format!("research-crate/0.1 (mailto:{email})"),
            None => "research-crate/0.1".to_string(),
        };
        let http = reqwest::Client::builder()
            .user_agent(user_agent)
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
                        retry_after: 2u64.pow(retries),
                    });
                }
                let wait_secs = 2u64.pow(retries);
                tracing::warn!(
                    retries,
                    wait_secs,
                    "OpenAlex rate limited (429), backing off"
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

    /// Search for works by keyword.
    pub async fn search(
        &self,
        query: &str,
        page: u32,
        per_page: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{BASE_URL}/works");
        let params = vec![
            ("search".into(), query.to_string()),
            ("page".into(), page.to_string()),
            ("per_page".into(), per_page.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get a single work by OpenAlex ID or DOI.
    pub async fn get_work(&self, id: &str) -> Result<Work, Error> {
        let url = format!("{BASE_URL}/works/{id}");
        let val = self.get_json(&url, vec![]).await?;
        Ok(serde_json::from_value(val)?)
    }
}

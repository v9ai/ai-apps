use std::time::Duration;

use crate::retry::{retry_get, RetryConfig};

use super::{
    error::Error,
    types::{CrossrefResponse, CrossrefWork},
};

const BASE_URL: &str = "https://api.crossref.org";

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(1),
    max_delay: Duration::from_secs(30),
    jitter: true,
};

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

    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        let resp = retry_get(&self.http, url, &params, &RETRY_CONFIG, "Crossref").await?;
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

    /// Search Crossref works by query string.
    pub async fn search(
        &self,
        query: &str,
        rows: u32,
        offset: u32,
    ) -> Result<CrossrefResponse, Error> {
        self.search_filtered(query, None, rows, offset).await
    }

    /// Search Crossref works with optional date filter.
    ///
    /// `from_pub_date` accepts `"YYYY-MM-DD"` and restricts results to works
    /// published on or after that date.
    pub async fn search_filtered(
        &self,
        query: &str,
        from_pub_date: Option<&str>,
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
        if let Some(date) = from_pub_date {
            params.push(("filter".into(), format!("from-pub-date:{date}")));
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

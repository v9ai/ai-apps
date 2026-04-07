use std::time::Duration;

use crate::retry::{retry_get, RetryConfig};

use super::{
    error::Error,
    types::{SearchResponse, Work},
};

const BASE_URL: &str = "https://api.openalex.org";

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(1),
    max_delay: Duration::from_secs(30),
    jitter: true,
    retry_on_server_error: true,
};

#[derive(Clone)]
pub struct OpenAlexClient {
    http: reqwest::Client,
    base_url: String,
}

impl OpenAlexClient {
    pub fn new(mailto: Option<&str>) -> Self {
        Self::with_base_url(BASE_URL, mailto)
    }

    pub fn with_base_url(base_url: &str, mailto: Option<&str>) -> Self {
        let user_agent = match mailto {
            Some(email) => format!("research-crate/0.1 (mailto:{email})"),
            None => "research-crate/0.1".to_string(),
        };
        let http = reqwest::Client::builder()
            .user_agent(user_agent)
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
        let resp = retry_get(&self.http, url, &params, &RETRY_CONFIG, "OpenAlex").await?;
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

    /// Search for works by keyword.
    pub async fn search(
        &self,
        query: &str,
        page: u32,
        per_page: u32,
    ) -> Result<SearchResponse, Error> {
        self.search_filtered(query, None, page, per_page).await
    }

    /// Search for works by keyword with optional date filter.
    ///
    /// `from_publication_date` accepts `"YYYY-MM-DD"` format and restricts
    /// results to works published on or after that date.
    pub async fn search_filtered(
        &self,
        query: &str,
        from_publication_date: Option<&str>,
        page: u32,
        per_page: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{}/works", self.base_url);
        let mut params = vec![
            ("search".into(), query.to_string()),
            ("page".into(), page.to_string()),
            ("per_page".into(), per_page.to_string()),
        ];
        if let Some(date) = from_publication_date {
            params.push(("filter".into(), format!("from_publication_date:{date}")));
        }
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get a single work by OpenAlex ID or DOI.
    pub async fn get_work(&self, id: &str) -> Result<Work, Error> {
        let url = format!("{}/works/{id}", self.base_url);
        let val = self.get_json(&url, vec![]).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Search for works affiliated with a specific institution/company.
    ///
    /// Uses `filter=authorships.institutions.display_name.search:{company_name}`
    /// to find papers where at least one author lists the given institution.
    pub async fn search_by_affiliation(
        &self,
        company_name: &str,
        page: u32,
        per_page: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{}/works", self.base_url);
        let filter = format!(
            "raw_affiliation_strings.search:{}",
            company_name
        );
        let params = vec![
            ("filter".into(), filter),
            ("page".into(), page.to_string()),
            ("per_page".into(), per_page.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Search for works by author display name.
    ///
    /// Uses `filter=authorships.author.display_name.search:{author_name}`.
    pub async fn search_by_author_name(
        &self,
        author_name: &str,
        page: u32,
        per_page: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{}/works", self.base_url);
        let filter = format!(
            "raw_author_name.search:{}",
            author_name
        );
        let params = vec![
            ("filter".into(), filter),
            ("page".into(), page.to_string()),
            ("per_page".into(), per_page.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Search institutions by name.
    ///
    /// Returns raw JSON from the OpenAlex institutions endpoint.
    pub async fn search_institutions(
        &self,
        query: &str,
        per_page: u32,
    ) -> Result<serde_json::Value, Error> {
        let url = format!("{}/institutions", self.base_url);
        let params = vec![
            ("search".into(), query.to_string()),
            ("per_page".into(), per_page.to_string()),
        ];
        self.get_json(&url, params).await
    }
}

use anyhow::Result;
use reqwest::Client;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

pub struct Fetcher {
    client: Client,
    delay_ms: u64,
    last_fetch: Arc<Mutex<HashMap<String, Instant>>>,
}

impl Fetcher {
    pub fn new(delay_ms: u64) -> Self {
        let client = Client::builder()
            .user_agent("LeadGenBot/1.0 (research; contact@yourdomain.com)")
            .timeout(Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::limited(5))
            .pool_max_idle_per_host(2)
            .build()
            .expect("failed to build http client");
        Self { client, delay_ms, last_fetch: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub async fn fetch(&self, url: &str) -> Result<FetchResult> {
        let domain = extract_domain(url).unwrap_or_default();
        {
            let mut last = self.last_fetch.lock().await;
            if let Some(prev) = last.get(&domain) {
                let elapsed = prev.elapsed();
                let delay = Duration::from_millis(self.delay_ms);
                if elapsed < delay { tokio::time::sleep(delay - elapsed).await; }
            }
            last.insert(domain.clone(), Instant::now());
        }

        let resp = self.client.get(url).send().await?;
        let status = resp.status().as_u16();
        let content_type = resp.headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("").to_string();

        if !content_type.contains("text/html") && !content_type.is_empty() {
            return Ok(FetchResult { url: url.to_string(), status, html: String::new(), is_html: false });
        }

        let html = resp.text().await?;
        Ok(FetchResult { url: url.to_string(), status, html, is_html: true })
    }
}

pub struct FetchResult {
    pub url: String,
    pub status: u16,
    pub html: String,
    pub is_html: bool,
}

fn extract_domain(url: &str) -> Option<String> {
    url.split("://").nth(1).and_then(|s| s.split('/').next()).map(|s| s.to_lowercase())
}

pub struct CrawlJob {
    pub domain: String,
    pub base_url: String,
    pub pages: Vec<String>,
}

impl CrawlJob {
    pub fn from_domain(domain: &str) -> Self {
        Self {
            domain: domain.to_string(),
            base_url: format!("https://{}", domain),
            pages: vec![
                "/".into(), "/about".into(), "/about-us".into(),
                "/team".into(), "/our-team".into(), "/leadership".into(),
                "/careers".into(), "/jobs".into(), "/pricing".into(),
                "/contact".into(), "/customers".into(), "/case-studies".into(),
            ],
        }
    }

    pub fn urls(&self) -> Vec<String> {
        self.pages.iter().map(|p| format!("{}{}", self.base_url, p)).collect()
    }
}

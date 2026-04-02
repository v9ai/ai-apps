/// Cloudflare Browser Rendering REST API client.
///
/// Renders pages via headless Chromium-as-a-service — useful for JS-heavy
/// company sites that return empty HTML with plain reqwest.
///
/// Required env vars:
///   CLOUDFLARE_ACCOUNT_ID
///   CLOUDFLARE_BROWSER_RENDERING_KEY
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

const BASE: &str = "https://api.cloudflare.com/client/v4/accounts";

// ── client ────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct BrowserRenderClient {
    account_id: String,
    api_key: String,
    http: reqwest::Client,
}

impl BrowserRenderClient {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            account_id: std::env::var("CLOUDFLARE_ACCOUNT_ID")
                .context("CLOUDFLARE_ACCOUNT_ID not set")?,
            api_key: std::env::var("CLOUDFLARE_BROWSER_RENDERING_KEY")
                .context("CLOUDFLARE_BROWSER_RENDERING_KEY not set")?,
            http: reqwest::Client::new(),
        })
    }

    fn url(&self, endpoint: &str) -> String {
        format!("{}/{}/browser-rendering/{}", BASE, self.account_id, endpoint)
    }

    /// POST /content — returns fully rendered HTML after JS execution.
    pub async fn fetch_content(&self, url: &str, opts: ContentOptions) -> Result<String> {
        #[derive(Serialize)]
        struct Req<'a> {
            url: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            wait_for_timeout: Option<u32>,
            #[serde(skip_serializing_if = "Vec::is_empty")]
            reject_resource_types: Vec<ResourceType>,
        }

        #[derive(Deserialize)]
        struct Resp {
            result: ContentResult,
        }

        #[derive(Deserialize)]
        struct ContentResult {
            content: String,
        }

        let body = Req {
            url,
            wait_for_timeout: opts.wait_for_timeout,
            reject_resource_types: opts.reject_resource_types,
        };

        let resp = self
            .http
            .post(self.url("content"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .context("browser-rendering /content request failed")?;

        check_status(&resp)?;
        let data: Resp = resp.json().await.context("parsing /content response")?;
        Ok(data.result.content)
    }

    /// POST /screenshot — returns PNG bytes.
    pub async fn screenshot(&self, url: &str, opts: ScreenshotOptions) -> Result<Vec<u8>> {
        #[derive(Serialize)]
        struct Req<'a> {
            url: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            full_page: Option<bool>,
            #[serde(skip_serializing_if = "Option::is_none")]
            clip: Option<Clip>,
        }

        #[derive(Deserialize)]
        struct Resp {
            result: ScreenshotResult,
        }

        #[derive(Deserialize)]
        struct ScreenshotResult {
            /// Base64-encoded PNG.
            screenshot: String,
        }

        let body = Req {
            url,
            full_page: opts.full_page,
            clip: opts.clip,
        };

        let resp = self
            .http
            .post(self.url("screenshot"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .context("browser-rendering /screenshot request failed")?;

        check_status(&resp)?;
        let data: Resp = resp.json().await.context("parsing /screenshot response")?;
        use base64::Engine as _;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&data.result.screenshot)
            .context("decoding screenshot base64")?;
        Ok(bytes)
    }

    /// POST /scrape — returns elements matching the given CSS selectors.
    pub async fn scrape(&self, url: &str, selectors: &[&str]) -> Result<Vec<ScrapedElement>> {
        #[derive(Serialize)]
        struct Req<'a> {
            url: &'a str,
            elements: Vec<ElementSelector<'a>>,
        }

        #[derive(Serialize)]
        struct ElementSelector<'a> {
            selector: &'a str,
        }

        #[derive(Deserialize)]
        struct Resp {
            result: ScrapeResult,
        }

        #[derive(Deserialize)]
        struct ScrapeResult {
            elements: Vec<ScrapedElement>,
        }

        let body = Req {
            url,
            elements: selectors
                .iter()
                .map(|s| ElementSelector { selector: s })
                .collect(),
        };

        let resp = self
            .http
            .post(self.url("scrape"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .context("browser-rendering /scrape request failed")?;

        check_status(&resp)?;
        let data: Resp = resp.json().await.context("parsing /scrape response")?;
        Ok(data.result.elements)
    }

    /// POST /links — returns all `<a href>` URLs on the page.
    pub async fn links(&self, url: &str) -> Result<Vec<String>> {
        #[derive(Serialize)]
        struct Req<'a> {
            url: &'a str,
        }

        #[derive(Deserialize)]
        struct Resp {
            result: LinksResult,
        }

        #[derive(Deserialize)]
        struct LinksResult {
            links: Vec<LinkEntry>,
        }

        #[derive(Deserialize)]
        struct LinkEntry {
            href: String,
        }

        let body = Req { url };

        let resp = self
            .http
            .post(self.url("links"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .context("browser-rendering /links request failed")?;

        check_status(&resp)?;
        let data: Resp = resp.json().await.context("parsing /links response")?;
        Ok(data.result.links.into_iter().map(|l| l.href).collect())
    }
}

// ── options / result types ────────────────────────────────────────────────────

#[derive(Default)]
pub struct ContentOptions {
    /// Milliseconds to wait after page load before capturing HTML.
    pub wait_for_timeout: Option<u32>,
    /// Skip fetching these resource types (saves bandwidth).
    pub reject_resource_types: Vec<ResourceType>,
}

#[derive(Default)]
pub struct ScreenshotOptions {
    /// Capture full scrollable page (not just viewport).
    pub full_page: Option<bool>,
    /// Crop to a specific region.
    pub clip: Option<Clip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScrapedElement {
    pub selector: String,
    pub results: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ResourceType {
    Image,
    Stylesheet,
    Font,
    Media,
    Script,
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn check_status(resp: &reqwest::Response) -> Result<()> {
    let status = resp.status();
    if !status.is_success() {
        anyhow::bail!("browser-rendering API error: HTTP {}", status);
    }
    Ok(())
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Integration test — requires live env vars; skipped by default.
    #[tokio::test]
    #[ignore]
    async fn fetch_content_live() {
        let client = BrowserRenderClient::from_env().unwrap();
        let html = client
            .fetch_content(
                "https://example.com",
                ContentOptions {
                    wait_for_timeout: Some(2000),
                    reject_resource_types: vec![ResourceType::Image, ResourceType::Stylesheet],
                },
            )
            .await
            .unwrap();
        assert!(html.contains("<html"), "expected HTML document");
    }

    #[tokio::test]
    #[ignore]
    async fn links_live() {
        let client = BrowserRenderClient::from_env().unwrap();
        let links = client.links("https://example.com").await.unwrap();
        assert!(!links.is_empty());
    }
}

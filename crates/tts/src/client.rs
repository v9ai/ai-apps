use reqwest::{header, Response};
use serde::Serialize;

use crate::error::{ApiError, Error, Result};
use crate::types::{TtsRequest, TtsResponse};

const BASE_URL: &str = "https://dashscope-intl.aliyuncs.com/api/v1";
const TTS_PATH: &str = "/services/aigc/multimodal-generation/generation";

/// Async DashScope client for Qwen TTS models.
///
/// # Example
/// ```no_run
/// use tts::{Client, TtsRequest, Voice};
///
/// #[tokio::main]
/// async fn main() {
///     let client = Client::new("your-dashscope-api-key");
///     let resp = client
///         .synthesize(TtsRequest::new("Hello world", Voice::Cherry))
///         .await
///         .unwrap();
///     println!("audio URL: {:?}", resp.output.audio.url);
/// }
/// ```
#[derive(Clone)]
pub struct Client {
    http: reqwest::Client,
    base_url: String,
}

impl Client {
    pub fn new(api_key: impl Into<String>) -> Self {
        let api_key = api_key.into();
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&format!("Bearer {api_key}"))
                .expect("invalid API key characters"),
        );

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .expect("failed to build HTTP client");

        Self {
            http,
            base_url: BASE_URL.to_owned(),
        }
    }

    /// Override the base URL (useful for testing or regional endpoints).
    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    async fn post<B: Serialize>(&self, path: &str, body: &B) -> Result<TtsResponse> {
        let url = format!("{}{path}", self.base_url);
        let response = self.http.post(&url).json(body).send().await?;
        self.parse_response(response).await
    }

    async fn parse_response(&self, response: Response) -> Result<TtsResponse> {
        let status = response.status();
        if status.is_success() {
            Ok(response.json::<TtsResponse>().await?)
        } else {
            let body = response.text().await.unwrap_or_default();
            if let Ok(api_error) = serde_json::from_str::<ApiError>(&body) {
                if api_error.code.as_deref() == Some("AllocationQuota.FreeTierOnly") {
                    return Err(Error::QuotaExhausted);
                }
                Err(Error::Api {
                    status,
                    error: api_error,
                })
            } else {
                Err(Error::Http { status, body })
            }
        }
    }

    // ─── TTS ──────────────────────────────────────────────────────────────────

    /// Synthesize speech (non-streaming). Returns a response with an audio URL.
    pub async fn synthesize(&self, req: TtsRequest) -> Result<TtsResponse> {
        self.post(TTS_PATH, &req).await
    }

    /// Convenience: synthesize and download the WAV bytes from the returned URL.
    pub async fn synthesize_bytes(&self, req: TtsRequest) -> Result<Vec<u8>> {
        let resp = self.synthesize(req).await?;
        let url = resp
            .output
            .audio
            .url
            .ok_or_else(|| Error::Http {
                status: reqwest::StatusCode::INTERNAL_SERVER_ERROR,
                body: "no audio URL in response".into(),
            })?;
        let bytes = self.http.get(&url).send().await?.bytes().await?;
        Ok(bytes.to_vec())
    }
}

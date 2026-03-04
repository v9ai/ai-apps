use reqwest::{header, Response};
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::error::{ApiError, Error, Result};
use crate::types::{ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse};

const BASE_URL: &str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/// Async DashScope client for Qwen models.
///
/// # Example
/// ```no_run
/// use qwen::{Client, EmbeddingRequest};
///
/// #[tokio::main]
/// async fn main() {
///     let client = Client::new("your-dashscope-api-key");
///     let resp = client
///         .embed(EmbeddingRequest::new("Hello world"))
///         .await
///         .unwrap();
///     println!("dims: {}", resp.data[0].embedding.len());
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

    async fn post<B: Serialize, R: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<R> {
        let url = format!("{}{path}", self.base_url);
        let response = self.http.post(&url).json(body).send().await?;
        self.parse_response(response).await
    }

    async fn parse_response<R: DeserializeOwned>(&self, response: Response) -> Result<R> {
        let status = response.status();
        if status.is_success() {
            Ok(response.json::<R>().await?)
        } else {
            let body = response.text().await.unwrap_or_default();
            if let Ok(api_error) = serde_json::from_str::<ApiError>(&body) {
                Err(Error::Api {
                    status,
                    error: api_error,
                })
            } else {
                Err(Error::Http { status, body })
            }
        }
    }

    // ─── Embeddings ─────────────────────────────────────────────────────────

    /// Generate embeddings for text input(s).
    pub async fn embed(&self, req: EmbeddingRequest) -> Result<EmbeddingResponse> {
        self.post("/embeddings", &req).await
    }

    /// Convenience: embed a single string and return its vector.
    pub async fn embed_one(&self, text: impl Into<String>) -> Result<Vec<f32>> {
        let resp = self.embed(EmbeddingRequest::new(text)).await?;
        Ok(resp.data.into_iter().next().map(|d| d.embedding).unwrap_or_default())
    }

    // ─── Chat completions ─────────────────────────────────────────────────────

    /// Send a chat completion request.
    pub async fn chat(&self, req: ChatRequest) -> Result<ChatResponse> {
        self.post("/chat/completions", &req).await
    }
}

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use reqwest::{header, Response};
use serde::de::DeserializeOwned;
use tracing::{debug, warn};

use crate::error::{ApiError, Error, Result};
use crate::types::*;

const DEFAULT_URL: &str = "http://localhost:8000/v1";
const DEFAULT_MODEL: &str = "Qwen/Qwen3-VL-2B-Instruct";

#[derive(Clone)]
pub struct VlClient {
    http: reqwest::Client,
    base_url: String,
    model: String,
}

impl VlClient {
    pub fn local() -> Self {
        Self::new(DEFAULT_URL, None)
    }

    pub fn new(base_url: &str, api_key: Option<&str>) -> Self {
        let mut headers = header::HeaderMap::new();
        if let Some(key) = api_key {
            headers.insert(
                header::AUTHORIZATION,
                header::HeaderValue::from_str(&format!("Bearer {key}"))
                    .expect("invalid API key characters"),
            );
        }

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("failed to build HTTP client");

        Self {
            http,
            base_url: base_url.trim_end_matches('/').to_owned(),
            model: DEFAULT_MODEL.to_owned(),
        }
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }

    pub async fn health(&self) -> Result<bool> {
        let url = format!("{}/models", self.base_url);
        match self.http.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => Ok(true),
            Ok(_) => Ok(false),
            Err(e) => {
                warn!(url = %url, error = %e, "vLLM health check failed");
                Err(Error::ServerUnavailable {
                    url: self.base_url.clone(),
                })
            }
        }
    }

    pub async fn chat(&self, req: VlChatRequest) -> Result<VlChatResponse> {
        let url = format!("{}/chat/completions", self.base_url);
        let response = self.http.post(&url).json(&req).send().await?;
        self.parse_response(response).await
    }

    pub async fn extract_from_html<T: DeserializeOwned>(
        &self,
        html_text: &str,
        system_prompt: &str,
    ) -> Result<T> {
        let user_content = format!(
            "Extract data from the following web page content:\n\n{}",
            html_text
        );

        let req = VlChatRequest {
            model: self.model.clone(),
            messages: vec![
                VlMessage::system(system_prompt),
                VlMessage::user_text(user_content),
            ],
            temperature: Some(0.0),
            max_tokens: Some(2048),
            response_format: Some(ResponseFormat::json_object()),
        };

        let resp = self.chat(req).await?;
        let raw = resp.text().ok_or_else(|| Error::ExtractionFailed {
            raw_output: String::new(),
        })?;

        debug!(raw_len = raw.len(), "VLM extraction response received");
        serde_json::from_str(raw).map_err(|_| Error::ExtractionFailed {
            raw_output: raw.to_owned(),
        })
    }

    pub async fn extract_from_screenshot<T: DeserializeOwned>(
        &self,
        png_bytes: &[u8],
        system_prompt: &str,
    ) -> Result<T> {
        let b64 = BASE64.encode(png_bytes);
        let data_url = format!("data:image/png;base64,{}", b64);

        let req = VlChatRequest {
            model: self.model.clone(),
            messages: vec![
                VlMessage::system(system_prompt),
                VlMessage::user_blocks(vec![
                    ContentBlock::ImageUrl {
                        image_url: ImageUrl {
                            url: data_url,
                            detail: Some("high".into()),
                        },
                    },
                    ContentBlock::Text {
                        text: "Extract structured data from this web page screenshot.".into(),
                    },
                ]),
            ],
            temperature: Some(0.0),
            max_tokens: Some(2048),
            response_format: Some(ResponseFormat::json_object()),
        };

        let resp = self.chat(req).await?;
        let raw = resp.text().ok_or_else(|| Error::ExtractionFailed {
            raw_output: String::new(),
        })?;

        debug!(raw_len = raw.len(), "VLM screenshot extraction response received");
        serde_json::from_str(raw).map_err(|_| Error::ExtractionFailed {
            raw_output: raw.to_owned(),
        })
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
}

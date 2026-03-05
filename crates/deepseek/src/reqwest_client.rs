use async_trait::async_trait;
use crate::client::HttpClient;
use crate::error::{DeepSeekError, Result};
use crate::types::*;

/// Native reqwest-based transport.
#[derive(Clone)]
pub struct ReqwestClient {
    client: reqwest::Client,
}

impl ReqwestClient {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new() }
    }

    pub fn with_client(client: reqwest::Client) -> Self {
        Self { client }
    }
}

impl Default for ReqwestClient {
    fn default() -> Self { Self::new() }
}

#[async_trait]
impl HttpClient for ReqwestClient {
    async fn post_json(&self, url: &str, bearer_token: &str, body: &ChatRequest) -> Result<ChatResponse> {
        let resp = self
            .client
            .post(url)
            .bearer_auth(bearer_token)
            .json(body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(DeepSeekError::Api { status: status.as_u16(), body: text });
        }

        let chat_resp: ChatResponse = resp.json().await?;
        Ok(chat_resp)
    }
}

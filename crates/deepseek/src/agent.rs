use async_trait::async_trait;
use serde_json::{Value, json};
use tracing::info;

use crate::client::HttpClient;
use crate::error::{DeepSeekError, Result};
use crate::types::*;

// ─── ToolDefinition ──────────────────────────────────────────────────────────

pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}

// ─── Tool trait ──────────────────────────────────────────────────────────────

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn definition(&self) -> ToolDefinition;
    async fn call_json(&self, args: Value) -> std::result::Result<String, String>;
}

// ─── AgentBuilder ────────────────────────────────────────────────────────────

pub struct AgentBuilder<H: HttpClient> {
    http: H,
    api_key: String,
    model: String,
    preamble: String,
    tools: Vec<Box<dyn Tool>>,
    base_url: String,
    worker_id: String,
}

impl<H: HttpClient> AgentBuilder<H> {
    pub fn new(http: H, api_key: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            http,
            api_key: api_key.into(),
            model: model.into(),
            preamble: String::new(),
            tools: Vec::new(),
            base_url: "https://api.deepseek.com".into(),
            worker_id: String::new(),
        }
    }

    pub fn preamble(mut self, p: &str) -> Self {
        self.preamble = p.into();
        self
    }

    pub fn tool(mut self, t: impl Tool + 'static) -> Self {
        self.tools.push(Box::new(t));
        self
    }

    pub fn base_url(mut self, url: &str) -> Self {
        self.base_url = url.trim_end_matches('/').into();
        self
    }

    pub fn worker_id(mut self, id: impl Into<String>) -> Self {
        self.worker_id = id.into();
        self
    }

    pub fn build(self) -> DeepSeekAgent<H> {
        DeepSeekAgent {
            http: self.http,
            api_key: self.api_key,
            model: self.model,
            preamble: self.preamble,
            tools: self.tools,
            base_url: self.base_url,
            worker_id: self.worker_id,
        }
    }
}

// ─── DeepSeekAgent ───────────────────────────────────────────────────────────

pub struct DeepSeekAgent<H: HttpClient> {
    http: H,
    api_key: String,
    model: String,
    preamble: String,
    tools: Vec<Box<dyn Tool>>,
    base_url: String,
    worker_id: String,
}

impl<H: HttpClient> DeepSeekAgent<H> {
    /// Run the agentic tool-use loop and return the final text response.
    pub async fn prompt(&self, user_prompt: String) -> Result<String> {
        let worker = if self.worker_id.is_empty() { "agent" } else { &self.worker_id };
        let tools_json: Vec<Value> = self
            .tools
            .iter()
            .map(|t| {
                let def = t.definition();
                json!({
                    "type": "function",
                    "function": {
                        "name": def.name,
                        "description": def.description,
                        "parameters": def.parameters,
                    }
                })
            })
            .collect();

        let mut messages: Vec<Value> = vec![
            json!({"role": "system", "content": self.preamble}),
            json!({"role": "user",   "content": user_prompt}),
        ];

        loop {
            let mut body = json!({
                "model": self.model,
                "messages": messages,
            });
            if !tools_json.is_empty() {
                body["tools"] = json!(tools_json);
            }

            let url = format!("{}/v1/chat/completions", self.base_url);
            let body_str = serde_json::to_string(&body)?;

            // Use raw JSON post since agent uses untyped messages
            let resp = post_raw_json(&self.http, &url, &self.api_key, &body_str).await?;

            let choice = &resp["choices"][0];
            let finish_reason = choice["finish_reason"].as_str().unwrap_or("stop");
            let message = &choice["message"];

            match finish_reason {
                "tool_calls" => {
                    messages.push(message.clone());

                    let calls = message["tool_calls"]
                        .as_array()
                        .ok_or_else(|| DeepSeekError::Other("expected tool_calls array".into()))?;

                    for call in calls {
                        let call_id = call["id"].as_str().unwrap_or("").to_string();
                        let fn_name = call["function"]["name"].as_str().unwrap_or("");
                        let args_str = call["function"]["arguments"].as_str().unwrap_or("{}");
                        let args: Value = serde_json::from_str(args_str).unwrap_or(json!({}));

                        info!(worker = %worker, tool = %fn_name, "Tool call");
                        let result = match self.tools.iter().find(|t| t.name() == fn_name) {
                            Some(tool) => tool
                                .call_json(args)
                                .await
                                .unwrap_or_else(|e| format!("Tool error: {e}")),
                            None => format!("Unknown tool: {fn_name}"),
                        };

                        messages.push(json!({
                            "role":        "tool",
                            "tool_call_id": call_id,
                            "content":     result,
                        }));
                    }
                }
                _ => {
                    return message["content"]
                        .as_str()
                        .map(String::from)
                        .ok_or_else(|| {
                            DeepSeekError::Other(format!("No content in response: {resp}"))
                        });
                }
            }
        }
    }
}

/// Raw JSON post helper for the agent loop (which uses untyped Value messages).
async fn post_raw_json<H: HttpClient>(
    http: &H,
    url: &str,
    bearer_token: &str,
    body_json: &str,
) -> Result<Value> {
    // Parse the body back to a ChatRequest-compatible form for the HttpClient trait.
    // The agent loop uses untyped JSON messages, so we deserialize to ChatRequest.
    // If that fails (e.g. agent uses raw JSON messages), fall back to a minimal request.
    let request: ChatRequest = serde_json::from_str(body_json)?;
    let response = http.post_json(url, bearer_token, &request).await?;
    // Convert back to Value for untyped processing
    Ok(serde_json::to_value(response).unwrap_or_default())
}

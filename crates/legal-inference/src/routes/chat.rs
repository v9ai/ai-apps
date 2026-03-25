use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

use crate::models::llm::ChatMessage;
use crate::state::AppState;

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct ChatCompletionRequest {
    #[serde(default)]
    pub model: Option<String>,
    pub messages: Vec<ChatMessage>,
    #[serde(default = "default_temperature")]
    pub temperature: f64,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: usize,
    #[serde(default)]
    pub top_p: Option<f64>,
    #[serde(default)]
    pub response_format: Option<ResponseFormat>,
}

fn default_temperature() -> f64 {
    0.7
}
fn default_max_tokens() -> usize {
    4096
}

#[derive(Deserialize)]
pub struct ResponseFormat {
    #[serde(rename = "type")]
    pub format_type: String,
}

#[derive(Serialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub object: &'static str,
    pub model: String,
    pub choices: Vec<Choice>,
    pub usage: Usage,
}

#[derive(Serialize)]
pub struct Choice {
    pub index: usize,
    pub message: ResponseMessage,
    pub finish_reason: &'static str,
}

#[derive(Serialize)]
pub struct ResponseMessage {
    pub role: &'static str,
    pub content: String,
}

#[derive(Serialize)]
pub struct Usage {
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub total_tokens: usize,
}

pub async fn completions(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChatCompletionRequest>,
) -> Result<Json<ChatCompletionResponse>, (StatusCode, String)> {
    let mut messages = req.messages.clone();

    // If JSON mode requested, prepend a system hint
    if let Some(ref fmt) = req.response_format {
        if fmt.format_type == "json_object" {
            let has_system = messages.iter().any(|m| m.role == "system");
            let json_hint = "You must respond with valid JSON only. No markdown, no explanation, just a JSON object.";
            if has_system {
                if let Some(sys) = messages.iter_mut().find(|m| m.role == "system") {
                    sys.content = format!("{}\n\n{}", sys.content, json_hint);
                }
            } else {
                messages.insert(
                    0,
                    ChatMessage {
                        role: "system".to_string(),
                        content: json_hint.to_string(),
                    },
                );
            }
        }
    }

    let mut llm = state.llm.lock().await;
    let prompt = llm.format_chat_prompt(&messages);

    let (content, prompt_tokens, completion_tokens) = llm
        .generate(&prompt, req.max_tokens, req.temperature, req.top_p)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let id = format!("local-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    Ok(Json(ChatCompletionResponse {
        id,
        object: "chat.completion",
        model: state.config.llm_model.clone(),
        choices: vec![Choice {
            index: 0,
            message: ResponseMessage {
                role: "assistant",
                content,
            },
            finish_reason: "stop",
        }],
        usage: Usage {
            prompt_tokens,
            completion_tokens,
            total_tokens: prompt_tokens + completion_tokens,
        },
    }))
}

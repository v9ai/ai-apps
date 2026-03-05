// ═══════════════════════════════════════════════════════════════════════════
// MODULE: deepseek — DeepSeek API client for Cloudflare Workers (WASM)
// ═══════════════════════════════════════════════════════════════════════════
//
// Uses worker::Fetch (CF Workers native fetch) instead of reqwest.
// Types come from the shared `deepseek` crate via `crate::types::*`.
// ═══════════════════════════════════════════════════════════════════════════

use worker::*;
use serde_json::json;

use crate::types::*;

const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/v1/chat/completions";

/// DeepSeek API client — WASM-compatible, uses CF Workers native fetch.
pub struct DeepSeekClient {
    api_key: String,
}

impl DeepSeekClient {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    pub fn from_env(env: &Env) -> Result<Self> {
        let api_key = env.secret("DEEPSEEK_API_KEY")
            .map_err(|_| Error::RustError("DEEPSEEK_API_KEY secret not set".into()))?
            .to_string();
        Ok(Self::new(api_key))
    }

    pub async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse> {
        let body = serde_json::to_string(request)
            .map_err(|e| Error::RustError(format!("Serialize error: {e}")))?;

        let headers = Headers::new();
        headers.set("Content-Type", "application/json")?;
        headers.set("Authorization", &format!("Bearer {}", self.api_key))?;

        let mut init = RequestInit::new();
        init.with_method(Method::Post)
            .with_headers(headers)
            .with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body)));

        let request = Request::new_with_init(DEEPSEEK_API_URL, &init)?;
        let mut response = Fetch::Request(request).send().await?;

        if response.status_code() != 200 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(Error::RustError(format!(
                "DeepSeek API error ({}): {}", response.status_code(), error_text
            )));
        }

        let response_text = response.text().await?;
        let chat_response: ChatResponse = serde_json::from_str(&response_text)
            .map_err(|e| Error::RustError(format!("Deserialize error: {e}")))?;

        Ok(chat_response)
    }

    /// Run the agent loop: send prompt, handle tool calls, iterate until done.
    pub async fn agent_loop<F, Fut>(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        model: &DeepSeekModel,
        tools: &[ToolSchema],
        tool_executor: F,
        max_turns: u32,
        effort: &EffortLevel,
    ) -> Result<AgentResult>
    where
        F: Fn(String, serde_json::Value) -> Fut,
        Fut: std::future::Future<Output = std::result::Result<serde_json::Value, String>>,
    {
        let mut messages = vec![
            system_msg(system_prompt),
            user_msg(user_prompt),
        ];

        let tool_schemas = if tools.is_empty() { None } else { Some(tools.to_vec()) };
        let mut total_usage = UsageInfo { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        let mut tool_calls_made: Vec<String> = Vec::new();
        let mut turn = 0;

        loop {
            if turn >= max_turns {
                return Ok(AgentResult {
                    success: false,
                    result: None,
                    error: Some(format!("Max turns ({max_turns}) exceeded")),
                    turns: turn,
                    usage: total_usage,
                    tool_calls_made: Some(tool_calls_made),
                    session_id: None,
                });
            }

            let request = deepseek::build_request(
                model, messages.clone(), tool_schemas.clone(), effort,
            );
            let response = self.chat(&request).await?;

            if let Some(usage) = &response.usage {
                total_usage.prompt_tokens += usage.prompt_tokens;
                total_usage.completion_tokens += usage.completion_tokens;
                total_usage.total_tokens += usage.total_tokens;
            }

            let choice = response.choices.first()
                .ok_or_else(|| Error::RustError("No choices in response".into()))?;

            if let Some(ref calls) = choice.message.tool_calls {
                if !calls.is_empty() {
                    messages.push(ChatMessage {
                        role: "assistant".into(),
                        content: choice.message.content.clone(),
                        reasoning_content: choice.message.reasoning_content.clone(),
                        tool_calls: Some(calls.clone()),
                        tool_call_id: None,
                        name: None,
                    });

                    for call in calls {
                        tool_calls_made.push(call.function.name.clone());

                        let args: serde_json::Value = serde_json::from_str(&call.function.arguments)
                            .unwrap_or(json!({}));

                        let result = tool_executor(call.function.name.clone(), args).await;
                        let result_str = match result {
                            Ok(v) => serde_json::to_string(&v).unwrap_or_default(),
                            Err(e) => json!({"error": e}).to_string(),
                        };

                        messages.push(tool_result_msg(&call.id, &result_str));
                    }

                    turn += 1;
                    continue;
                }
            }

            let result_text = choice.message.content.as_str().to_string();
            return Ok(AgentResult {
                success: true,
                result: Some(result_text),
                error: None,
                turns: turn + 1,
                usage: total_usage,
                tool_calls_made: Some(tool_calls_made),
                session_id: None,
            });
        }
    }
}

/// Tool executor function type for the agent loop.
pub type ToolExecutorFn = Box<dyn Fn(String, serde_json::Value) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = std::result::Result<serde_json::Value, String>>>
>>;

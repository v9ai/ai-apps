use futures::future::join_all;
use serde_json::json;

use crate::error::{Result, SddError};
use crate::traits::LlmClient;
use crate::types::*;

/// Build a ChatRequest with tool schemas for function calling.
pub fn build_request(
    model: &DeepSeekModel,
    messages: Vec<ChatMessage>,
    tools: Option<Vec<ToolSchema>>,
    effort: &EffortLevel,
) -> ChatRequest {
    let has_tools = tools.is_some();
    ChatRequest {
        model: model.as_str().to_string(),
        messages,
        tools,
        tool_choice: if has_tools { Some(json!("auto")) } else { None },
        temperature: Some(effort.temperature()),
        max_tokens: Some(effort.max_tokens()),
        stream: Some(false),
    }
}

/// Run the agent loop: send prompt, handle tool calls, iterate until done.
/// Generic over any `LlmClient` implementation.
pub async fn agent_loop<C, F, Fut>(
    client: &C,
    system_prompt: &str,
    user_prompt: &str,
    model: &DeepSeekModel,
    tools: &[ToolSchema],
    tool_executor: F,
    max_turns: u32,
    effort: &EffortLevel,
) -> Result<AgentResult>
where
    C: LlmClient,
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

        let request = build_request(model, messages.clone(), tool_schemas.clone(), effort);
        let response = client.chat(&request).await?;

        // Accumulate usage
        if let Some(usage) = &response.usage {
            total_usage.prompt_tokens += usage.prompt_tokens;
            total_usage.completion_tokens += usage.completion_tokens;
            total_usage.total_tokens += usage.total_tokens;
        }

        let choice = response.choices.first()
            .ok_or(SddError::EmptyResponse)?;

        // Check if the model wants to call tools
        if let Some(ref calls) = choice.message.tool_calls {
            if !calls.is_empty() {
                // Add assistant message with tool calls to history
                messages.push(ChatMessage {
                    role: "assistant".into(),
                    content: choice.message.content.clone(),
                    reasoning_content: choice.message.reasoning_content.clone(),
                    tool_calls: Some(calls.clone()),
                    tool_call_id: None,
                    name: None,
                });

                // Execute all tool calls in parallel
                let futures: Vec<_> = calls.iter().map(|call| {
                    let name = call.function.name.clone();
                    let args: serde_json::Value = serde_json::from_str(&call.function.arguments)
                        .unwrap_or(json!({}));
                    let id = call.id.clone();
                    async {
                        let result = tool_executor(name.clone(), args).await;
                        let result_str = match result {
                            Ok(v) => serde_json::to_string(&v).unwrap_or_default(),
                            Err(e) => json!({"error": e}).to_string(),
                        };
                        (name, id, result_str)
                    }
                }).collect();

                let results = join_all(futures).await;
                for (name, id, result_str) in results {
                    tool_calls_made.push(name);
                    messages.push(tool_result_msg(&id, &result_str));
                }

                turn += 1;
                continue;
            }
        }

        // No tool calls — model is done, return result
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

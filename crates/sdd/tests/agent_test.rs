use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use serde_json::json;
use sdd::*;

// ── Mock LLM Client ──────────────────────────────────────────────────────

struct MockInner {
    responses: Mutex<Vec<ChatResponse>>,
    call_count: Mutex<u32>,
    requests: Mutex<Vec<ChatRequest>>,
}

#[derive(Clone)]
struct MockClient(Arc<MockInner>);

impl MockClient {
    fn from_responses(responses: Vec<ChatResponse>) -> Self {
        Self(Arc::new(MockInner {
            responses: Mutex::new(responses),
            call_count: Mutex::new(0),
            requests: Mutex::new(Vec::new()),
        }))
    }

    fn text_response(text: &str) -> ChatResponse {
        ChatResponse {
            id: "mock".into(),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".into(),
                    content: ChatContent::Text(text.into()),
                    reasoning_content: None,
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                },
                finish_reason: Some("stop".into()),
            }],
            usage: Some(UsageInfo {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
            }),
        }
    }

    fn tool_call_response(calls: Vec<ToolCall>) -> ChatResponse {
        ChatResponse {
            id: "mock".into(),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".into(),
                    content: ChatContent::Null,
                    reasoning_content: None,
                    tool_calls: Some(calls),
                    tool_call_id: None,
                    name: None,
                },
                finish_reason: Some("tool_calls".into()),
            }],
            usage: Some(UsageInfo {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
            }),
        }
    }

    fn calls(&self) -> u32 {
        *self.0.call_count.lock().unwrap()
    }

    #[allow(dead_code)]
    fn captured_requests(&self) -> Vec<ChatRequest> {
        self.0.requests.lock().unwrap().clone()
    }
}

#[async_trait]
impl LlmClient for MockClient {
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse> {
        let mut count = self.0.call_count.lock().unwrap();
        let responses = self.0.responses.lock().unwrap();
        let idx = (*count as usize).min(responses.len() - 1);
        let response = responses[idx].clone();
        *count += 1;
        self.0.requests.lock().unwrap().push(request.clone());
        Ok(response)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_agent_loop_simple_response() {
    let client = MockClient::from_responses(vec![
        MockClient::text_response("Hello, world!"),
    ]);

    let result = agent_loop(
        &client,
        "You are helpful.",
        "Say hello",
        &DeepSeekModel::Chat,
        &[],
        |_name, _args| async { Ok::<_, String>(json!({})) },
        10,
        &EffortLevel::Medium,
    ).await.unwrap();

    assert!(result.success);
    assert_eq!(result.result.unwrap(), "Hello, world!");
    assert_eq!(result.turns, 1);
    assert_eq!(client.calls(), 1);
}

#[tokio::test]
async fn test_agent_loop_with_tool_calls() {
    let client = MockClient::from_responses(vec![
        // First response: call two tools
        MockClient::tool_call_response(vec![
            ToolCall {
                id: "call_1".into(),
                r#type: "function".into(),
                function: FunctionCall {
                    name: "Read".into(),
                    arguments: r#"{"file_path":"test.rs"}"#.into(),
                },
            },
            ToolCall {
                id: "call_2".into(),
                r#type: "function".into(),
                function: FunctionCall {
                    name: "Grep".into(),
                    arguments: r#"{"pattern":"fn main"}"#.into(),
                },
            },
        ]),
        // Second response: final answer
        MockClient::text_response("Found the file and pattern."),
    ]);

    let tool_calls_log = Arc::new(Mutex::new(Vec::<String>::new()));
    let log = tool_calls_log.clone();

    let result = agent_loop(
        &client,
        "You are helpful.",
        "Find main function",
        &DeepSeekModel::Chat,
        &[],
        move |name, _args| {
            let log = log.clone();
            async move {
                log.lock().unwrap().push(name.clone());
                Ok::<_, String>(json!({"found": true}))
            }
        },
        10,
        &EffortLevel::Medium,
    ).await.unwrap();

    assert!(result.success);
    assert_eq!(result.turns, 2);
    assert_eq!(client.calls(), 2);

    let logged = tool_calls_log.lock().unwrap();
    assert_eq!(logged.len(), 2);
    assert!(logged.contains(&"Read".to_string()));
    assert!(logged.contains(&"Grep".to_string()));

    let made = result.tool_calls_made.unwrap();
    assert_eq!(made.len(), 2);
}

#[tokio::test]
async fn test_agent_loop_max_turns_exceeded() {
    // Always returns tool calls, never finishes
    let client = MockClient::from_responses(vec![
        MockClient::tool_call_response(vec![
            ToolCall {
                id: "call_1".into(),
                r#type: "function".into(),
                function: FunctionCall {
                    name: "Read".into(),
                    arguments: r#"{}"#.into(),
                },
            },
        ]),
    ]);

    let result = agent_loop(
        &client,
        "system",
        "user",
        &DeepSeekModel::Chat,
        &[],
        |_name, _args| async { Ok::<_, String>(json!({})) },
        3,
        &EffortLevel::Low,
    ).await.unwrap();

    assert!(!result.success);
    assert!(result.error.unwrap().contains("Max turns"));
    assert_eq!(result.turns, 3);
}

#[tokio::test]
async fn test_agent_loop_tool_error_propagated() {
    let client = MockClient::from_responses(vec![
        MockClient::tool_call_response(vec![
            ToolCall {
                id: "call_1".into(),
                r#type: "function".into(),
                function: FunctionCall {
                    name: "Bash".into(),
                    arguments: r#"{"command":"fail"}"#.into(),
                },
            },
        ]),
        MockClient::text_response("Tool failed, but I handled it."),
    ]);

    let result = agent_loop(
        &client,
        "system",
        "user",
        &DeepSeekModel::Chat,
        &[],
        |_name, _args| async { Err::<serde_json::Value, _>("command failed".to_string()) },
        10,
        &EffortLevel::Medium,
    ).await.unwrap();

    // Agent should still succeed — the error was sent back as a tool result
    assert!(result.success);
    assert_eq!(result.turns, 2);
}

#[tokio::test]
async fn test_agent_loop_usage_accumulates() {
    let client = MockClient::from_responses(vec![
        MockClient::tool_call_response(vec![
            ToolCall {
                id: "c1".into(),
                r#type: "function".into(),
                function: FunctionCall { name: "Read".into(), arguments: "{}".into() },
            },
        ]),
        MockClient::text_response("done"),
    ]);

    let result = agent_loop(
        &client,
        "s", "u",
        &DeepSeekModel::Chat, &[],
        |_, _| async { Ok::<_, String>(json!({})) },
        10, &EffortLevel::Medium,
    ).await.unwrap();

    // Each response has 15 total_tokens, 2 calls = 30
    assert_eq!(result.usage.total_tokens, 30);
    assert_eq!(result.usage.prompt_tokens, 20);
    assert_eq!(result.usage.completion_tokens, 10);
}

#[tokio::test]
async fn test_build_request_with_tools() {
    let tools = vec![ToolSchema {
        r#type: "function".into(),
        function: FunctionSchema {
            name: "Read".into(),
            description: "Read file".into(),
            parameters: json!({}),
        },
    }];

    let request = build_request(
        &DeepSeekModel::Reasoner,
        vec![system_msg("sys"), user_msg("usr")],
        Some(tools),
        &EffortLevel::High,
    );

    assert_eq!(request.model, "deepseek-reasoner");
    assert!(request.tools.is_some());
    assert_eq!(request.tool_choice.unwrap(), json!("auto"));
    assert_eq!(request.temperature.unwrap(), 0.7);
    assert_eq!(request.max_tokens.unwrap(), 8192);
    assert_eq!(request.stream.unwrap(), false);
}

#[tokio::test]
async fn test_build_request_without_tools() {
    let request = build_request(
        &DeepSeekModel::Chat,
        vec![system_msg("sys")],
        None,
        &EffortLevel::Low,
    );

    assert!(request.tools.is_none());
    assert!(request.tool_choice.is_none());
    assert_eq!(request.temperature.unwrap(), 0.1);
    assert_eq!(request.max_tokens.unwrap(), 2048);
}

#[tokio::test]
async fn test_message_constructors() {
    let sys = system_msg("system prompt");
    assert_eq!(sys.role, "system");
    assert_eq!(sys.content.as_str(), "system prompt");

    let usr = user_msg("user input");
    assert_eq!(usr.role, "user");

    let asst = assistant_msg("response");
    assert_eq!(asst.role, "assistant");

    let tool = tool_result_msg("call_123", "result data");
    assert_eq!(tool.role, "tool");
    assert_eq!(tool.tool_call_id.unwrap(), "call_123");
    assert_eq!(tool.content.as_str(), "result data");
}

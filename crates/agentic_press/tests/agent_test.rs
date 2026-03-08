use std::sync::Arc;

use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use deepseek::{DeepSeekClient, ReqwestClient};
use agentic_press::agent_teams::{run_parallel, Agent};

// ── helpers ───────────────────────────────────────────────────────────────────

fn chat_response(content: &str) -> serde_json::Value {
    serde_json::json!({
        "id": "test-id",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content,
                "reasoning_content": "internal reasoning"
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    })
}

fn mock_client(server: &MockServer) -> Arc<DeepSeekClient<ReqwestClient>> {
    Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    )
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// A single agent run returns the content from the mocked API.
#[tokio::test]
async fn test_agent_run_returns_content() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("Hello from the agent")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let agent = Agent::new("test-agent", "You are a test agent.", client);
    let result = agent.run("test input").await.unwrap();
    assert_eq!(result, "Hello from the agent");
}

/// A 500 error from the API surfaces as an error from agent.run().
#[tokio::test]
async fn test_agent_run_propagates_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let agent = Agent::new("fail-agent", "You are a test agent.", client);
    let err = agent.run("test input").await.unwrap_err();
    assert!(
        err.to_string().contains("500"),
        "error should include the HTTP status code; got: {err}"
    );
}

/// run_parallel returns both results when both agents succeed.
#[tokio::test]
async fn test_run_parallel_returns_both() {
    let server = MockServer::start().await;

    // Both agents hit the same mock endpoint — we return the same response.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("parallel output")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let a = Agent::new("agent-a", "System A", client.clone());
    let b = Agent::new("agent-b", "System B", client);

    let (ra, rb) = run_parallel(&a, &b, "shared input").await.unwrap();
    assert_eq!(ra, "parallel output");
    assert_eq!(rb, "parallel output");
}

/// run_parallel fails if one agent gets a 500.
#[tokio::test]
async fn test_run_parallel_fails_if_one_fails() {
    let server = MockServer::start().await;

    // All requests return 500 — both agents fail, try_join surfaces an error.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let a = Agent::new("ok-agent", "System A", client.clone());
    let b = Agent::new("fail-agent", "System B", client);

    let err = run_parallel(&a, &b, "shared input").await.unwrap_err();
    assert!(
        err.to_string().contains("500"),
        "error should propagate from the failing agent; got: {err}"
    );
}

/// Agent stores its name correctly.
#[test]
fn test_agent_name_stored() {
    let server_uri = "http://localhost:1234";
    let client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "key").with_base_url(server_uri),
    );
    let agent = Agent::new("my-agent", "sys prompt", client);
    assert_eq!(agent.name, "my-agent");
}

/// Agent handles empty content from the API.
#[tokio::test]
async fn test_agent_run_empty_content() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let agent = Agent::new("empty-agent", "System", client);
    let result = agent.run("input").await.unwrap();
    assert_eq!(result, "");
}

/// Agent handles large input without issues.
#[tokio::test]
async fn test_agent_run_large_input() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("response to large input")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let agent = Agent::new("large-input-agent", "System", client);
    let large_input = "x".repeat(10_000);
    let result = agent.run(&large_input).await.unwrap();
    assert_eq!(result, "response to large input");
}

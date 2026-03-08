use std::sync::Arc;

use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use deepseek::{DeepSeekClient, ReqwestClient};
use agentic_press::agent_teams::{
    run_all, run_all_same_input, run_parallel, Agent, AgentTeam, ModelClient, ModelPool, TeamRole,
};

// ── helpers ───────────────────────────────────────────────────────────────────

fn chat_response(content: &str) -> serde_json::Value {
    serde_json::json!({
        "id": "test-id",
        "model": "test-model",
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

fn mock_qw_client(server: &MockServer) -> ModelClient {
    ModelClient::qwen(Arc::new(
        qwen::Client::new("test-key").with_base_url(server.uri()),
    ))
}

fn mock_client(server: &MockServer) -> ModelClient {
    let client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    ModelClient::deepseek(client)
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
    let client = ModelClient::deepseek(Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "key").with_base_url("http://localhost:1234"),
    ));
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

// ── qwen agent tests ─────────────────────────────────────────────────────────

/// Qwen agent returns content from the mocked API.
#[tokio::test]
async fn test_qwen_agent_run_returns_content() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("Hello from qwen")),
        )
        .mount(&server)
        .await;

    let client = mock_qw_client(&server);
    let agent = Agent::new("qwen-agent", "You are a test agent.", client);
    let result = agent.run("test input").await.unwrap();
    assert_eq!(result, "Hello from qwen");
}

/// Qwen agent propagates API errors.
#[tokio::test]
async fn test_qwen_agent_propagates_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let client = mock_qw_client(&server);
    let agent = Agent::new("qwen-fail", "System", client);
    let err = agent.run("input").await.unwrap_err();
    assert!(
        err.to_string().contains("Qwen API error"),
        "error should mention Qwen; got: {err}"
    );
}

/// Mixed-model parallel: DeepSeek agent + Qwen agent run concurrently.
#[tokio::test]
async fn test_mixed_model_parallel() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("mixed output")),
        )
        .mount(&server)
        .await;

    let ds = mock_client(&server);
    let qw = mock_qw_client(&server);

    let a = Agent::new("ds-agent", "System A", ds);
    let b = Agent::new("qw-agent", "System B", qw);

    let (ra, rb) = run_parallel(&a, &b, "shared input").await.unwrap();
    assert_eq!(ra, "mixed output");
    assert_eq!(rb, "mixed output");
}

// ── AgentTeam tests ─────────────────────────────────────────────────────────

/// AgentTeam.spawn creates members with correct roles.
#[tokio::test]
async fn test_agent_team_spawn_and_roles() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("team output")),
        )
        .mount(&server)
        .await;

    let pool = ModelPool::new(mock_client(&server), mock_qw_client(&server));
    let mut team = AgentTeam::new("test-team");

    let w = team.spawn("writer", "Write things", TeamRole::Reasoner, &pool);
    let l = team.spawn("linkedin", "Post things", TeamRole::Fast, &pool);
    let e = team.spawn("editor", "Review things", TeamRole::Reviewer, &pool);

    assert_eq!(team.members.len(), 3);
    assert_eq!(team.members[w].role, TeamRole::Reasoner);
    assert_eq!(team.members[l].role, TeamRole::Fast);
    assert_eq!(team.members[e].role, TeamRole::Reviewer);
    assert_eq!(team.agent(w).name, "writer");
    assert_eq!(team.agent(l).name, "linkedin");
    assert_eq!(team.agent(e).name, "editor");
}

/// run_all with N agents returns results in input order.
#[tokio::test]
async fn test_run_all_returns_ordered_results() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("all-output")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let a = Agent::new("agent-1", "S1", client.clone());
    let b = Agent::new("agent-2", "S2", client.clone());
    let c = Agent::new("agent-3", "S3", client);

    let results = run_all(vec![
        (&a, "input-1".into()),
        (&b, "input-2".into()),
        (&c, "input-3".into()),
    ])
    .await
    .unwrap();

    assert_eq!(results.len(), 3);
    assert_eq!(results[0], "all-output");
    assert_eq!(results[1], "all-output");
    assert_eq!(results[2], "all-output");
}

/// run_all with empty vec returns empty vec.
#[tokio::test]
async fn test_run_all_empty() {
    let results = run_all(vec![]).await.unwrap();
    assert!(results.is_empty());
}

/// run_all_same_input runs all agents with identical input.
#[tokio::test]
async fn test_run_all_same_input() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("same-input-output")),
        )
        .mount(&server)
        .await;

    let client = mock_client(&server);
    let a = Agent::new("a", "S1", client.clone());
    let b = Agent::new("b", "S2", client);

    let results = run_all_same_input(&[&a, &b], "shared").await.unwrap();
    assert_eq!(results.len(), 2);
    assert_eq!(results[0], "same-input-output");
}

/// ModelPool routes Reasoner/Reviewer to DeepSeek, Fast to Qwen.
#[test]
fn test_model_pool_routing() {
    let ds = ModelClient::deepseek(Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "k").with_base_url("http://ds"),
    ));
    let qw = ModelClient::qwen(Arc::new(
        qwen::Client::new("k").with_base_url("http://qw"),
    ));
    let pool = ModelPool::new(ds, qw);

    assert!(matches!(pool.for_role(TeamRole::Reasoner), ModelClient::DeepSeek(_)));
    assert!(matches!(pool.for_role(TeamRole::Reviewer), ModelClient::DeepSeek(_)));
    assert!(matches!(pool.for_role(TeamRole::Fast), ModelClient::Qwen { .. }));
}

/// ModelPool label shows both models when Qwen is available.
#[test]
fn test_model_pool_label_dual() {
    let ds = ModelClient::deepseek(Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "k").with_base_url("http://ds"),
    ));
    let qw = ModelClient::qwen(Arc::new(
        qwen::Client::new("k").with_base_url("http://qw"),
    ));
    let pool = ModelPool::new(ds, qw);
    assert!(pool.label().contains("deepseek-reasoner + qwen-plus"));
}

/// ModelPool label shows only DeepSeek when both are DeepSeek.
#[test]
fn test_model_pool_label_single() {
    let ds = ModelClient::deepseek(Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "k").with_base_url("http://ds"),
    ));
    let pool = ModelPool::new(ds.clone(), ds);
    assert_eq!(pool.label(), "deepseek-reasoner");
}

/// ModelPool.deepseek_client() returns the arc.
#[test]
fn test_model_pool_deepseek_client_extraction() {
    let ds = ModelClient::deepseek(Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "k").with_base_url("http://ds"),
    ));
    let pool = ModelPool::new(ds.clone(), ds);
    assert!(pool.deepseek_client().is_some());
}

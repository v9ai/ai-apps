//! Integration tests against the live MuleRouter API.
//!
//! Uses the chat completions endpoint with `qwen-flash` (smallest/cheapest model)
//! so tests cost almost nothing and complete instantly.
//!
//! All tests skip automatically when `MULEROUTER_API_KEY` is not set.
//!
//! Run:
//!   cargo test --test integration -- --nocapture

use mulerouter::{ChatMessage, ChatRequest, Client};
use serial_test::serial;
use std::time::Duration;

// ─── Helper ───────────────────────────────────────────────────────────────────

fn try_client() -> Option<Client> {
    let _ = dotenvy::from_filename(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"),
    );
    let key = std::env::var("MULEROUTER_API_KEY").ok()?;
    Some(Client::new(key).with_poll_interval(Duration::from_secs(2)))
}

fn flash_req(user_msg: &str) -> ChatRequest {
    ChatRequest {
        model: "qwen-flash".into(),
        messages: vec![ChatMessage::user(user_msg)],
        max_completion_tokens: Some(64), // keep responses tiny
        temperature: Some(0.0),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// Basic round-trip: send a message, get a non-empty reply.
#[tokio::test]
#[serial]
async fn test_chat_returns_non_empty_response() {
    let Some(client) = try_client() else { return };

    let resp = client
        .chat_complete(flash_req("Reply with exactly the word: pong"))
        .await
        .expect("chat should succeed");

    assert!(!resp.id.is_empty(), "response id must not be empty");
    assert!(!resp.choices.is_empty(), "choices must not be empty");
    let text = resp.text().expect("first choice must have text");
    assert!(!text.is_empty(), "reply text must not be empty");
    println!("reply: {text}");
}

/// System prompt is respected.
#[tokio::test]
#[serial]
async fn test_chat_system_prompt_is_respected() {
    let Some(client) = try_client() else { return };

    let req = ChatRequest::new(
        "qwen-flash",
        vec![
            ChatMessage::system("You are a calculator. Reply only with the numeric result."),
            ChatMessage::user("2 + 2"),
        ],
    );
    let resp = client
        .chat_complete(ChatRequest { max_completion_tokens: Some(16), ..req })
        .await
        .expect("chat should succeed");

    let text = resp.text().unwrap_or("").to_lowercase();
    assert!(text.contains('4'), "expected '4' in reply, got: {text}");
}

/// The model field in the response matches what we requested (or is non-empty).
#[tokio::test]
#[serial]
async fn test_chat_response_model_field_is_set() {
    let Some(client) = try_client() else { return };

    let resp = client
        .chat_complete(flash_req("hi"))
        .await
        .expect("chat should succeed");

    assert!(!resp.model.is_empty(), "model field must be set");
}

/// A bad API key returns a typed auth error.
#[tokio::test]
#[serial]
async fn test_invalid_api_key_returns_auth_error() {
    let client = Client::new("invalid-key-000");

    let err = client
        .chat_complete(flash_req("hi"))
        .await
        .expect_err("bad key should fail");

    match err {
        mulerouter::Error::Api { .. } | mulerouter::Error::Http { .. } => {}
        other => panic!("unexpected error variant: {other:?}"),
    }
}

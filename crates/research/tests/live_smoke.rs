//! Live smoke tests — hit real DeepSeek + Qwen APIs.
//!
//! Requires DEEPSEEK_API_KEY and DASHSCOPE_API_KEY in .env or environment.
//! Run with: cargo test --test live_smoke -- --ignored
//!
//! These are #[ignore]d by default so `cargo test` won't burn API credits.

use serial_test::serial;

fn load_env() {
    let _ = dotenvy::dotenv();
}

// ── DeepSeek reason() ────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn deepseek_reason_live() {
    load_env();
    let client = deepseek::client_from_env().expect("DEEPSEEK_API_KEY must be set");

    let output = deepseek::reason(
        &client,
        "You are a concise assistant. Reply in one sentence.",
        "What is 2+2?",
    )
    .await
    .expect("DeepSeek reason() call failed");

    eprintln!("[deepseek] reasoning: {}…", &output.reasoning.chars().take(120).collect::<String>());
    eprintln!("[deepseek] content: {}", output.content);

    assert!(!output.content.is_empty(), "content should not be empty");
    assert!(
        output.content.contains('4') || output.content.to_lowercase().contains("four"),
        "expected '4' or 'four' in: {}",
        output.content
    );
}

// ── Qwen chat ────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn qwen_chat_live() {
    load_env();
    let api_key = std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");
    let client = qwen::Client::new(&api_key);

    let req = qwen::ChatRequest::new(
        "qwen-max",
        vec![
            qwen::ChatMessage::system("You are a concise assistant. Reply in one sentence."),
            qwen::ChatMessage::user("What is the capital of France?"),
        ],
    );

    let resp = client.chat(req).await.expect("Qwen chat() call failed");
    let text = resp.text().unwrap_or("");

    eprintln!("[qwen] response: {text}");

    assert!(!text.is_empty(), "response should not be empty");
    assert!(
        text.to_lowercase().contains("paris"),
        "expected 'paris' in: {text}"
    );
}

// ── Qwen embeddings ─────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn qwen_embedding_live() {
    load_env();
    let api_key = std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");
    let client = qwen::Client::new(&api_key);

    let vec = client
        .embed_one("machine learning")
        .await
        .expect("Qwen embed_one() call failed");

    eprintln!("[qwen] embedding dim: {}, first 5: {:?}", vec.len(), &vec[..5.min(vec.len())]);

    assert!(!vec.is_empty(), "embedding should not be empty");
    assert!(vec.len() >= 512, "expected at least 512 dims, got {}", vec.len());
}

// ── DeepSeek agent with tool use ─────────────────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn deepseek_agent_with_tool_live() {
    load_env();
    let api_key = std::env::var("DEEPSEEK_API_KEY").expect("DEEPSEEK_API_KEY must be set");

    let agent = research::agent::agent_builder(&api_key, "deepseek-chat")
        .preamble("You are a concise research assistant. Answer in 1-2 sentences.")
        .build();

    let result = agent
        .prompt("What year was the transformer architecture paper published?".into())
        .await
        .expect("DeepSeek agent prompt failed");

    eprintln!("[deepseek agent] response: {result}");

    assert!(!result.is_empty());
    assert!(
        result.contains("2017"),
        "expected '2017' in: {result}"
    );
}

// ── Qwen agent via provider_agent_builder ────────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn qwen_agent_live() {
    load_env();
    let api_key = std::env::var("DASHSCOPE_API_KEY").expect("DASHSCOPE_API_KEY must be set");

    let provider = research::agent::LlmProvider::Qwen {
        api_key,
        model: "qwen-max".into(),
    };

    let agent = research::agent::provider_agent_builder(&provider)
        .preamble("You are a concise assistant. Reply in one sentence.")
        .build();

    let result = agent
        .prompt("What is the boiling point of water in Celsius?".into())
        .await
        .expect("Qwen agent prompt failed");

    eprintln!("[qwen agent] response: {result}");

    assert!(!result.is_empty());
    assert!(
        result.contains("100"),
        "expected '100' in: {result}"
    );
}

// ── Both providers via MultiModelResearcher ──────────────────────────────

#[tokio::test]
#[ignore]
#[serial]
async fn multi_model_researcher_live() {
    load_env();
    let researcher = research::dual::MultiModelResearcher::from_env()
        .expect("at least one provider must be configured");

    let names = researcher.provider_names();
    eprintln!("[multi] providers: {names:?}");
    assert!(!names.is_empty());

    let resp = researcher
        .query(
            "You are a concise assistant. Reply in one sentence.",
            "What element has atomic number 6?",
        )
        .await
        .expect("multi-model query failed");

    for r in &resp.responses {
        eprintln!("[{}] {}", r.model, r.content);
    }

    assert!(!resp.responses.is_empty());
    // At least one model should mention carbon
    let any_correct = resp.responses.iter().any(|r| {
        r.content.to_lowercase().contains("carbon")
    });
    assert!(any_correct, "expected at least one model to mention 'carbon'");
}

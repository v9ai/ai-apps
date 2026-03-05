use std::sync::Arc;
use std::time::{Duration, Instant};

use tempfile::TempDir;
use wiremock::matchers::{body_string_contains, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use deepseek::{DeepSeekClient, ReqwestClient};
use agentic_press::pipeline::Pipeline;

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

const SINGLE_TOPIC_JSON: &str =
    r#"[{"topic":"Claude Code Testing","angle":"Most devs skip integration tests","why_viral":"Counterintuitive advice backed by data"}]"#;

const TWO_TOPICS_JSON: &str = r#"[
  {"topic":"Rust Async Runtime","angle":"Tokio is not magic","why_viral":"Demystifies the scheduler"},
  {"topic":"Multi Agent Systems","angle":"Agents need isolation","why_viral":"Practical, non-hype advice"}
]"#;

/// Mount the standard five mocks (scout, picker, researcher, writer, linkedin).
/// Each is identified by a unique phrase in its system prompt; see prompts.rs.
async fn mount_standard_mocks(server: &MockServer, picker_json: &str) {
    for (phrase, body) in [
        ("Scout agent",      chat_response("1. Topic A\n2. Topic B\n3. Topic C\n4. Topic D\n5. Topic E")),
        ("Picker agent",     chat_response(picker_json)),
        ("Researcher agent", chat_response("## Research\nKey findings here.")),
        ("Writer agent",     chat_response("# Blog Post\nIntro paragraph.\n\n## Section\nBody.")),
        ("LinkedIn Drafter", chat_response("Most engineers don't know this.\n\nTakeaway 1\nTakeaway 2\n\n#RustLang #AgenticAI")),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(body))
            .mount(server)
            .await;
    }
}

fn pipeline(server: &MockServer, tmp: &TempDir) -> Pipeline {
    let client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    Pipeline::new("test niche", tmp.path().to_str().unwrap()).with_client(client)
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// Happy path: single topic creates scout + picker files and a slug directory
/// with research.md, blog.md, linkedin.md.
#[tokio::test]
async fn test_single_topic_creates_expected_files() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    pipeline(&server, &tmp).run().await.unwrap();

    let out = tmp.path();
    assert!(out.join("01_scout_topics.md").exists(),      "scout file missing");
    assert!(out.join("02_picker_selection.json").exists(), "picker file missing");

    let slug_dir = out.join("claude-code-testing");
    assert!(slug_dir.join("research.md").exists(), "research.md missing");
    assert!(slug_dir.join("blog.md").exists(),     "blog.md missing");
    assert!(slug_dir.join("linkedin.md").exists(), "linkedin.md missing");
}

/// Output files contain the mock content (pipeline passes data forward correctly).
#[tokio::test]
async fn test_output_files_contain_agent_content() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    pipeline(&server, &tmp).run().await.unwrap();

    let blog = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("blog.md"),
    )
    .unwrap();
    assert!(blog.contains("Blog Post"), "blog.md should contain writer output");

    let li = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("linkedin.md"),
    )
    .unwrap();
    assert!(li.contains("RustLang"), "linkedin.md should contain linkedin output");
}

/// With count=2, both topic directories must exist after the run.
#[tokio::test]
async fn test_multi_topic_creates_all_directories() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, TWO_TOPICS_JSON).await;

    let tmp = TempDir::new().unwrap();
    pipeline(&server, &tmp)
        .with_count(2)
        .run()
        .await
        .unwrap();

    let out = tmp.path();
    assert!(out.join("rust-async-runtime").join("blog.md").exists(), "topic 1 blog missing");
    assert!(out.join("multi-agent-systems").join("blog.md").exists(), "topic 2 blog missing");
}

/// Writer and LinkedIn run *concurrently* — each mock has a 200 ms delay but
/// together they should finish in ≈200 ms, not ≈400 ms.
#[tokio::test]
async fn test_writer_and_linkedin_run_in_parallel() {
    let server = MockServer::start().await;

    // Scout, Picker, Researcher respond immediately.
    for (phrase, content) in [
        ("Scout agent",      "1. Topic A"),
        ("Picker agent",     SINGLE_TOPIC_JSON),
        ("Researcher agent", "research notes"),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(content)))
            .mount(&server)
            .await;
    }

    // Writer and LinkedIn each take 200 ms — parallel = ~200 ms total.
    for phrase in ["Writer agent", "LinkedIn Drafter"] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_delay(Duration::from_millis(200))
                    .set_body_json(chat_response("output")),
            )
            .mount(&server)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    let start = Instant::now();
    pipeline(&server, &tmp).run().await.unwrap();
    let elapsed = start.elapsed();

    // Sequential would take ≥400 ms; parallel should be well under 350 ms.
    assert!(
        elapsed < Duration::from_millis(350),
        "Writer + LinkedIn should run in parallel, but took {elapsed:?}"
    );
}

/// With count=2, the two Researcher calls run concurrently.  Each takes 200 ms;
/// together they should finish in ≈200 ms, not ≈400 ms.
#[tokio::test]
async fn test_multi_topic_researcher_phases_run_in_parallel() {
    let server = MockServer::start().await;

    // Scout + Picker respond immediately.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("topics")))
        .mount(&server)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(TWO_TOPICS_JSON)))
        .mount(&server)
        .await;

    // Each Researcher takes 200 ms — 2 in parallel ≈ 200 ms total.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_millis(200))
                .set_body_json(chat_response("research")),
        )
        .mount(&server)
        .await;

    // Writer + LinkedIn respond immediately (not under test here).
    for phrase in ["Writer agent", "LinkedIn Drafter"] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("output")))
            .mount(&server)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    let start = Instant::now();
    pipeline(&server, &tmp)
        .with_count(2)
        .run()
        .await
        .unwrap();
    let elapsed = start.elapsed();

    // Sequential would take ≥400 ms; parallel ≈200 ms.
    assert!(
        elapsed < Duration::from_millis(350),
        "Researcher agents should run in parallel across topics, but took {elapsed:?}"
    );
}

/// A non-2xx API response must surface as an error (not silently swallowed).
#[tokio::test]
async fn test_api_error_propagates() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let tmp = TempDir::new().unwrap();
    let err = pipeline(&server, &tmp).run().await.unwrap_err();

    assert!(
        err.to_string().contains("500"),
        "error should include the HTTP status code; got: {err}"
    );
}

/// If the Picker returns something that is not a JSON array, the pipeline must
/// fail with a clear error rather than panicking or silently producing nothing.
#[tokio::test]
async fn test_invalid_picker_json_returns_descriptive_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("topics")))
        .mount(&server)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(chat_response("```json\nnot an array\n```")),
        )
        .mount(&server)
        .await;

    let tmp = TempDir::new().unwrap();
    let err = pipeline(&server, &tmp).run().await.unwrap_err();

    assert!(
        err.to_string().contains("JSON array"),
        "error should mention the parse failure; got: {err}"
    );
}

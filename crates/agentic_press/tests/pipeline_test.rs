use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tempfile::TempDir;
use wiremock::matchers::{body_string_contains, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use async_trait::async_trait;
use deepseek::{DeepSeekClient, ReqwestClient};
use agentic_press::pipeline::Pipeline;
use agentic_press::publisher::Publisher;

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

// ── MockPublisher ────────────────────────────────────────────────────────────

#[derive(Clone)]
struct MockPublisher {
    calls: Arc<Mutex<Vec<(String, String)>>>,
}

impl MockPublisher {
    fn new() -> Self {
        Self {
            calls: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

#[async_trait]
impl Publisher for MockPublisher {
    async fn publish_post(&self, blog_md: &str, topic: &str, _deploy: bool) -> anyhow::Result<PathBuf> {
        self.calls.lock().unwrap().push((blog_md.to_string(), topic.to_string()));
        Ok(PathBuf::from("/mock/published"))
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// Happy path: single topic creates scout + picker files and a slug directory
/// with research.md, blog.md, linkedin.md.
#[tokio::test]
async fn test_single_topic_creates_expected_files() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    let out = tmp.path();
    assert!(out.join("01_scout_topics.md").exists(),      "scout file missing");
    assert!(out.join("02_picker_selection.json").exists(), "picker file missing");

    let slug_dir = out.join("claude-code-testing");
    assert!(slug_dir.join("research.md").exists(), "research.md missing");
    assert!(slug_dir.join("blog.md").exists(),     "blog.md missing");
    assert!(slug_dir.join("linkedin.md").exists(), "linkedin.md missing");

    // Verify structured result
    assert_eq!(result.topics.len(), 1);
    assert_eq!(result.topics[0].topic, "Claude Code Testing");
    assert_eq!(result.topics[0].slug, "claude-code-testing");
    assert!(!result.scout_output.is_empty());
    assert!(!result.picker_output.is_empty());
}

/// Output files contain the mock content (pipeline passes data forward correctly).
#[tokio::test]
async fn test_output_files_contain_agent_content() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    let blog = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("blog.md"),
    )
    .unwrap();
    assert!(blog.contains("Blog Post"), "blog.md should contain writer output");
    assert!(result.topics[0].blog.contains("Blog Post"));

    let li = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("linkedin.md"),
    )
    .unwrap();
    assert!(li.contains("RustLang"), "linkedin.md should contain linkedin output");
    assert!(result.topics[0].linkedin.contains("RustLang"));
}

/// With count=2, both topic directories must exist after the run.
#[tokio::test]
async fn test_multi_topic_creates_all_directories() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, TWO_TOPICS_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp)
        .with_count(2)
        .run()
        .await
        .unwrap();

    let out = tmp.path();
    assert!(out.join("rust-async-runtime").join("blog.md").exists(), "topic 1 blog missing");
    assert!(out.join("multi-agent-systems").join("blog.md").exists(), "topic 2 blog missing");
    assert_eq!(result.topics.len(), 2);
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

/// Picker wraps its JSON in markdown fences — pipeline should strip them and proceed.
#[tokio::test]
async fn test_picker_fenced_json_is_handled() {
    let fenced = format!("```json\n{SINGLE_TOPIC_JSON}\n```");
    let server = MockServer::start().await;

    // Scout responds normally
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("1. Topic A")))
        .mount(&server)
        .await;

    // Picker returns fenced JSON
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(&fenced)))
        .mount(&server)
        .await;

    // Researcher, Writer, LinkedIn respond normally
    for (phrase, content) in [
        ("Researcher agent", "## Research\nNotes."),
        ("Writer agent", "# Blog\nContent."),
        ("LinkedIn Drafter", "Post content.\n#Hashtag"),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(content)))
            .mount(&server)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    pipeline(&server, &tmp).run().await.expect("pipeline should handle fenced JSON");

    assert!(
        tmp.path().join("claude-code-testing").join("blog.md").exists(),
        "blog.md should exist after stripping fences"
    );
}

/// First API call returns 500, subsequent calls return 200 — pipeline should succeed via retry.
#[tokio::test]
async fn test_retry_on_transient_500() {
    let server = MockServer::start().await;

    // Scout: first call returns 500, second returns 200
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .up_to_n_times(1)
        .mount(&server)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("1. Topic A")))
        .mount(&server)
        .await;

    // All other agents respond normally
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(SINGLE_TOPIC_JSON)))
        .mount(&server)
        .await;

    for (phrase, content) in [
        ("Researcher agent", "## Research\nNotes."),
        ("Writer agent", "# Blog\nContent."),
        ("LinkedIn Drafter", "Post.\n#Tag"),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(chat_response(content)))
            .mount(&server)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    pipeline(&server, &tmp)
        .run()
        .await
        .expect("pipeline should succeed after retrying the transient 500");
}

/// MockPublisher is called with the correct blog content and topic.
#[tokio::test]
async fn test_publisher_receives_correct_content() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let mock_pub = MockPublisher::new();
    let calls = Arc::clone(&mock_pub.calls);

    pipeline(&server, &tmp)
        .with_publish(true)
        .with_publisher(mock_pub)
        .run()
        .await
        .unwrap();

    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 1, "publisher should have been called once");
    assert!(calls[0].0.contains("Blog Post"), "blog content should be passed to publisher");
    assert_eq!(calls[0].1, "Claude Code Testing", "topic should be passed to publisher");
}

/// When publish=false, the publisher is never called.
#[tokio::test]
async fn test_no_publish_skips_publisher() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let mock_pub = MockPublisher::new();
    let calls = Arc::clone(&mock_pub.calls);

    pipeline(&server, &tmp)
        .with_publish(false)
        .with_publisher(mock_pub)
        .run()
        .await
        .unwrap();

    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 0, "publisher should NOT be called when publish=false");
}

/// PipelineResult contains scout and picker raw output.
#[tokio::test]
async fn test_pipeline_result_contains_phase_outputs() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    assert!(result.scout_output.contains("Topic A"), "scout_output should have scout content");
    assert!(result.picker_output.contains("Claude Code Testing"), "picker_output should have picker content");
}

/// Multi-topic run populates all TopicResult fields.
#[tokio::test]
async fn test_multi_topic_result_fields() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, TWO_TOPICS_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp)
        .with_count(2)
        .run()
        .await
        .unwrap();

    assert_eq!(result.topics.len(), 2);

    let slugs: Vec<&str> = result.topics.iter().map(|t| t.slug.as_str()).collect();
    assert!(slugs.contains(&"rust-async-runtime"));
    assert!(slugs.contains(&"multi-agent-systems"));

    for t in &result.topics {
        assert!(!t.blog.is_empty(), "blog should not be empty for {}", t.topic);
        assert!(!t.linkedin.is_empty(), "linkedin should not be empty for {}", t.topic);
        assert_eq!(t.paper_count, 0, "paper_count should be 0 without research mode");
    }
}

/// Publisher called once per topic with count=2.
#[tokio::test]
async fn test_publisher_called_per_topic() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, TWO_TOPICS_JSON).await;

    let tmp = TempDir::new().unwrap();
    let mock_pub = MockPublisher::new();
    let calls = Arc::clone(&mock_pub.calls);

    pipeline(&server, &tmp)
        .with_count(2)
        .with_publish(true)
        .with_publisher(mock_pub)
        .run()
        .await
        .unwrap();

    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 2, "publisher should be called once per topic");
}

/// Empty picker selection (0 topics) should return empty topics vec.
#[tokio::test]
async fn test_empty_picker_selection() {
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
        .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("[]")))
        .mount(&server)
        .await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    assert!(result.topics.is_empty(), "empty picker selection should produce no topics");
}

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tempfile::TempDir;
use wiremock::matchers::{body_string_contains, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use async_trait::async_trait;
use deepseek::{DeepSeekClient, ReqwestClient};
use agentic_press::pipeline::Pipeline;
use agentic_press::PipelineMode;
use agentic_press::publisher::Publisher;

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
    let ds_client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    let qw_client = Arc::new(
        qwen::Client::new("test-key").with_base_url(server.uri()),
    );
    Pipeline::new("test niche", tmp.path().to_str().unwrap())
        .with_deepseek_client(ds_client)
        .with_qwen_client(qw_client)
        .with_mode(PipelineMode::Blog)
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
    async fn publish_post(&self, blog_md: &str, topic: &str, _deploy: bool, _audio_url: Option<&str>) -> anyhow::Result<PathBuf> {
        self.calls.lock().unwrap().push((blog_md.to_string(), topic.to_string()));
        Ok(PathBuf::from("/mock/published"))
    }
}

// ── blog mode tests ──────────────────────────────────────────────────────────

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
    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 1);
    assert_eq!(blog.topics[0].topic, "Claude Code Testing");
    assert_eq!(blog.topics[0].slug, "claude-code-testing");
    assert!(!blog.scout_output.is_empty());
    assert!(!blog.picker_output.is_empty());
}

/// Output files contain the mock content (pipeline passes data forward correctly).
#[tokio::test]
async fn test_output_files_contain_agent_content() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    let blog_content = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("blog.md"),
    )
    .unwrap();
    assert!(blog_content.contains("Blog Post"), "blog.md should contain writer output");

    let li = std::fs::read_to_string(
        tmp.path().join("claude-code-testing").join("linkedin.md"),
    )
    .unwrap();
    assert!(li.contains("RustLang"), "linkedin.md should contain linkedin output");

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert!(blog.topics[0].blog.contains("Blog Post"));
    assert!(blog.topics[0].linkedin.contains("RustLang"));
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

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 2);
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

/// PipelineResult::Blog contains scout and picker raw output.
#[tokio::test]
async fn test_pipeline_result_contains_phase_outputs() {
    let server = MockServer::start().await;
    mount_standard_mocks(&server, SINGLE_TOPIC_JSON).await;

    let tmp = TempDir::new().unwrap();
    let result = pipeline(&server, &tmp).run().await.unwrap();

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert!(blog.scout_output.contains("Topic A"), "scout_output should have scout content");
    assert!(blog.picker_output.contains("Claude Code Testing"), "picker_output should have picker content");
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

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 2);

    let slugs: Vec<&str> = blog.topics.iter().map(|t| t.slug.as_str()).collect();
    assert!(slugs.contains(&"rust-async-runtime"));
    assert!(slugs.contains(&"multi-agent-systems"));

    for t in &blog.topics {
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

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert!(blog.topics.is_empty(), "empty picker selection should produce no topics");
}

// ── journalism mode helpers ─────────────────────────────────────────────────

fn journalism_pipeline(server: &MockServer, tmp: &TempDir, topic: &str) -> Pipeline {
    let ds_client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    let qw_client = Arc::new(
        qwen::Client::new("test-key").with_base_url(server.uri()),
    );
    Pipeline::new(topic, tmp.path().to_str().unwrap())
        .with_deepseek_client(ds_client)
        .with_qwen_client(qw_client)
        .with_mode(PipelineMode::Journalism)
}

/// Mount journalism agent mocks (researcher, seo, writer, editor).
async fn mount_journalism_mocks(server: &MockServer, editor_verdict: &str) {
    for (phrase, body) in [
        ("Researcher for a journalism team", chat_response("# Research Brief\n\n## Summary\nKey findings.")),
        ("SEO Strategist for a journalism team", chat_response("# SEO Strategy\n\n## Target Keywords\nremote jobs europe.")),
        ("Writer for a journalism team", chat_response("---\ntitle: \"Test Article\"\nstatus: draft\n---\n\n# Test Article\n\nDraft body.")),
        ("Editor for a journalism team", chat_response(editor_verdict)),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(body))
            .mount(server)
            .await;
    }
}

// ── journalism mode tests ───────────────────────────────────────────────────

/// Journalism happy path: creates research, draft, and published files.
#[tokio::test]
async fn test_journalism_happy_path_approved() {
    let server = MockServer::start().await;
    mount_journalism_mocks(
        &server,
        "APPROVE\n\n---\ntitle: \"Final Article\"\nstatus: published\n---\n\n# Final Article\n\nEdited body.",
    )
    .await;

    let tmp = TempDir::new().unwrap();
    let result = journalism_pipeline(&server, &tmp, "Remote work in Germany")
        .with_topic("Remote work in Germany")
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(j.article.approved, "editor should approve");
    assert_eq!(j.article.revision_rounds, 0, "no revision rounds needed");
    assert_eq!(j.article.topic, "Remote work in Germany");
    assert_eq!(j.article.slug, "remote-work-in-germany");
    assert!(!j.article.research.is_empty());
    assert!(!j.article.seo.is_empty());
    assert!(!j.article.draft.is_empty());

    let out = tmp.path();
    assert!(out.join("research/remote-work-in-germany-research.md").exists());
    assert!(out.join("research/remote-work-in-germany-seo.md").exists());
    assert!(out.join("drafts/remote-work-in-germany.md").exists());
    assert!(out.join("published/remote-work-in-germany.md").exists());
}

/// Editor says REVISE → Writer retries → Editor APPROVEs on second round.
#[tokio::test]
async fn test_journalism_revision_loop_approve_on_retry() {
    let server = MockServer::start().await;

    // Researcher and SEO respond normally.
    for (phrase, body) in [
        ("Researcher for a journalism team", chat_response("# Research Brief\n\n## Summary\nKey findings.")),
        ("SEO Strategist for a journalism team", chat_response("# SEO Strategy\n\n## Target Keywords\nkeywords.")),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(body))
            .mount(&server)
            .await;
    }

    // Writer always returns a draft.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("---\ntitle: \"Test\"\nstatus: draft\n---\n\n# Test\n\nRevised draft body."),
        ))
        .mount(&server)
        .await;

    // Editor: first call returns REVISE, second returns APPROVE.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("**DECISION: REVISE**\n## Critical Issues (must fix)\n- [ ] Fix the lede"),
        ))
        .up_to_n_times(1)
        .mount(&server)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("**DECISION: APPROVE**\n\n---\ntitle: \"Final\"\nstatus: published\n---\n\n# Final\n\nApproved."),
        ))
        .mount(&server)
        .await;

    let tmp = TempDir::new().unwrap();
    let result = journalism_pipeline(&server, &tmp, "Revision test")
        .with_topic("Revision test")
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(j.article.approved, "editor should approve after revision");
    assert_eq!(j.article.revision_rounds, 1, "should have done 1 revision round");

    let out = tmp.path();
    assert!(out.join("published/revision-test.md").exists(), "published file should exist");
    assert!(out.join("drafts/revision-test-revisions.md").exists(), "revision notes should be saved");
}

/// Editor says REVISE twice → pipeline exits with approved=false after max 1 revision.
#[tokio::test]
async fn test_journalism_max_revision_cap() {
    let server = MockServer::start().await;
    mount_journalism_mocks(
        &server,
        "**DECISION: REVISE**\n## Critical Issues (must fix)\n- [ ] Unfixable problem",
    )
    .await;

    let tmp = TempDir::new().unwrap();
    let result = journalism_pipeline(&server, &tmp, "EU visa rules")
        .with_topic("EU visa rules")
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(!j.article.approved, "should not approve after max revisions");
    assert_eq!(j.article.revision_rounds, 1, "should cap at 1 revision round");

    let out = tmp.path();
    assert!(out.join("drafts/eu-visa-rules-revisions.md").exists());
    assert!(!out.join("published/eu-visa-rules.md").exists());
}

/// Researcher and SEO run in parallel — each takes 200 ms, together ≈200 ms.
#[tokio::test]
async fn test_journalism_researcher_seo_parallel() {
    let server = MockServer::start().await;

    // Researcher and SEO each take 200 ms.
    for phrase in [
        "Researcher for a journalism team",
        "SEO Strategist for a journalism team",
    ] {
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

    // Writer and Editor respond immediately.
    for phrase in [
        "Writer for a journalism team",
        "Editor for a journalism team",
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(chat_response("APPROVE\noutput")))
            .mount(&server)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    let start = Instant::now();
    journalism_pipeline(&server, &tmp, "test topic")
        .with_topic("Parallel test")
        .run()
        .await
        .unwrap();
    let elapsed = start.elapsed();

    assert!(
        elapsed < Duration::from_millis(350),
        "Researcher + SEO should run in parallel, but took {elapsed:?}"
    );
}

/// Missing topic in journalism mode returns an error.
#[tokio::test]
async fn test_journalism_missing_topic_error() {
    let server = MockServer::start().await;
    let tmp = TempDir::new().unwrap();
    let err = journalism_pipeline(&server, &tmp, "test topic")
        .run()
        .await
        .unwrap_err();

    assert!(
        err.to_string().contains("--topic"),
        "should mention --topic; got: {err}"
    );
}

// ── deep-dive mode helpers ──────────────────────────────────────────────────

fn deep_dive_pipeline(server: &MockServer, tmp: &TempDir, title: &str, input_file: &str) -> Pipeline {
    let ds_client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    let qw_client = Arc::new(
        qwen::Client::new("test-key").with_base_url(server.uri()),
    );
    Pipeline::new(title, tmp.path().to_str().unwrap())
        .with_deepseek_client(ds_client)
        .with_qwen_client(qw_client)
        .with_mode(PipelineMode::DeepDive)
        .with_topic(title)
        .with_input_file(input_file)
        .with_research(agentic_press::research_phase::ResearchConfig {
            enable_paper_search: false,
            enable_multi_model: false,
        })
}

/// Mount deep-dive agent mocks (researcher, seo, deep-dive writer, editor, linkedin).
/// Note: with `enable_paper_search: false, enable_multi_model: false`,
/// `research_phase` falls back to `fallback_deepseek` which uses `prompts::researcher(niche)`
/// containing "Researcher agent" (not "Researcher for a journalism team").
async fn mount_deep_dive_mocks(server: &MockServer, editor_verdict: &str) {
    for (phrase, body) in [
        ("Researcher agent", chat_response("# Research Brief\n\n## Summary\nDeep-dive research findings.")),
        ("SEO Strategist for a journalism team", chat_response("# SEO Strategy\n\n## Target Keywords\neval driven development.")),
        ("Deep-Dive Writer", chat_response("# Eval Driven Development\n\nDraft body with research insights.\n\n## Section 1\n\nContent.")),
        ("Editor for a deep-dive technical article team", chat_response(editor_verdict)),
        ("LinkedIn Drafter", chat_response("Eval-driven development changes everything.\n\nKey insight 1\nKey insight 2\n\n#EvalDriven #LLM")),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(body))
            .mount(server)
            .await;
    }
}

// ── deep-dive mode tests ────────────────────────────────────────────────────

/// Deep-dive happy path: creates research, draft, published, and linkedin files.
#[tokio::test]
async fn test_deep_dive_happy_path_approved() {
    let server = MockServer::start().await;
    mount_deep_dive_mocks(
        &server,
        "APPROVE\n\n---\ntitle: \"Final Deep Dive\"\nstatus: published\n---\n\n# Eval Driven Development\n\nEdited body.",
    )
    .await;

    let tmp = TempDir::new().unwrap();
    // Create a source file for the pipeline to read.
    let source_file = tmp.path().join("source.md");
    std::fs::write(&source_file, "# Original Article\n\nSource content here.").unwrap();

    let result = deep_dive_pipeline(&server, &tmp, "Eval Driven Development", source_file.to_str().unwrap())
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::DeepDive(d) = result else {
        panic!("expected DeepDive result");
    };
    assert!(d.article.approved, "editor should approve");
    assert_eq!(d.article.revision_rounds, 0, "no revision rounds needed");
    assert_eq!(d.article.title, "Eval Driven Development");
    assert_eq!(d.article.slug, "eval-driven-development");
    assert!(!d.article.research.is_empty());
    assert!(!d.article.seo.is_empty());
    assert!(!d.article.draft.is_empty());
    assert!(!d.article.linkedin.is_empty());

    let out = tmp.path();
    assert!(out.join("research/eval-driven-development-research.md").exists());
    assert!(out.join("research/eval-driven-development-seo.md").exists());
    assert!(out.join("drafts/eval-driven-development.md").exists());
    assert!(out.join("published/eval-driven-development.md").exists());
    assert!(out.join("drafts/eval-driven-development-linkedin.md").exists());
}

/// Deep-dive revision loop: REVISE → APPROVE, revision_rounds == 1.
#[tokio::test]
async fn test_deep_dive_revision_loop() {
    let server = MockServer::start().await;

    // Researcher and SEO respond normally.
    for (phrase, body) in [
        ("Researcher agent", chat_response("# Research Brief\nFindings.")),
        ("SEO Strategist for a journalism team", chat_response("# SEO Strategy\nKeywords.")),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(body))
            .mount(&server)
            .await;
    }

    // Writer always returns a draft.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Deep-Dive Writer"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("# Eval Driven Development\n\nRevised draft body."),
        ))
        .mount(&server)
        .await;

    // Editor: first call returns REVISE, second returns APPROVE.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a deep-dive technical article team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("**DECISION: REVISE**\n## Critical Issues (must fix)\n- [ ] Fix the lede"),
        ))
        .up_to_n_times(1)
        .mount(&server)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a deep-dive technical article team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("**DECISION: APPROVE**\n\n---\nstatus: published\n---\n\n# Final\n\nApproved."),
        ))
        .mount(&server)
        .await;

    // LinkedIn responds normally.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            chat_response("LinkedIn post.\n#EvalDriven"),
        ))
        .mount(&server)
        .await;

    let tmp = TempDir::new().unwrap();
    let source_file = tmp.path().join("source.md");
    std::fs::write(&source_file, "# Source\nContent.").unwrap();

    let result = deep_dive_pipeline(&server, &tmp, "Eval Driven Development", source_file.to_str().unwrap())
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::DeepDive(d) = result else {
        panic!("expected DeepDive result");
    };
    assert!(d.article.approved, "editor should approve after revision");
    assert_eq!(d.article.revision_rounds, 1, "should have done 1 revision round");

    let out = tmp.path();
    assert!(out.join("published/eval-driven-development.md").exists(), "published file should exist");
    assert!(out.join("drafts/eval-driven-development-revisions.md").exists(), "revision notes should be saved");
}

/// Deep-dive max revision cap: always REVISE, exits approved=false.
#[tokio::test]
async fn test_deep_dive_max_revision_cap() {
    let server = MockServer::start().await;
    mount_deep_dive_mocks(
        &server,
        "**DECISION: REVISE**\n## Critical Issues (must fix)\n- [ ] Unfixable problem",
    )
    .await;

    let tmp = TempDir::new().unwrap();
    let source_file = tmp.path().join("source.md");
    std::fs::write(&source_file, "# Source\nContent.").unwrap();

    let result = deep_dive_pipeline(&server, &tmp, "Eval Driven Development", source_file.to_str().unwrap())
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::DeepDive(d) = result else {
        panic!("expected DeepDive result");
    };
    assert!(!d.article.approved, "should not approve after max revisions");
    assert_eq!(d.article.revision_rounds, 1, "should cap at 1 revision round");

    let out = tmp.path();
    assert!(out.join("drafts/eval-driven-development-revisions.md").exists());
    assert!(!out.join("published/eval-driven-development.md").exists());
}

/// Missing input file in deep-dive mode returns an error.
#[tokio::test]
async fn test_deep_dive_missing_input_file_error() {
    let server = MockServer::start().await;
    let tmp = TempDir::new().unwrap();

    let ds_client = Arc::new(
        DeepSeekClient::new(ReqwestClient::new(), "test-key")
            .with_base_url(server.uri()),
    );
    let qw_client = Arc::new(
        qwen::Client::new("test-key").with_base_url(server.uri()),
    );

    let err = Pipeline::new("test", tmp.path().to_str().unwrap())
        .with_deepseek_client(ds_client)
        .with_qwen_client(qw_client)
        .with_mode(PipelineMode::DeepDive)
        .with_topic("Test")
        .run()
        .await
        .unwrap_err();

    assert!(
        err.to_string().contains("--input"),
        "should mention --input; got: {err}"
    );
}

/// Publisher receives correct content when deep-dive is approved.
#[tokio::test]
async fn test_deep_dive_publisher_receives_content() {
    let server = MockServer::start().await;
    mount_deep_dive_mocks(
        &server,
        "DECISION: APPROVE\n\nMinor edits.\n\n---\ntitle: \"Final Deep Dive\"\nstatus: published\n---\n\n# Final Deep Dive\n\nApproved editor output.",
    )
    .await;

    let tmp = TempDir::new().unwrap();
    let source_file = tmp.path().join("source.md");
    std::fs::write(&source_file, "# Source\nContent.").unwrap();

    let mock_pub = MockPublisher::new();
    let calls = Arc::clone(&mock_pub.calls);

    deep_dive_pipeline(&server, &tmp, "Eval Driven Development", source_file.to_str().unwrap())
        .with_publish(true)
        .with_publisher(mock_pub)
        .run()
        .await
        .unwrap();

    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 1, "publisher should have been called once");
    assert!(calls[0].0.contains("status: published"), "published content should contain frontmatter");
    assert!(calls[0].0.starts_with("---\n"), "published content should start with frontmatter");
    assert_eq!(calls[0].1, "Eval Driven Development", "title should be passed to publisher");
}

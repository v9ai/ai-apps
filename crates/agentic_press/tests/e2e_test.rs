//! End-to-end integration tests for agentic_press dual-model pipeline.
//!
//! These tests verify complete pipeline flows with both DeepSeek and Qwen
//! clients pointed at separate wiremock servers, validating that model routing,
//! data handoff between phases, file I/O, and error propagation all work
//! correctly when the full system runs together.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use async_trait::async_trait;
use tempfile::TempDir;
use wiremock::matchers::{body_string_contains, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use agentic_press::agent_teams::{Agent, ModelClient};
use agentic_press::pipeline::Pipeline;
use agentic_press::publisher::Publisher;
use agentic_press::PipelineMode;
use deepseek::{DeepSeekClient, ReqwestClient};

// ── helpers ──────────────────────────────────────────────────────────────────

fn ds_response(content: &str) -> serde_json::Value {
    serde_json::json!({
        "id": "ds-id",
        "model": "deepseek-reasoner",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content,
                "reasoning_content": "chain-of-thought reasoning here"
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 50,
            "completion_tokens": 100,
            "total_tokens": 150
        }
    })
}

fn qw_response(content: &str) -> serde_json::Value {
    serde_json::json!({
        "id": "qw-id",
        "model": "qwen-plus",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 30,
            "completion_tokens": 60,
            "total_tokens": 90
        }
    })
}

const SINGLE_TOPIC_JSON: &str = r#"[{"topic":"Dual Model Pipelines","angle":"Why two models beat one","why_viral":"Counter-intuitive cost optimization"}]"#;

const THREE_TOPICS_JSON: &str = r#"[
  {"topic":"Topic Alpha","angle":"Angle A","why_viral":"V-A"},
  {"topic":"Topic Beta","angle":"Angle B","why_viral":"V-B"},
  {"topic":"Topic Gamma","angle":"Angle C","why_viral":"V-C"}
]"#;

fn make_ds_client(server: &MockServer) -> Arc<DeepSeekClient<ReqwestClient>> {
    Arc::new(DeepSeekClient::new(ReqwestClient::new(), "ds-key").with_base_url(server.uri()))
}

fn make_qw_client(server: &MockServer) -> Arc<qwen::Client> {
    Arc::new(qwen::Client::new("qw-key").with_base_url(server.uri()))
}

#[derive(Clone)]
struct TrackingPublisher {
    calls: Arc<Mutex<Vec<(String, String)>>>,
}

impl TrackingPublisher {
    fn new() -> Self {
        Self {
            calls: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

#[async_trait]
impl Publisher for TrackingPublisher {
    async fn publish_post(
        &self,
        blog_md: &str,
        topic: &str,
        _deploy: bool,
        _audio_url: Option<&str>,
    ) -> anyhow::Result<PathBuf> {
        self.calls
            .lock()
            .unwrap()
            .push((blog_md.to_string(), topic.to_string()));
        Ok(PathBuf::from("/mock/published"))
    }
}

// ── dual-server pipeline helpers ─────────────────────────────────────────────

/// Build a dual-model blog pipeline: DeepSeek server for reasoning agents,
/// Qwen server for light agents (scout, picker, linkedin).
fn dual_blog_pipeline(
    ds_server: &MockServer,
    qw_server: &MockServer,
    tmp: &TempDir,
) -> Pipeline {
    Pipeline::new("dual-model testing", tmp.path().to_str().unwrap())
        .with_deepseek_client(make_ds_client(ds_server))
        .with_qwen_client(make_qw_client(qw_server))
        .with_mode(PipelineMode::Blog)
}

/// Build a dual-model journalism pipeline.
fn dual_journalism_pipeline(
    ds_server: &MockServer,
    qw_server: &MockServer,
    tmp: &TempDir,
) -> Pipeline {
    Pipeline::new("remote EU jobs", tmp.path().to_str().unwrap())
        .with_deepseek_client(make_ds_client(ds_server))
        .with_qwen_client(make_qw_client(qw_server))
        .with_mode(PipelineMode::Journalism)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── DUAL-SERVER E2E TESTS ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/// Full blog pipeline with separate DeepSeek and Qwen mock servers.
/// Verifies: Scout and Picker hit Qwen, Researcher and Writer hit DeepSeek,
/// LinkedIn hits Qwen. Each server only gets the requests it should.
#[tokio::test]
async fn e2e_blog_dual_model_routing() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // ── Qwen server: Scout + Picker + LinkedIn ───────────────────────────────
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(
            "1. Dual Model Pipelines\n2. Topic B\n3. Topic C\n4. Topic D\n5. Topic E",
        )))
        .expect(1)
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(SINGLE_TOPIC_JSON)))
        .expect(1)
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(
            "Two models > one model.\n\nKey insight here.\n\n#DualModel #Rust",
        )))
        .expect(1)
        .mount(&qw)
        .await;

    // ── DeepSeek server: Researcher + Writer ─────────────────────────────────
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "## Research\nDeep analysis of dual-model architectures.\n## Key Facts\n- 40% cost reduction with dual models.",
        )))
        .expect(1)
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "# Why Two Models Beat One\n\nMost teams use a single model.\n\n## The Data\n40% cost savings.",
        )))
        .expect(1)
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    let result = dual_blog_pipeline(&ds, &qw, &tmp).run().await.unwrap();

    // ── Verify result structure ──────────────────────────────────────────────
    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 1);
    assert_eq!(blog.topics[0].topic, "Dual Model Pipelines");
    assert_eq!(blog.topics[0].slug, "dual-model-pipelines");

    // Verify content from the correct model ended up in the right files.
    assert!(
        blog.topics[0].blog.contains("Two Models Beat One"),
        "blog should contain DeepSeek writer output"
    );
    assert!(
        blog.topics[0].linkedin.contains("#DualModel"),
        "linkedin should contain Qwen output"
    );

    // Verify files on disk.
    let out = tmp.path();
    let slug_dir = out.join("dual-model-pipelines");
    assert!(out.join("01_scout_topics.md").exists());
    assert!(out.join("02_picker_selection.json").exists());
    assert!(slug_dir.join("research.md").exists());
    assert!(slug_dir.join("blog.md").exists());
    assert!(slug_dir.join("linkedin.md").exists());

    // Research file should contain DeepSeek output.
    let research = std::fs::read_to_string(slug_dir.join("research.md")).unwrap();
    assert!(research.contains("40% cost reduction"));

    // wiremock `.expect(N)` will panic on drop if call counts don't match,
    // verifying routing implicitly.
}

/// Full journalism pipeline with dual servers.
/// Verifies: Researcher, Writer, Editor hit DeepSeek; SEO hits Qwen.
#[tokio::test]
async fn e2e_journalism_dual_model_routing() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // ── DeepSeek: Researcher + Writer + Editor ───────────────────────────────
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "# Research Brief\n\n## Summary\nGermany leads EU remote adoption.\n\n## Key Facts\n- 43% of German tech workers remote",
        )))
        .expect(1)
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "---\ntitle: \"Germany Remote Work 2026\"\nstatus: draft\n---\n\n# Germany Remote Work\n\n43% of tech workers are remote.",
        )))
        .expect(1)
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "APPROVE\n\n---\ntitle: \"Germany Remote Work 2026\"\nstatus: published\n---\n\n# Germany Remote Work\n\nEdited: 43% of tech workers are remote.",
        )))
        .expect(1)
        .mount(&ds)
        .await;

    // ── Qwen: SEO ────────────────────────────────────────────────────────────
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("SEO Strategist for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(
            "# SEO Strategy\n\n## Target Keywords\n| Keyword | Volume |\n|---|---|\n| remote work germany | high |",
        )))
        .expect(1)
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    let result = dual_journalism_pipeline(&ds, &qw, &tmp)
        .with_topic("Remote work in Germany")
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(j.article.approved);
    assert_eq!(j.article.slug, "remote-work-in-germany");

    // Research came from DeepSeek.
    assert!(j.article.research.contains("43% of German tech workers"));
    // SEO came from Qwen.
    assert!(j.article.seo.contains("remote work germany"));
    // Draft came from DeepSeek writer.
    assert!(j.article.draft.contains("43% of tech workers are remote"));

    // Verify all files exist.
    let out = tmp.path();
    assert!(out.join("research/remote-work-in-germany-research.md").exists());
    assert!(out.join("research/remote-work-in-germany-seo.md").exists());
    assert!(out.join("drafts/remote-work-in-germany.md").exists());
    assert!(out.join("published/remote-work-in-germany.md").exists());
}

/// Verify data flows correctly between phases: Scout output → Picker input,
/// Picker output → Researcher input, Research output → Writer+LinkedIn input.
#[tokio::test]
async fn e2e_blog_data_handoff_between_phases() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Scout returns specific content.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(
            "1. UNIQUE_SCOUT_MARKER — trending because X",
        )))
        .mount(&qw)
        .await;

    // Picker should receive scout output — we verify by checking the request body
    // contains the scout marker. Picker returns its selection.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .and(body_string_contains("UNIQUE_SCOUT_MARKER"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(SINGLE_TOPIC_JSON)))
        .mount(&qw)
        .await;

    // Researcher receives the topic from picker.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .and(body_string_contains("Dual Model Pipelines"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(ds_response("UNIQUE_RESEARCH_NOTES — deep findings")),
        )
        .mount(&ds)
        .await;

    // Writer receives research notes.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .and(body_string_contains("UNIQUE_RESEARCH_NOTES"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(ds_response("# Blog\nWritten from research.")),
        )
        .mount(&ds)
        .await;

    // LinkedIn receives research notes.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .and(body_string_contains("UNIQUE_RESEARCH_NOTES"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(qw_response("LinkedIn from research.")),
        )
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    // If any body_string_contains matcher fails, wiremock returns 404,
    // which the pipeline surfaces as an error. A pass means data flowed correctly.
    dual_blog_pipeline(&ds, &qw, &tmp)
        .run()
        .await
        .expect("data should flow between phases correctly");
}

/// Journalism data handoff: Research+SEO → Writer → Editor.
#[tokio::test]
async fn e2e_journalism_data_handoff() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Researcher output.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher for a journalism team"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(ds_response("MARKER_RESEARCH_BRIEF — key facts")),
        )
        .mount(&ds)
        .await;

    // SEO output.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("SEO Strategist for a journalism team"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(qw_response("MARKER_SEO_STRATEGY — target keywords")),
        )
        .mount(&qw)
        .await;

    // Writer receives both research brief AND seo strategy.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .and(body_string_contains("MARKER_RESEARCH_BRIEF"))
        .and(body_string_contains("MARKER_SEO_STRATEGY"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "---\ntitle: \"Draft\"\nstatus: draft\n---\n\nMARKER_DRAFT_BODY — written from brief + seo",
        )))
        .mount(&ds)
        .await;

    // Editor receives draft, research, AND seo.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .and(body_string_contains("MARKER_DRAFT_BODY"))
        .and(body_string_contains("MARKER_RESEARCH_BRIEF"))
        .and(body_string_contains("MARKER_SEO_STRATEGY"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(ds_response("APPROVE\nFinal article.")),
        )
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    dual_journalism_pipeline(&ds, &qw, &tmp)
        .with_topic("Data handoff test")
        .run()
        .await
        .expect("journalism data should flow between all phases");
}

/// DeepSeek-only fallback: pipeline works without a Qwen client.
/// All agents should use DeepSeek.
#[tokio::test]
async fn e2e_deepseek_only_fallback() {
    let ds = MockServer::start().await;

    // All agents hit DeepSeek (no Qwen server).
    for (phrase, content) in [
        (
            "Scout agent",
            "1. Fallback Topic\n2. B\n3. C\n4. D\n5. E",
        ),
        (
            "Picker agent",
            r#"[{"topic":"Fallback Topic","angle":"Testing fallback","why_viral":"Coverage"}]"#,
        ),
        ("Researcher agent", "## Research\nFallback research."),
        ("Writer agent", "# Fallback Blog\nBody."),
        ("LinkedIn Drafter", "Fallback linkedin.\n#Tag"),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(content)))
            .mount(&ds)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    // Only provide DeepSeek client — no Qwen.
    let result = Pipeline::new("fallback niche", tmp.path().to_str().unwrap())
        .with_deepseek_client(make_ds_client(&ds))
        .with_mode(PipelineMode::Blog)
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 1);
    assert_eq!(blog.topics[0].slug, "fallback-topic");
    assert!(blog.topics[0].blog.contains("Fallback Blog"));
}

/// Journalism fallback: pipeline works without Qwen client (SEO uses DeepSeek).
#[tokio::test]
async fn e2e_journalism_deepseek_only_fallback() {
    let ds = MockServer::start().await;

    for (phrase, content) in [
        (
            "Researcher for a journalism team",
            "# Research Brief\nFindings.",
        ),
        (
            "SEO Strategist for a journalism team",
            "# SEO Strategy\nKeywords.",
        ),
        (
            "Writer for a journalism team",
            "---\ntitle: \"Fallback\"\nstatus: draft\n---\nDraft.",
        ),
        ("Editor for a journalism team", "APPROVE\nFinal."),
    ] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(content)))
            .mount(&ds)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    let result = Pipeline::new("remote EU jobs", tmp.path().to_str().unwrap())
        .with_deepseek_client(make_ds_client(&ds))
        .with_mode(PipelineMode::Journalism)
        .with_topic("Fallback journalism")
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(j.article.approved);
}

/// Multi-topic blog run with 3 topics, verifying all topics complete and
/// publisher is called 3 times.
#[tokio::test]
async fn e2e_blog_three_topics_with_publish() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("5 topics")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(THREE_TOPICS_JSON)))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(ds_response("## Research\nNotes.")),
        )
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(ds_response("# Blog\nContent.")),
        )
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(qw_response("LinkedIn post.\n#Tag")),
        )
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    let publisher = TrackingPublisher::new();
    let calls = Arc::clone(&publisher.calls);

    let result = dual_blog_pipeline(&ds, &qw, &tmp)
        .with_count(3)
        .with_publish(true)
        .with_publisher(publisher)
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert_eq!(blog.topics.len(), 3);

    let slugs: Vec<&str> = blog.topics.iter().map(|t| t.slug.as_str()).collect();
    assert!(slugs.contains(&"topic-alpha"));
    assert!(slugs.contains(&"topic-beta"));
    assert!(slugs.contains(&"topic-gamma"));

    // All three topic directories should exist with full contents.
    for slug in &["topic-alpha", "topic-beta", "topic-gamma"] {
        let dir = tmp.path().join(slug);
        assert!(dir.join("research.md").exists(), "missing research.md for {slug}");
        assert!(dir.join("blog.md").exists(), "missing blog.md for {slug}");
        assert!(dir.join("linkedin.md").exists(), "missing linkedin.md for {slug}");
    }

    // Publisher should be called once per topic.
    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 3, "publisher should be called 3 times");
}

/// DeepSeek returns 500 on first attempt for the writer, succeeds on retry.
/// The overall pipeline should still succeed.
#[tokio::test]
async fn e2e_deepseek_transient_failure_recovers() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Qwen agents respond normally.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("topics")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(SINGLE_TOPIC_JSON)))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(qw_response("linkedin\n#Tag")),
        )
        .mount(&qw)
        .await;

    // Researcher responds normally on DeepSeek.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("research notes")))
        .mount(&ds)
        .await;

    // Writer: first call returns 500, second succeeds.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(ResponseTemplate::new(500).set_body_string("transient error"))
        .up_to_n_times(1)
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("# Blog\nRecovered.")))
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    let result = dual_blog_pipeline(&ds, &qw, &tmp)
        .run()
        .await
        .expect("pipeline should recover from transient DeepSeek failure");

    let agentic_press::PipelineResult::Blog(blog) = result else {
        panic!("expected Blog result");
    };
    assert!(blog.topics[0].blog.contains("Recovered"));
}

/// Qwen scout returns 500 on first attempt, succeeds on retry.
#[tokio::test]
async fn e2e_qwen_transient_failure_recovers() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Scout: first 500, then success.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(500).set_body_string("qwen hiccup"))
        .up_to_n_times(1)
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("recovered topics")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(SINGLE_TOPIC_JSON)))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("li\n#Tag")))
        .mount(&qw)
        .await;

    for phrase in ["Researcher agent", "Writer agent"] {
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(body_string_contains(phrase))
            .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("output")))
            .mount(&ds)
            .await;
    }

    let tmp = TempDir::new().unwrap();
    dual_blog_pipeline(&ds, &qw, &tmp)
        .run()
        .await
        .expect("pipeline should recover from transient Qwen failure");
}

/// Permanent DeepSeek failure (3x 500) propagates as an error.
#[tokio::test]
async fn e2e_permanent_deepseek_failure_propagates() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Qwen agents respond normally.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("topics")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(SINGLE_TOPIC_JSON)))
        .mount(&qw)
        .await;

    // DeepSeek always fails.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("permanent failure"))
        .mount(&ds)
        .await;

    // LinkedIn also needs a Qwen mock (it might start before researcher fails).
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("li")))
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    let err = dual_blog_pipeline(&ds, &qw, &tmp)
        .run()
        .await
        .unwrap_err();

    assert!(
        err.to_string().contains("500"),
        "permanent DeepSeek failure should propagate; got: {err}"
    );
}

/// Permanent Qwen failure (scout can't start) propagates as an error.
#[tokio::test]
async fn e2e_permanent_qwen_failure_propagates() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Qwen always fails.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("qwen down"))
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    let err = dual_blog_pipeline(&ds, &qw, &tmp)
        .run()
        .await
        .unwrap_err();

    assert!(
        err.to_string().contains("Qwen API error"),
        "permanent Qwen failure should propagate; got: {err}"
    );
}

/// Journalism: editor rejects the article, verify no published file,
/// revisions file exists, and publisher is NOT called.
#[tokio::test]
async fn e2e_journalism_rejection_no_publish() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("Research.")))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("SEO Strategist for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("SEO.")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "---\ntitle: \"Draft\"\nstatus: draft\n---\nDraft body.",
        )))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "## Verdict: REVISE\n\n## Critical Issues\n- Needs more data\n- Sources unverified",
        )))
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    let publisher = TrackingPublisher::new();
    let calls = Arc::clone(&publisher.calls);

    let result = dual_journalism_pipeline(&ds, &qw, &tmp)
        .with_topic("Rejected article")
        .with_publish(true)
        .with_publisher(publisher)
        .run()
        .await
        .unwrap();

    let agentic_press::PipelineResult::Journalism(j) = result else {
        panic!("expected Journalism result");
    };
    assert!(!j.article.approved, "editor should reject");

    let out = tmp.path();
    assert!(
        out.join("drafts/rejected-article-revisions.md").exists(),
        "revisions file should exist"
    );
    assert!(
        !out.join("published/rejected-article.md").exists(),
        "published file should NOT exist"
    );

    // Publisher should NOT be called when rejected.
    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 0, "publisher should not be called on rejection");
}

/// Journalism: approved article with publish=true triggers the publisher.
#[tokio::test]
async fn e2e_journalism_approval_triggers_publish() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("Research.")))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("SEO Strategist for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("SEO.")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "---\ntitle: \"Approved\"\nstatus: draft\n---\nDraft.",
        )))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "APPROVE\n\nFinal approved content.",
        )))
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    let publisher = TrackingPublisher::new();
    let calls = Arc::clone(&publisher.calls);

    dual_journalism_pipeline(&ds, &qw, &tmp)
        .with_topic("Published article")
        .with_publish(true)
        .with_publisher(publisher)
        .run()
        .await
        .unwrap();

    let calls = calls.lock().unwrap();
    assert_eq!(calls.len(), 1, "publisher should be called once");
    assert_eq!(calls[0].1, "Published article");
    assert!(calls[0].0.contains("APPROVE"));
}

/// Three topics run concurrently. Each researcher takes 200 ms.
/// Total should be ~200 ms (parallel), not ~600 ms (sequential).
#[tokio::test]
async fn e2e_three_topic_concurrency() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Scout + Picker respond instantly.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("topics")))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(THREE_TOPICS_JSON)))
        .mount(&qw)
        .await;

    // Researcher: each takes 200 ms.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_millis(200))
                .set_body_json(ds_response("research")),
        )
        .mount(&ds)
        .await;

    // Writer + LinkedIn respond instantly.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response("blog")))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response("li")))
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    let start = Instant::now();
    dual_blog_pipeline(&ds, &qw, &tmp)
        .with_count(3)
        .run()
        .await
        .unwrap();
    let elapsed = start.elapsed();

    // 3 researchers at 200 ms each sequential = 600 ms. Parallel ≈ 200 ms.
    assert!(
        elapsed < Duration::from_millis(450),
        "3 topics should run concurrently, but took {elapsed:?}"
    );
}

/// Cross-model parallel: journalism researcher (DeepSeek, 200 ms) and
/// SEO (Qwen, 200 ms) run on different servers concurrently.
#[tokio::test]
async fn e2e_journalism_cross_model_parallelism() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    // Researcher (DeepSeek): 200 ms.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher for a journalism team"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_millis(200))
                .set_body_json(ds_response("research")),
        )
        .mount(&ds)
        .await;

    // SEO (Qwen): 200 ms.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("SEO Strategist for a journalism team"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_millis(200))
                .set_body_json(qw_response("seo")),
        )
        .mount(&qw)
        .await;

    // Writer + Editor respond instantly.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer for a journalism team"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "---\ntitle: \"T\"\nstatus: draft\n---\nDraft.",
        )))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Editor for a journalism team"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(ds_response("APPROVE\nOK.")),
        )
        .mount(&ds)
        .await;

    let tmp = TempDir::new().unwrap();
    let start = Instant::now();
    dual_journalism_pipeline(&ds, &qw, &tmp)
        .with_topic("Cross model parallel")
        .run()
        .await
        .unwrap();
    let elapsed = start.elapsed();

    // Sequential = 400 ms; parallel ≈ 200 ms.
    assert!(
        elapsed < Duration::from_millis(350),
        "Researcher (DeepSeek) + SEO (Qwen) should run in parallel, but took {elapsed:?}"
    );
}

/// File content integrity: verify each output file contains exactly the
/// content produced by its respective agent, with no mixing.
#[tokio::test]
async fn e2e_file_content_integrity() {
    let ds = MockServer::start().await;
    let qw = MockServer::start().await;

    let scout_text = "SCOUT_UNIQUE_7f3a — 5 topics here";
    let picker_text = SINGLE_TOPIC_JSON;
    let research_text = "RESEARCH_UNIQUE_b2c1 — deep analysis";
    let blog_text = "BLOG_UNIQUE_d4e5 — full article content";
    let linkedin_text = "LINKEDIN_UNIQUE_f6a7 — post content\n#Tag";

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Scout agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(scout_text)))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Picker agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(picker_text)))
        .mount(&qw)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Researcher agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(research_text)))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("Writer agent"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(blog_text)))
        .mount(&ds)
        .await;

    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("LinkedIn Drafter"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(linkedin_text)))
        .mount(&qw)
        .await;

    let tmp = TempDir::new().unwrap();
    dual_blog_pipeline(&ds, &qw, &tmp).run().await.unwrap();

    let out = tmp.path();
    let read = |p: std::path::PathBuf| std::fs::read_to_string(p).unwrap();

    assert_eq!(read(out.join("01_scout_topics.md")), scout_text);
    assert_eq!(read(out.join("02_picker_selection.json")), picker_text);

    let slug_dir = out.join("dual-model-pipelines");
    assert_eq!(read(slug_dir.join("research.md")), research_text);
    assert_eq!(read(slug_dir.join("blog.md")), blog_text);
    assert_eq!(read(slug_dir.join("linkedin.md")), linkedin_text);
}

/// Agent-level e2e: a multi-step agent chain where output of one agent
/// feeds into the next, using mixed model clients.
#[tokio::test]
async fn e2e_agent_chain_mixed_models() {
    let ds_server = MockServer::start().await;
    let qw_server = MockServer::start().await;

    // Step 1: Qwen agent produces outline.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("outline-agent-prompt"))
        .respond_with(ResponseTemplate::new(200).set_body_json(qw_response(
            "1. Introduction\n2. Main argument\n3. Conclusion",
        )))
        .mount(&qw_server)
        .await;

    // Step 2: DeepSeek agent expands outline into full text.
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .and(body_string_contains("expand-agent-prompt"))
        .and(body_string_contains("Main argument"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ds_response(
            "# Full Article\n\nExpanded from outline with deep reasoning.",
        )))
        .mount(&ds_server)
        .await;

    let qw_client = ModelClient::qwen(make_qw_client(&qw_server));
    let ds_client = ModelClient::deepseek(make_ds_client(&ds_server));

    let outliner = Agent::new("outliner", "outline-agent-prompt", qw_client);
    let expander = Agent::new("expander", "expand-agent-prompt", ds_client);

    let outline = outliner.run("Write about Rust safety").await.unwrap();
    assert!(outline.contains("Main argument"));

    let full_article = expander.run(&outline).await.unwrap();
    assert!(full_article.contains("Full Article"));
    assert!(full_article.contains("deep reasoning"));
}

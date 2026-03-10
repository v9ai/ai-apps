use std::sync::Arc;

use tokio::sync::Semaphore;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::agent::Tool;
use research::crossref::CrossrefClient;
use research::openalex::OpenAlexClient;
use research::scholar::SemanticScholarClient;
use research::tools::{FallbackClients, SearchPapers, SearchToolConfig};

// ── Semaphore rate limiting ─────────────────────────────────────────

#[tokio::test]
async fn semaphore_permits_released_after_request() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 0, "offset": 0, "next": 0, "data": []
        })))
        .mount(&server)
        .await;

    let semaphore = Arc::new(Semaphore::new(2));
    let client = SemanticScholarClient::with_base_url_and_rate_limiter(&server.uri(), None, semaphore.clone());

    assert_eq!(semaphore.available_permits(), 2);

    // Make a request — permit should be acquired then released
    client.search("test", "title", 5, 0).await.unwrap();
    assert_eq!(semaphore.available_permits(), 2, "permit should be released after request");

    // Make sequential requests to verify permits don't leak
    for _ in 0..5 {
        client.search("test", "title", 5, 0).await.unwrap();
    }
    assert_eq!(semaphore.available_permits(), 2, "no permit leak after multiple requests");
}

#[tokio::test]
async fn client_without_semaphore_still_works() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total": 1, "offset": 0, "next": 1,
            "data": [{ "paperId": "abc", "title": "Test" }]
        })))
        .expect(1)
        .mount(&server)
        .await;

    // No semaphore — backward compatible
    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let resp = client.search("test", "title", 5, 0).await.unwrap();
    assert_eq!(resp.data.len(), 1);
}

// ── Search fallback to OpenAlex ─────────────────────────────────────

#[tokio::test]
async fn search_falls_back_to_openalex_on_429() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // S2 always returns 429
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(429))
        .mount(&s2_server)
        .await;

    // OpenAlex returns results
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [{
                "id": "https://openalex.org/W999",
                "title": "Fallback Paper from OpenAlex",
                "publication_year": 2024
            }]
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    let s2_client = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = SearchPapers::with_fallback(
        s2_client,
        SearchToolConfig::default(),
        fallback,
    );

    let result = tool
        .call_json(serde_json::json!({ "query": "test query" }))
        .await;

    assert!(result.is_ok(), "expected fallback success, got: {:?}", result);
    let output = result.unwrap();
    assert!(
        output.contains("Fallback Paper from OpenAlex"),
        "expected OpenAlex paper in output: {output}"
    );
    assert!(
        output.contains("OpenAlex"),
        "expected source annotation: {output}"
    );
}

// ── Search fallback to Crossref when OpenAlex empty ─────────────────

#[tokio::test]
async fn search_falls_back_to_crossref_when_openalex_empty() {
    let s2_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;

    // S2 always returns 429
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(429))
        .mount(&s2_server)
        .await;

    // OpenAlex returns empty
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": []
        })))
        .mount(&oa_server)
        .await;

    // Crossref returns results
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "ok",
            "message": {
                "total-results": 1,
                "items": [{
                    "DOI": "10.1234/fallback",
                    "title": ["Crossref Fallback Paper"]
                }]
            }
        })))
        .expect(1)
        .mount(&cr_server)
        .await;

    let s2_client = SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = FallbackClients {
        openalex: OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let tool = SearchPapers::with_fallback(
        s2_client,
        SearchToolConfig::default(),
        fallback,
    );

    let result = tool
        .call_json(serde_json::json!({ "query": "test" }))
        .await;

    assert!(result.is_ok(), "expected Crossref fallback success: {:?}", result);
    let output = result.unwrap();
    assert!(
        output.contains("Crossref Fallback Paper"),
        "expected Crossref paper: {output}"
    );
}

// ── No fallback configured → returns error on 429 ──────────────────

#[tokio::test]
async fn search_without_fallback_returns_error_on_429() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/search"))
        .respond_with(ResponseTemplate::new(429))
        .mount(&server)
        .await;

    let client = SemanticScholarClient::with_base_url(&server.uri(), None);
    let tool = SearchPapers::with_config(client, SearchToolConfig::default());

    let result = tool
        .call_json(serde_json::json!({ "query": "test" }))
        .await;

    assert!(result.is_err(), "expected error without fallback");
    assert!(
        result.unwrap_err().contains("Rate limited"),
        "expected rate limit error"
    );
}

// ── Task resume from disk ───────────────────────────────────────────

#[test]
fn task_list_resumes_from_saved_files() {
    use research::team::{ResearchTask, SharedTaskList, TaskStatus};

    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // Create saved files for tasks 1 and 3
    std::fs::write(
        format!("{dir_path}/agent-01-topic-a.md"),
        "# Previous findings for topic A\nGreat results.",
    )
    .unwrap();
    std::fs::write(
        format!("{dir_path}/agent-03-topic-c.md"),
        "# Previous findings for topic C\nMore results.",
    )
    .unwrap();

    let tasks = vec![
        ResearchTask {
            id: 1,
            subject: "topic-a".into(),
            description: "Research topic A".into(),
            preamble: "preamble".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "topic-b".into(),
            description: "Research topic B".into(),
            preamble: "preamble".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "topic-c".into(),
            description: "Research topic C".into(),
            preamble: "preamble".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
    ];

    let task_list = SharedTaskList::new(tasks);
    let resumed = task_list.resume_from_dir(dir_path);

    assert_eq!(resumed, 2, "should resume 2 tasks");

    // Task 1 should be completed
    let completed = task_list.completed_tasks();
    assert_eq!(completed.len(), 2);
    assert!(completed.iter().any(|(id, _, _)| *id == 1));
    assert!(completed.iter().any(|(id, _, _)| *id == 3));

    // Task 2 should still be claimable
    let claimed = task_list.claim("test-worker");
    assert!(claimed.is_some());
    assert_eq!(claimed.unwrap().id, 2);
}

#[test]
fn task_list_resume_skips_empty_files() {
    use research::team::{ResearchTask, SharedTaskList, TaskStatus};

    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // Create an empty saved file
    std::fs::write(format!("{dir_path}/agent-01-topic-a.md"), "").unwrap();

    let tasks = vec![ResearchTask {
        id: 1,
        subject: "topic-a".into(),
        description: "Research topic A".into(),
        preamble: "preamble".into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: vec![],
        result: None,
    }];

    let task_list = SharedTaskList::new(tasks);
    let resumed = task_list.resume_from_dir(dir_path);

    assert_eq!(resumed, 0, "should not resume from empty file");
}

#[test]
fn reset_failed_tasks() {
    use research::team::{ResearchTask, SharedTaskList, TaskStatus};

    let tasks = vec![
        ResearchTask {
            id: 1,
            subject: "ok".into(),
            description: "d".into(),
            preamble: "p".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "fail".into(),
            description: "d".into(),
            preamble: "p".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
    ];

    let task_list = SharedTaskList::new(tasks);

    // Complete task 1, fail task 2
    task_list.complete(1, "result".into());
    task_list.fail(2, "some error".into());

    assert!(task_list.all_done());

    // Reset failed tasks
    let reset = task_list.reset_failed();
    assert_eq!(reset, 1);
    assert!(!task_list.all_done());

    // Task 2 should be claimable again
    let claimed = task_list.claim("retry-worker");
    assert!(claimed.is_some());
    assert_eq!(claimed.unwrap().id, 2);
}

// ── format_research_papers ──────────────────────────────────────────

#[test]
fn format_research_papers_includes_source() {
    use research::paper::{PaperSource, ResearchPaper};
    use research::tools::{format_research_papers, SearchToolConfig};

    let papers = vec![ResearchPaper {
        title: "Test Paper".into(),
        abstract_text: Some("An abstract.".into()),
        authors: vec!["Author One".into()],
        year: Some(2024),
        doi: Some("10.1234/test".into()),
        citation_count: Some(42),
        url: Some("https://example.com".into()),
        pdf_url: None,
        source: PaperSource::OpenAlex,
        source_id: "W123".into(),
        fields_of_study: None,
    }];

    let output = format_research_papers(&papers, &SearchToolConfig::default(), "test query", 1);

    assert!(output.contains("Test Paper"));
    assert!(output.contains("OpenAlex"));
    assert!(output.contains("test query"));
    assert!(output.contains("42"));
}

#[test]
fn format_paper_detail_includes_all_fields() {
    use research::paper::{PaperSource, ResearchPaper};
    use research::tools::format_paper_detail;

    let paper = ResearchPaper {
        title: "Detail Paper".into(),
        abstract_text: Some("Full abstract here.".into()),
        authors: vec!["Alice".into(), "Bob".into()],
        year: Some(2023),
        doi: Some("10.5678/detail".into()),
        citation_count: Some(100),
        url: Some("https://example.com/paper".into()),
        pdf_url: Some("https://example.com/paper.pdf".into()),
        source: PaperSource::Crossref,
        source_id: "10.5678/detail".into(),
        fields_of_study: Some(vec!["Computer Science".into()]),
    };

    let output = format_paper_detail(&paper);

    assert!(output.contains("Detail Paper"));
    assert!(output.contains("Alice"));
    assert!(output.contains("Bob"));
    assert!(output.contains("10.5678/detail"));
    assert!(output.contains("Crossref"));
    assert!(output.contains("Computer Science"));
}

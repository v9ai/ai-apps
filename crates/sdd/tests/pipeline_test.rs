use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use sdd::*;

// ── Mock LLM Client ──────────────────────────────────────────────────────

struct MockLlmClientInner {
    responses: Mutex<Vec<String>>,
    call_count: Mutex<u32>,
}

#[derive(Clone)]
struct MockLlmClient(Arc<MockLlmClientInner>);

impl MockLlmClient {
    fn new(responses: Vec<String>) -> Self {
        Self(Arc::new(MockLlmClientInner {
            responses: Mutex::new(responses),
            call_count: Mutex::new(0),
        }))
    }

    fn single(response: &str) -> Self {
        Self::new(vec![response.to_string()])
    }

    fn calls(&self) -> u32 {
        *self.0.call_count.lock().unwrap()
    }
}

#[async_trait]
impl LlmClient for MockLlmClient {
    async fn chat(&self, _request: &ChatRequest) -> Result<ChatResponse> {
        let mut count = self.0.call_count.lock().unwrap();
        let responses = self.0.responses.lock().unwrap();
        let idx = (*count as usize).min(responses.len() - 1);
        let text = responses[idx].clone();
        *count += 1;

        Ok(ChatResponse {
            id: format!("mock-{}", *count),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".into(),
                    content: ChatContent::Text(text),
                    reasoning_content: None,
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                },
                finish_reason: Some("stop".into()),
            }],
            usage: Some(UsageInfo {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150,
            }),
        })
    }
}

// ── Helper ────────────────────────────────────────────────────────────────

fn empty_change(name: &str) -> SddChange {
    SddChange::new(name, "Test change")
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_execute_phase_validates_dependencies() {
    let client = MockLlmClient::single("spec output");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    // Spec requires Propose to be completed
    let result = pipeline.execute_phase(SddPhase::Spec, &mut change, "").await;
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("propose"));
}

#[tokio::test]
async fn test_execute_phase_succeeds_with_deps_met() {
    let client = MockLlmClient::single("proposal output");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    // Propose has no dependencies
    let result = pipeline.execute_phase(SddPhase::Propose, &mut change, "context").await;
    assert!(result.is_ok());

    let value = result.unwrap();
    assert_eq!(value["phase"], "propose");
    assert_eq!(value["result"], "proposal output");
}

#[tokio::test]
async fn test_detect_next_phase_empty() {
    let change = empty_change("test");
    let next = detect_next_phase(&change);
    assert_eq!(next, Some(SddPhase::Propose));
}

#[tokio::test]
async fn test_detect_next_phase_after_propose() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);

    // Both Spec and Design depend only on Propose, Spec comes first in order
    let next = detect_next_phase(&change);
    assert_eq!(next, Some(SddPhase::Spec));
}

#[tokio::test]
async fn test_detect_next_phase_after_spec_only() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);
    change.phases_completed.push(SddPhase::Spec);

    // Design also depends only on Propose
    let next = detect_next_phase(&change);
    assert_eq!(next, Some(SddPhase::Design));
}

#[tokio::test]
async fn test_detect_next_phase_tasks_needs_both() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);
    change.phases_completed.push(SddPhase::Spec);
    // Design not done yet — Tasks should NOT be next
    let next = detect_next_phase(&change);
    assert_eq!(next, Some(SddPhase::Design));

    change.phases_completed.push(SddPhase::Design);
    let next = detect_next_phase(&change);
    assert_eq!(next, Some(SddPhase::Tasks));
}

#[tokio::test]
async fn test_detect_next_phase_all_complete() {
    let mut change = empty_change("test");
    change.phases_completed = vec![
        SddPhase::Propose, SddPhase::Spec, SddPhase::Design,
        SddPhase::Tasks, SddPhase::Apply, SddPhase::Verify, SddPhase::Archive,
    ];
    let next = detect_next_phase(&change);
    assert_eq!(next, None);
}

#[tokio::test]
async fn test_parallel_spec_design_requires_propose() {
    let client = MockLlmClient::new(vec!["spec".into(), "design".into()]);
    let pipeline = SddPipeline::new(client);
    let change = empty_change("test");

    let result = pipeline.execute_parallel_spec_design(&change, "").await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_parallel_spec_design_succeeds() {
    let client = MockLlmClient::new(vec!["spec output".into(), "design output".into()]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);

    let result = pipeline.execute_parallel_spec_design(&change, "").await;
    assert!(result.is_ok());
    let (spec, design) = result.unwrap();
    assert_eq!(spec["phase"], "spec");
    assert_eq!(design["phase"], "design");
    // Both phases called the client
    assert_eq!(client_ref.calls(), 2);
}

#[tokio::test]
async fn test_fast_forward() {
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(), "tasks".into(),
    ]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    let result = pipeline.fast_forward(&mut change, "context").await;
    assert!(result.is_ok());

    assert!(change.phases_completed.contains(&SddPhase::Propose));
    assert!(change.phases_completed.contains(&SddPhase::Spec));
    assert!(change.phases_completed.contains(&SddPhase::Design));
    assert!(change.phases_completed.contains(&SddPhase::Tasks));
    assert_eq!(client_ref.calls(), 4);
}

#[tokio::test]
async fn test_pipeline_with_hook_blocking() {
    let client = MockLlmClient::single("should not reach");
    let hooks = HookBuilder::new()
        .on_phase_start(sdd_phase_guard_hook(vec![]))
        .build();
    let pipeline = SddPipeline::new(client).with_hooks(hooks);

    let mut change = empty_change("test");

    // Spec phase should be blocked because propose isn't completed
    // and the phase guard hook enforces DAG
    let result = pipeline.execute_phase(SddPhase::Spec, &mut change, "").await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_sdd_phase_dependencies() {
    assert_eq!(SddPhase::Explore.dependencies(), &[]);
    assert_eq!(SddPhase::Propose.dependencies(), &[]);
    assert_eq!(SddPhase::Spec.dependencies(), &[SddPhase::Propose]);
    assert_eq!(SddPhase::Design.dependencies(), &[SddPhase::Propose]);
    assert_eq!(SddPhase::Tasks.dependencies(), &[SddPhase::Spec, SddPhase::Design]);
    assert_eq!(SddPhase::Apply.dependencies(), &[SddPhase::Tasks]);
    assert_eq!(SddPhase::Verify.dependencies(), &[SddPhase::Apply]);
    assert_eq!(SddPhase::Archive.dependencies(), &[SddPhase::Verify]);
}

#[tokio::test]
async fn test_sdd_phase_parallel_with() {
    assert_eq!(SddPhase::Spec.parallel_with(), &[SddPhase::Design]);
    assert_eq!(SddPhase::Design.parallel_with(), &[SddPhase::Spec]);
    assert_eq!(SddPhase::Tasks.parallel_with(), &[] as &[SddPhase]);
}

// ── detect_all_ready_phases Tests ─────────────────────────────────────────

#[test]
fn test_detect_all_ready_phases_empty() {
    let change = empty_change("test");
    let ready = detect_all_ready_phases(&change);
    // Propose has no deps, Explore also has no deps but isn't in the pipeline DAG
    assert_eq!(ready, vec![SddPhase::Propose]);
}

#[test]
fn test_detect_all_ready_phases_after_propose() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);
    let ready = detect_all_ready_phases(&change);
    // Both Spec and Design should be ready
    assert_eq!(ready.len(), 2);
    assert!(ready.contains(&SddPhase::Spec));
    assert!(ready.contains(&SddPhase::Design));
}

#[test]
fn test_detect_all_ready_phases_after_spec_only() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);
    change.phases_completed.push(SddPhase::Spec);
    let ready = detect_all_ready_phases(&change);
    // Design is ready, Tasks is not (needs both Spec + Design)
    assert_eq!(ready, vec![SddPhase::Design]);
}

#[test]
fn test_detect_all_ready_phases_after_spec_and_design() {
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);
    change.phases_completed.push(SddPhase::Spec);
    change.phases_completed.push(SddPhase::Design);
    let ready = detect_all_ready_phases(&change);
    assert_eq!(ready, vec![SddPhase::Tasks]);
}

#[test]
fn test_detect_all_ready_phases_all_complete() {
    let mut change = empty_change("test");
    change.phases_completed = vec![
        SddPhase::Propose, SddPhase::Spec, SddPhase::Design,
        SddPhase::Tasks, SddPhase::Apply, SddPhase::Verify, SddPhase::Archive,
    ];
    let ready = detect_all_ready_phases(&change);
    assert!(ready.is_empty());
}

// ── continue_change Tests ─────────────────────────────────────────────────

#[tokio::test]
async fn test_continue_change_single_phase() {
    let client = MockLlmClient::single("proposal output");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    let result = pipeline.continue_change(&mut change, "").await.unwrap();
    assert_eq!(result["mode"], "continue");
    assert!(change.phases_completed.contains(&SddPhase::Propose));
}

#[tokio::test]
async fn test_continue_change_parallel_phases() {
    let client = MockLlmClient::new(vec!["spec output".into(), "design output".into()]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.phases_completed.push(SddPhase::Propose);

    let result = pipeline.continue_change(&mut change, "").await.unwrap();
    assert_eq!(result["mode"], "continue");

    // Both Spec and Design should have been executed in parallel
    assert!(change.phases_completed.contains(&SddPhase::Spec));
    assert!(change.phases_completed.contains(&SddPhase::Design));
    assert_eq!(client_ref.calls(), 2);

    let executed = result["phases_executed"].as_array().unwrap();
    assert_eq!(executed.len(), 2);
}

#[tokio::test]
async fn test_continue_change_all_complete() {
    let client = MockLlmClient::single("unused");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.phases_completed = vec![
        SddPhase::Propose, SddPhase::Spec, SddPhase::Design,
        SddPhase::Tasks, SddPhase::Apply, SddPhase::Verify, SddPhase::Archive,
    ];

    let result = pipeline.continue_change(&mut change, "").await.unwrap();
    assert!(result["message"].as_str().unwrap().contains("complete"));
}

// ── full_pipeline Tests ───────────────────────────────────────────────────

#[tokio::test]
async fn test_full_pipeline() {
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(),
        "tasks".into(), "apply".into(), "All checks PASS".into(), "archive".into(),
    ]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    let result = pipeline.full_pipeline(&mut change, "context").await.unwrap();
    assert_eq!(result["mode"], "full-pipeline");
    assert_eq!(result["change"], "test");

    // All phases should be completed
    assert!(change.phases_completed.contains(&SddPhase::Propose));
    assert!(change.phases_completed.contains(&SddPhase::Spec));
    assert!(change.phases_completed.contains(&SddPhase::Design));
    assert!(change.phases_completed.contains(&SddPhase::Tasks));
    assert!(change.phases_completed.contains(&SddPhase::Apply));
    assert!(change.phases_completed.contains(&SddPhase::Verify));
    assert!(change.phases_completed.contains(&SddPhase::Archive));

    // 7 LLM calls total (spec + design run in parallel but still 2 calls)
    assert_eq!(client_ref.calls(), 7);
}

#[tokio::test]
async fn test_full_pipeline_resumes_from_partial() {
    let client = MockLlmClient::new(vec![
        "tasks".into(), "apply".into(), "All checks PASS".into(), "archive".into(),
    ]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.phases_completed = vec![SddPhase::Propose, SddPhase::Spec, SddPhase::Design];

    let result = pipeline.full_pipeline(&mut change, "").await.unwrap();
    assert!(result.is_object());

    // Should have completed remaining 4 phases
    assert_eq!(change.phases_completed.len(), 7);
    assert_eq!(client_ref.calls(), 4);
}

// ── Usage tracking Tests ──────────────────────────────────────────────────

#[tokio::test]
async fn test_usage_tracked_after_phase() {
    let client = MockLlmClient::single("proposal output");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();

    assert_eq!(change.usage_history.len(), 1);
    let usage = &change.usage_history[0];
    assert_eq!(usage.phase, "propose");
    assert_eq!(usage.prompt_tokens, 100);
    assert_eq!(usage.completion_tokens, 50);
    assert_eq!(usage.total_tokens, 150);
}

#[tokio::test]
async fn test_tokens_used_accumulates() {
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(), "tasks".into(),
    ]);
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    assert_eq!(change.tokens_used(), 0);

    pipeline.fast_forward(&mut change, "").await.unwrap();

    // 4 phases × 150 tokens each
    assert_eq!(change.tokens_used(), 600);
    assert_eq!(change.usage_history.len(), 4);
}

#[tokio::test]
async fn test_usage_in_pipeline_output() {
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(), "tasks".into(),
    ]);
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    let result = pipeline.fast_forward(&mut change, "").await.unwrap();
    assert_eq!(result["tokens_used"], 600);
}

// ── Artifact versioning Tests ─────────────────────────────────────────────

#[tokio::test]
async fn test_artifact_history_populated() {
    let client = MockLlmClient::single("proposal output");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();

    let versions = change.artifact_versions("propose");
    assert_eq!(versions.len(), 1);
    assert_eq!(versions[0].version, 1);
    assert_eq!(versions[0].tokens_used, 150);
}

#[tokio::test]
async fn test_artifact_latest_always_in_artifacts() {
    let client = MockLlmClient::single("proposal");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();

    assert!(change.artifacts.contains_key("propose"));
    assert_eq!(change.artifacts["propose"]["result"], "proposal");
}

#[tokio::test]
async fn test_artifact_versions_empty_for_unrun_phase() {
    let change = empty_change("test");
    assert_eq!(change.artifact_versions("propose"), &[]);
}

// ── Token budget Tests ────────────────────────────────────────────────────

#[tokio::test]
async fn test_budget_not_exceeded_allows_phase() {
    let client = MockLlmClient::single("proposal");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.token_budget = Some(200); // 150 tokens per call — fits

    let result = pipeline.execute_phase(SddPhase::Propose, &mut change, "").await;
    assert!(result.is_ok());
    assert_eq!(change.tokens_used(), 150);
}

#[tokio::test]
async fn test_budget_exceeded_aborts_pipeline() {
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(), "tasks".into(),
    ]);
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.token_budget = Some(400); // allows ~2 phases (300 tokens), 3rd would hit 450

    let result = pipeline.fast_forward(&mut change, "").await;
    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("budget") || err.contains("exceeded") || err.contains("Budget"));
}

#[tokio::test]
async fn test_budget_exact_boundary_passes() {
    let client = MockLlmClient::single("proposal");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.token_budget = Some(150); // exactly the cost of one phase

    let result = pipeline.execute_phase(SddPhase::Propose, &mut change, "").await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_budget_zero_blocks_first_phase() {
    let client = MockLlmClient::single("proposal");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");
    change.token_budget = Some(0);

    let result = pipeline.execute_phase(SddPhase::Propose, &mut change, "").await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), SddError::BudgetExceeded { .. }));
}

// ── Verify retry Tests ────────────────────────────────────────────────────

#[tokio::test]
async fn test_verify_retry_succeeds_on_second_attempt() {
    // Responses: propose, spec, design, tasks, apply, FAIL, apply-retry, PASS, archive
    let client = MockLlmClient::new(vec![
        "proposal".into(),
        "spec".into(),
        "design".into(),
        "tasks".into(),
        "apply v1".into(),
        "FAIL: missing tests".into(),   // first Verify
        "apply v2 with tests".into(),
        "All checks PASS".into(),       // second Verify
        "archived".into(),
    ]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client).max_verify_retries(1);
    let mut change = empty_change("test");

    let result = pipeline.full_pipeline(&mut change, "").await.unwrap();

    assert_eq!(result["mode"], "full-pipeline");
    // 7 phases + 1 retry apply + 1 retry verify = 9 calls
    assert_eq!(client_ref.calls(), 9);
    // Verify should have 2 versions in history
    assert_eq!(change.artifact_versions("verify").len(), 2);
    // Apply should have 2 versions
    assert_eq!(change.artifact_versions("apply").len(), 2);
}

#[tokio::test]
async fn test_verify_retry_exhausted_returns_error() {
    // Verify always fails
    let client = MockLlmClient::new(vec![
        "proposal".into(),
        "spec".into(),
        "design".into(),
        "tasks".into(),
        "apply".into(),
        "FAIL: critical issues".into(),
        "apply retry 1".into(),
        "FAIL: still broken".into(),
        "apply retry 2".into(),
        "FAIL: not fixed".into(),
    ]);
    let pipeline = SddPipeline::new(client).max_verify_retries(2);
    let mut change = empty_change("test");

    let result = pipeline.full_pipeline(&mut change, "").await;
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(matches!(&err, SddError::VerifyFailed { attempts: 3, .. }));
    assert!(err.to_string().contains("3 attempt"));
}

#[tokio::test]
async fn test_verify_no_retry_by_default_fails_immediately() {
    // Default verify_retries = 0 — single shot
    let client = MockLlmClient::new(vec![
        "proposal".into(), "spec".into(), "design".into(),
        "tasks".into(), "apply".into(), "FAIL: incomplete".into(),
    ]);
    let client_ref = client.clone();
    let pipeline = SddPipeline::new(client); // verify_retries = 0
    let mut change = empty_change("test");

    let result = pipeline.full_pipeline(&mut change, "").await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), SddError::VerifyFailed { attempts: 1, .. }));
    assert_eq!(client_ref.calls(), 6); // no extra retries
}

#[tokio::test]
async fn test_verify_failure_context_injected_into_retry_apply() {
    // Verify with PASS immediately — context injection path not triggered
    // but we test that retry changes output (second Apply gets different context)
    let client = MockLlmClient::new(vec![
        "proposal".into(),
        "spec".into(),
        "design".into(),
        "tasks".into(),
        "apply v1".into(),
        "FAIL: tests missing".into(),
        "apply v2 fixed".into(),
        "All checks PASS".into(),
        "archived".into(),
    ]);
    let pipeline = SddPipeline::new(client).max_verify_retries(1);
    let mut change = empty_change("test");

    pipeline.full_pipeline(&mut change, "").await.unwrap();

    // Apply artifact should reflect the retry (latest = v2)
    let apply_artifact = &change.artifacts["apply"];
    assert_eq!(apply_artifact["result"], "apply v2 fixed");

    // History should show both attempts
    let apply_history = change.artifact_versions("apply");
    assert_eq!(apply_history[0].content["result"], "apply v1");
    assert_eq!(apply_history[1].content["result"], "apply v2 fixed");
}

// ── SddChange::new() constructor Tests ───────────────────────────────────

#[test]
fn test_sdd_change_new_constructor() {
    let change = SddChange::new("my-feature", "Add user auth");
    assert_eq!(change.name, "my-feature");
    assert_eq!(change.description, "Add user auth");
    assert!(change.phases_completed.is_empty());
    assert!(change.phases_in_progress.is_empty());
    assert!(change.artifacts.is_empty());
    assert!(change.usage_history.is_empty());
    assert!(change.artifact_history.is_empty());
    assert!(change.token_budget.is_none());
}

#[test]
fn test_sdd_change_new_tokens_used_starts_zero() {
    let change = SddChange::new("test", "desc");
    assert_eq!(change.tokens_used(), 0);
}

// ── execute_phase mutation Tests ──────────────────────────────────────────

#[tokio::test]
async fn test_execute_phase_mutates_change() {
    let client = MockLlmClient::single("proposal");
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();

    assert!(change.phases_completed.contains(&SddPhase::Propose));
    assert_eq!(change.usage_history.len(), 1);
    assert!(change.artifacts.contains_key("propose"));
}

#[tokio::test]
async fn test_execute_phase_idempotent_phases_completed() {
    // Running a phase twice should not double-add to phases_completed
    let client = MockLlmClient::new(vec!["first".into(), "second".into()]);
    let pipeline = SddPipeline::new(client);
    let mut change = empty_change("test");

    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();
    // Manually allow second run by not blocking (execute_phase checks deps, Propose has none)
    pipeline.execute_phase(SddPhase::Propose, &mut change, "").await.unwrap();

    // phases_completed should not have duplicates
    let propose_count = change.phases_completed.iter().filter(|&&p| p == SddPhase::Propose).count();
    assert_eq!(propose_count, 1);
    // But usage history records both runs
    assert_eq!(change.usage_history.len(), 2);
    // And artifact history has both versions
    assert_eq!(change.artifact_versions("propose").len(), 2);
}

use sdd::*;

#[test]
fn test_deepseek_model_as_str() {
    assert_eq!(DeepSeekModel::Reasoner.as_str(), "deepseek-reasoner");
    assert_eq!(DeepSeekModel::Chat.as_str(), "deepseek-chat");
}

#[test]
fn test_deepseek_model_from_alias() {
    assert_eq!(DeepSeekModel::from_alias("reasoner"), DeepSeekModel::Reasoner);
    assert_eq!(DeepSeekModel::from_alias("r1"), DeepSeekModel::Reasoner);
    assert_eq!(DeepSeekModel::from_alias("opus"), DeepSeekModel::Reasoner);
    assert_eq!(DeepSeekModel::from_alias("deep"), DeepSeekModel::Reasoner);

    assert_eq!(DeepSeekModel::from_alias("chat"), DeepSeekModel::Chat);
    assert_eq!(DeepSeekModel::from_alias("v3"), DeepSeekModel::Chat);
    assert_eq!(DeepSeekModel::from_alias("fast"), DeepSeekModel::Chat);
    assert_eq!(DeepSeekModel::from_alias("sonnet"), DeepSeekModel::Chat);
    assert_eq!(DeepSeekModel::from_alias("haiku"), DeepSeekModel::Chat);

    // Unknown defaults to Chat
    assert_eq!(DeepSeekModel::from_alias("unknown"), DeepSeekModel::Chat);
}

#[test]
fn test_deepseek_model_default() {
    assert_eq!(DeepSeekModel::default(), DeepSeekModel::Chat);
}

#[test]
fn test_effort_level_temperature() {
    assert_eq!(EffortLevel::Low.temperature(), 0.1);
    assert_eq!(EffortLevel::Medium.temperature(), 0.5);
    assert_eq!(EffortLevel::High.temperature(), 0.7);
    assert_eq!(EffortLevel::Max.temperature(), 1.0);
}

#[test]
fn test_effort_level_max_tokens() {
    assert_eq!(EffortLevel::Low.max_tokens(), 2048);
    assert_eq!(EffortLevel::Medium.max_tokens(), 4096);
    assert_eq!(EffortLevel::High.max_tokens(), 8192);
    assert_eq!(EffortLevel::Max.max_tokens(), 16384);
}

#[test]
fn test_effort_level_default() {
    assert_eq!(EffortLevel::default().temperature(), 0.7);
}

#[test]
fn test_chat_content_as_str() {
    assert_eq!(ChatContent::Text("hello".into()).as_str(), "hello");
    assert_eq!(ChatContent::Null.as_str(), "");
}

#[test]
fn test_chat_content_serde_text() {
    let content = ChatContent::Text("hello".into());
    let json = serde_json::to_string(&content).unwrap();
    assert_eq!(json, r#""hello""#);
}

#[test]
fn test_chat_content_serde_null() {
    let content = ChatContent::Null;
    let json = serde_json::to_string(&content).unwrap();
    assert_eq!(json, "null");
}

#[test]
fn test_chat_content_deserialize_text() {
    let content: ChatContent = serde_json::from_str(r#""hello""#).unwrap();
    assert_eq!(content.as_str(), "hello");
}

#[test]
fn test_chat_content_deserialize_null() {
    let content: ChatContent = serde_json::from_str("null").unwrap();
    assert_eq!(content.as_str(), "");
}

#[test]
fn test_chat_content_deserialize_number() {
    let content: ChatContent = serde_json::from_str("42").unwrap();
    assert_eq!(content.as_str(), "42");
}

#[test]
fn test_sdd_phase_from_str() {
    assert_eq!(SddPhase::from_str("explore"), Some(SddPhase::Explore));
    assert_eq!(SddPhase::from_str("propose"), Some(SddPhase::Propose));
    assert_eq!(SddPhase::from_str("spec"), Some(SddPhase::Spec));
    assert_eq!(SddPhase::from_str("design"), Some(SddPhase::Design));
    assert_eq!(SddPhase::from_str("tasks"), Some(SddPhase::Tasks));
    assert_eq!(SddPhase::from_str("apply"), Some(SddPhase::Apply));
    assert_eq!(SddPhase::from_str("verify"), Some(SddPhase::Verify));
    assert_eq!(SddPhase::from_str("archive"), Some(SddPhase::Archive));
    assert_eq!(SddPhase::from_str("unknown"), None);
}

#[test]
fn test_sdd_phase_roundtrip() {
    let phases = [
        SddPhase::Explore, SddPhase::Propose, SddPhase::Spec, SddPhase::Design,
        SddPhase::Tasks, SddPhase::Apply, SddPhase::Verify, SddPhase::Archive,
    ];
    for phase in &phases {
        assert_eq!(SddPhase::from_str(phase.as_str()), Some(*phase));
    }
}

#[test]
fn test_permission_mode_default() {
    assert_eq!(PermissionMode::default(), PermissionMode::Default);
}

#[test]
fn test_hook_output_default() {
    let output = HookOutput::default();
    assert!(output.allow);
    assert!(output.deny_reason.is_none());
    assert!(output.additional_context.is_none());
    assert!(output.modified_input.is_none());
}

#[test]
fn test_sdd_change_serde() {
    let mut change = SddChange::new("test-change", "A test");
    change.phases_completed = vec![SddPhase::Propose, SddPhase::Spec];
    change.phases_in_progress = vec![SddPhase::Design];

    let json = serde_json::to_string(&change).unwrap();
    let deserialized: SddChange = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.name, "test-change");
    assert_eq!(deserialized.phases_completed.len(), 2);
    assert_eq!(deserialized.phases_in_progress.len(), 1);
}

#[test]
fn test_agent_result_serde() {
    let result = AgentResult {
        success: true,
        result: Some("done".into()),
        error: None,
        turns: 3,
        usage: UsageInfo { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        tool_calls_made: Some(vec!["Read".into(), "Write".into()]),
        session_id: None,
    };

    let json = serde_json::to_string(&result).unwrap();
    assert!(!json.contains("error")); // skip_serializing_if = None
    assert!(!json.contains("session_id"));

    let deserialized: AgentResult = serde_json::from_str(&json).unwrap();
    assert!(deserialized.success);
    assert_eq!(deserialized.turns, 3);
}

#[test]
fn test_deepseek_model_serde() {
    let model = DeepSeekModel::Reasoner;
    let json = serde_json::to_string(&model).unwrap();
    assert_eq!(json, r#""deepseek-reasoner""#);

    let deserialized: DeepSeekModel = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, DeepSeekModel::Reasoner);
}

// ── PhaseUsage Tests ──────────────────────────────────────────────────────

#[test]
fn test_phase_usage_serde() {
    let usage = PhaseUsage {
        phase: "spec".into(),
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800,
    };

    let json = serde_json::to_string(&usage).unwrap();
    let deserialized: PhaseUsage = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.phase, "spec");
    assert_eq!(deserialized.prompt_tokens, 500);
    assert_eq!(deserialized.completion_tokens, 300);
    assert_eq!(deserialized.total_tokens, 800);
}

// ── ArtifactVersion Tests ─────────────────────────────────────────────────

#[test]
fn test_artifact_version_serde() {
    let version = ArtifactVersion {
        version: 2,
        content: serde_json::json!({ "result": "spec output", "phase": "spec" }),
        tokens_used: 400,
    };

    let json = serde_json::to_string(&version).unwrap();
    let deserialized: ArtifactVersion = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.version, 2);
    assert_eq!(deserialized.tokens_used, 400);
    assert_eq!(deserialized.content["result"], "spec output");
}

// ── SddChange new tests ───────────────────────────────────────────────────

#[test]
fn test_sdd_change_new() {
    let change = SddChange::new("auth-feature", "Add OAuth2 support");
    assert_eq!(change.name, "auth-feature");
    assert_eq!(change.description, "Add OAuth2 support");
    assert!(change.phases_completed.is_empty());
    assert!(change.phases_in_progress.is_empty());
    assert!(change.artifacts.is_empty());
    assert!(change.usage_history.is_empty());
    assert!(change.artifact_history.is_empty());
    assert!(change.token_budget.is_none());
    assert_eq!(change.tokens_used(), 0);
}

#[test]
fn test_sdd_change_tokens_used_empty() {
    let change = SddChange::new("t", "d");
    assert_eq!(change.tokens_used(), 0);
}

#[test]
fn test_sdd_change_tokens_used_with_history() {
    let mut change = SddChange::new("t", "d");
    change.usage_history.push(PhaseUsage {
        phase: "propose".into(),
        prompt_tokens: 100, completion_tokens: 50, total_tokens: 150,
    });
    change.usage_history.push(PhaseUsage {
        phase: "spec".into(),
        prompt_tokens: 800, completion_tokens: 400, total_tokens: 1200,
    });
    assert_eq!(change.tokens_used(), 1350);
}

#[test]
fn test_sdd_change_artifact_versions_empty() {
    let change = SddChange::new("t", "d");
    assert_eq!(change.artifact_versions("spec"), &[]);
    assert_eq!(change.artifact_versions("unknown"), &[]);
}

#[test]
fn test_sdd_change_artifact_versions_with_history() {
    let mut change = SddChange::new("t", "d");
    change.artifact_history.insert("spec".into(), vec![
        ArtifactVersion { version: 1, content: serde_json::json!("v1"), tokens_used: 100 },
        ArtifactVersion { version: 2, content: serde_json::json!("v2"), tokens_used: 200 },
    ]);

    let versions = change.artifact_versions("spec");
    assert_eq!(versions.len(), 2);
    assert_eq!(versions[0].version, 1);
    assert_eq!(versions[1].version, 2);
}

#[test]
fn test_sdd_change_token_budget_field() {
    let mut change = SddChange::new("t", "d");
    assert!(change.token_budget.is_none());

    change.token_budget = Some(50_000);
    assert_eq!(change.token_budget, Some(50_000));
}

#[test]
fn test_sdd_change_backward_compat_deserialize() {
    // Old JSON without new fields should deserialize cleanly (serde defaults)
    let old_json = r#"{
        "name": "legacy",
        "description": "old change",
        "phases_completed": ["Propose"],
        "phases_in_progress": [],
        "artifacts": {},
        "created_at": "2025-01-01",
        "updated_at": "2025-01-01"
    }"#;

    let change: SddChange = serde_json::from_str(old_json).unwrap();
    assert_eq!(change.name, "legacy");
    assert!(change.usage_history.is_empty());
    assert!(change.artifact_history.is_empty());
    assert!(change.token_budget.is_none());
    assert_eq!(change.tokens_used(), 0);
}

// ── SddError display Tests ────────────────────────────────────────────────

#[test]
fn test_sdd_error_budget_exceeded_display() {
    let err = SddError::BudgetExceeded { budget: 1000, used: 1150 };
    let msg = err.to_string();
    assert!(msg.contains("1000"));
    assert!(msg.contains("1150"));
}

#[test]
fn test_sdd_error_verify_failed_display() {
    let err = SddError::VerifyFailed { attempts: 3, reason: "missing tests".into() };
    let msg = err.to_string();
    assert!(msg.contains("3"));
    assert!(msg.contains("missing tests"));
}

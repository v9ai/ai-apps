use sdd::*;

#[test]
fn test_hook_registry_fire_no_hooks() {
    let registry = HookRegistry::new();
    let input = HookInput {
        event: HookEvent::PreToolUse,
        tool_name: Some("Read".into()),
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = registry.fire(&input);
    assert!(output.allow);
    assert!(output.deny_reason.is_none());
}

#[test]
fn test_block_tools_hook_blocks() {
    let hook = block_tools_hook(vec!["Bash".into(), "Write".into()]);
    let input = HookInput {
        event: HookEvent::PreToolUse,
        tool_name: Some("Bash".into()),
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = hook(&input);
    assert!(!output.allow);
    assert!(output.deny_reason.unwrap().contains("Bash"));
}

#[test]
fn test_block_tools_hook_allows() {
    let hook = block_tools_hook(vec!["Bash".into()]);
    let input = HookInput {
        event: HookEvent::PreToolUse,
        tool_name: Some("Read".into()),
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = hook(&input);
    assert!(output.allow);
}

#[test]
fn test_context_injection_hook() {
    let hook = context_injection_hook("injected context".into());
    let input = HookInput {
        event: HookEvent::PostToolUse,
        tool_name: None,
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = hook(&input);
    assert!(output.allow);
    assert_eq!(output.additional_context.unwrap(), "injected context");
}

#[test]
fn test_sdd_phase_guard_hook_allows_when_deps_met() {
    let hook = sdd_phase_guard_hook(vec![SddPhase::Propose]);
    let input = HookInput {
        event: HookEvent::PrePhase,
        tool_name: None,
        tool_input: None,
        tool_output: None,
        phase_name: Some("spec".into()),
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = hook(&input);
    assert!(output.allow);
}

#[test]
fn test_sdd_phase_guard_hook_blocks_when_deps_not_met() {
    let hook = sdd_phase_guard_hook(vec![]);
    let input = HookInput {
        event: HookEvent::PrePhase,
        tool_name: None,
        tool_input: None,
        tool_output: None,
        phase_name: Some("spec".into()),
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = hook(&input);
    assert!(!output.allow);
    assert!(output.deny_reason.unwrap().contains("propose"));
}

#[test]
fn test_hook_builder() {
    let registry = HookBuilder::new()
        .pre_tool_use("Bash", block_tools_hook(vec!["Bash".into()]))
        .on_phase_start(context_injection_hook("phase context".into()))
        .build();

    assert!(registry.has_hooks(&HookEvent::PreToolUse));
    assert!(registry.has_hooks(&HookEvent::PrePhase));
    assert!(!registry.has_hooks(&HookEvent::PostToolUse));
}

#[test]
fn test_hook_registry_matcher_pipe_separated() {
    let registry = HookBuilder::new()
        .pre_tool_use("Edit|Write", block_tools_hook(vec!["Edit".into(), "Write".into()]))
        .build();

    let edit_input = HookInput {
        event: HookEvent::PreToolUse,
        tool_name: Some("Edit".into()),
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = registry.fire(&edit_input);
    assert!(!output.allow);

    let read_input = HookInput {
        event: HookEvent::PreToolUse,
        tool_name: Some("Read".into()),
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };
    let output = registry.fire(&read_input);
    assert!(output.allow);
}

#[test]
fn test_hook_registry_multiple_hooks_combined() {
    let mut registry = HookRegistry::new();

    // First hook: inject context
    registry.on(HookEvent::PostToolUse, HookMatcher {
        matcher: None,
        hooks: vec![context_injection_hook("ctx1".into())],
    });

    // Second hook: also inject context
    registry.on(HookEvent::PostToolUse, HookMatcher {
        matcher: None,
        hooks: vec![context_injection_hook("ctx2".into())],
    });

    let input = HookInput {
        event: HookEvent::PostToolUse,
        tool_name: None,
        tool_input: None,
        tool_output: None,
        phase_name: None,
        session_id: None,
        agent_name: None,
        error: None,
    };

    let output = registry.fire(&input);
    assert!(output.allow);
    let ctx = output.additional_context.unwrap();
    assert!(ctx.contains("ctx1"));
    assert!(ctx.contains("ctx2"));
}

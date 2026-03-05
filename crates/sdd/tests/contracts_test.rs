use sdd::contracts::*;

#[test]
fn backward_compatible_when_no_removals() {
    let old = Contract::new("auth", 1, CompatibilityMode::Backward)
        .with_requirements(["REQ-001", "REQ-002"]);
    let new = Contract::new("auth", 2, CompatibilityMode::Backward)
        .with_requirements(["REQ-001", "REQ-002", "REQ-003"]);

    let result = check_compatibility(&old, &new);
    assert!(result.compatible);
    assert!(result.breaking_changes.is_empty());
    assert_eq!(result.additions, vec!["REQ-003"]);
    assert!(result.removals.is_empty());
}

#[test]
fn backward_incompatible_on_removal() {
    let old = Contract::new("auth", 1, CompatibilityMode::Backward)
        .with_requirements(["REQ-001", "REQ-002"]);
    let new = Contract::new("auth", 2, CompatibilityMode::Backward)
        .with_requirements(["REQ-001"]);

    let result = check_compatibility(&old, &new);
    assert!(!result.compatible);
    assert_eq!(result.breaking_changes, vec!["REQ-002"]);
    assert_eq!(result.removals, vec!["REQ-002"]);
}

#[test]
fn forward_incompatible_on_addition() {
    let old = Contract::new("api", 1, CompatibilityMode::Forward)
        .with_requirements(["REQ-001"]);
    let new = Contract::new("api", 2, CompatibilityMode::Forward)
        .with_requirements(["REQ-001", "REQ-002"]);

    let result = check_compatibility(&old, &new);
    assert!(!result.compatible);
    assert_eq!(result.breaking_changes, vec!["REQ-002"]);
}

#[test]
fn full_mode_breaks_on_any_change() {
    let old = Contract::new("core", 1, CompatibilityMode::Full)
        .with_requirements(["REQ-001", "REQ-002"]);
    let new = Contract::new("core", 2, CompatibilityMode::Full)
        .with_requirements(["REQ-001", "REQ-003"]);

    let result = check_compatibility(&old, &new);
    assert!(!result.compatible);
    assert!(result.breaking_changes.contains(&"REQ-002".to_string()));
    assert!(result.breaking_changes.contains(&"REQ-003".to_string()));
}

#[test]
fn none_mode_always_compatible() {
    let old = Contract::new("lib", 1, CompatibilityMode::None)
        .with_requirements(["REQ-001"]);
    let new = Contract::new("lib", 2, CompatibilityMode::None)
        .with_requirements(["REQ-999"]);

    let result = check_compatibility(&old, &new);
    assert!(result.compatible);
    assert!(result.breaking_changes.is_empty());
}

#[test]
fn identical_contracts_always_compatible() {
    let old = Contract::new("x", 1, CompatibilityMode::Full)
        .with_requirements(["REQ-001", "REQ-002"]);
    let new = Contract::new("x", 2, CompatibilityMode::Full)
        .with_requirements(["REQ-001", "REQ-002"]);

    let result = check_compatibility(&old, &new);
    assert!(result.compatible);
    assert!(result.additions.is_empty());
    assert!(result.removals.is_empty());
}

#[test]
fn extract_requirements_finds_ids() {
    let spec = "This spec covers REQ-001 and REQ-auth-login. Also [REQ-002] is referenced.";
    let reqs = extract_requirements(spec);
    assert!(reqs.contains(&"REQ-001".to_string()));
    assert!(reqs.contains(&"REQ-auth-login".to_string()));
    assert!(reqs.contains(&"REQ-002".to_string()));
}

#[test]
fn extract_requirements_empty_on_no_match() {
    let reqs = extract_requirements("No requirements here.");
    assert!(reqs.is_empty());
}

#[test]
fn extract_requirements_deduplicates() {
    let spec = "REQ-001 appears twice: REQ-001 and [REQ-001].";
    let reqs = extract_requirements(spec);
    assert_eq!(reqs.len(), 1);
    assert_eq!(reqs[0], "REQ-001");
}

#[test]
fn empty_contracts_always_compatible() {
    let old = Contract::new("svc", 1, CompatibilityMode::Full);
    let new = Contract::new("svc", 2, CompatibilityMode::Full);
    let result = check_compatibility(&old, &new);
    assert!(result.compatible);
    assert!(result.breaking_changes.is_empty());
    assert!(result.additions.is_empty());
    assert!(result.removals.is_empty());
}

#[test]
fn forward_compatible_on_removal() {
    // Forward mode: additions are breaking, removals are NOT
    let old = Contract::new("api", 1, CompatibilityMode::Forward)
        .with_requirements(["REQ-001", "REQ-002"]);
    let new = Contract::new("api", 2, CompatibilityMode::Forward)
        .with_requirements(["REQ-001"]);

    let result = check_compatibility(&old, &new);
    assert!(result.compatible); // removals don't break forward compat
    assert!(result.breaking_changes.is_empty());
    assert_eq!(result.removals, vec!["REQ-002"]);
}

#[test]
fn extract_requirements_bracketed_only() {
    let spec = "See [REQ-alpha] and [REQ-beta-2] for details.";
    let reqs = extract_requirements(spec);
    assert!(reqs.contains(&"REQ-alpha".to_string()));
    assert!(reqs.contains(&"REQ-beta-2".to_string()));
}

#[test]
fn extract_requirements_ignores_non_req_brackets() {
    let spec = "The [config] section and [REQ-valid] reference.";
    let reqs = extract_requirements(spec);
    assert_eq!(reqs.len(), 1);
    assert_eq!(reqs[0], "REQ-valid");
}

#[test]
fn extract_requirements_unclosed_bracket() {
    let spec = "See [REQ-001 without closing bracket";
    let reqs = extract_requirements(spec);
    // The whitespace-split strategy should still find REQ-001
    // but the bracketed form won't match due to missing ]
    assert!(reqs.contains(&"REQ-001".to_string()));
}

#[test]
fn compatibility_mode_serde_roundtrip() {
    let modes = [
        CompatibilityMode::Backward,
        CompatibilityMode::Forward,
        CompatibilityMode::Full,
        CompatibilityMode::None,
    ];
    for mode in &modes {
        let json = serde_json::to_string(mode).unwrap();
        let back: CompatibilityMode = serde_json::from_str(&json).unwrap();
        assert_eq!(*mode, back);
    }
}

#[test]
fn contract_serde_roundtrip() {
    let contract = Contract::new("auth", 3, CompatibilityMode::Backward)
        .with_requirements(["REQ-001", "REQ-002"]);
    let json = serde_json::to_string(&contract).unwrap();
    let back: Contract = serde_json::from_str(&json).unwrap();
    assert_eq!(contract, back);
}

#[test]
fn compatibility_result_serde_roundtrip() {
    let result = CompatibilityResult {
        compatible: false,
        breaking_changes: vec!["REQ-002".into()],
        additions: vec!["REQ-003".into()],
        removals: vec!["REQ-002".into()],
    };
    let json = serde_json::to_string(&result).unwrap();
    let back: CompatibilityResult = serde_json::from_str(&json).unwrap();
    assert_eq!(result, back);
}

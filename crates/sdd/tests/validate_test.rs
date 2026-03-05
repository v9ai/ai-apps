use sdd::validate::*;

const GOOD_SPEC: &str = r#"
# Spec: Add Authentication

## ADDED
- REQ-001: User login endpoint
- REQ-002: JWT token generation

## MODIFIED
- REQ-003: Session handling updated

## REMOVED
- REQ-004: Legacy cookie auth

## Scenarios

### Login
Given a valid username and password
When the user submits the login form
Then a JWT token MUST be returned

### Invalid Login
Given an invalid password
When the user submits the login form
Then a 401 error SHOULD be returned
"#;

const MINIMAL_SPEC: &str = "Just some text with no structure at all.";

#[test]
fn requirements_present_passes_with_sections() {
    let r = requirements_present(GOOD_SPEC);
    assert!(r.passed);
    assert_eq!(r.rule, "requirements_present");
}

#[test]
fn requirements_present_fails_without_sections() {
    let r = requirements_present(MINIMAL_SPEC);
    assert!(!r.passed);
}

#[test]
fn scenarios_present_passes_with_gwt() {
    let r = scenarios_present(GOOD_SPEC);
    assert!(r.passed);
}

#[test]
fn scenarios_present_fails_without_gwt() {
    let r = scenarios_present(MINIMAL_SPEC);
    assert!(!r.passed);
    assert!(r.message.contains("Given"));
}

#[test]
fn rfc2119_passes_with_keywords() {
    let r = rfc2119_used(GOOD_SPEC);
    assert!(r.passed);
    assert!(r.message.contains("MUST"));
}

#[test]
fn rfc2119_fails_without_keywords() {
    let r = rfc2119_used(MINIMAL_SPEC);
    assert!(!r.passed);
}

#[test]
fn no_contradictions_passes_clean_spec() {
    let r = no_contradictions(GOOD_SPEC);
    assert!(r.passed);
}

#[test]
fn no_contradictions_detects_conflict() {
    let spec = r#"
## ADDED
- user auth

## REMOVED
- user auth
"#;
    let r = no_contradictions(spec);
    assert!(!r.passed);
    assert!(r.message.contains("user auth"));
}

#[test]
fn validate_spec_all_pass() {
    let rules = builtin_rules();
    let result = validate_spec(GOOD_SPEC, &rules);
    assert!(result.passed);
    assert!(result.warnings.is_empty());
    assert_eq!(result.results.len(), 4);
}

#[test]
fn validate_spec_partial_fail() {
    let rules = builtin_rules();
    let result = validate_spec(MINIMAL_SPEC, &rules);
    assert!(!result.passed);
    assert!(!result.warnings.is_empty());
}

#[test]
fn validate_spec_empty_input() {
    let rules = builtin_rules();
    let result = validate_spec("", &rules);
    assert!(!result.passed);
}

#[test]
fn validate_spec_custom_rules() {
    let custom = vec![
        ValidationRule {
            name: "has_title",
            check: |spec: &str| RuleResult {
                rule: "has_title".into(),
                passed: spec.contains('#'),
                message: if spec.contains('#') { "Title found".into() } else { "No title".into() },
            },
        },
    ];
    let result = validate_spec("# My Spec", &custom);
    assert!(result.passed);
}

#[test]
fn rfc2119_finds_multiword_keywords() {
    let spec = "The system MUST NOT allow unauthenticated access. Logging SHOULD NOT be disabled.";
    let r = rfc2119_used(spec);
    assert!(r.passed);
    assert!(r.message.contains("MUST NOT"));
    assert!(r.message.contains("SHOULD NOT"));
}

#[test]
fn rfc2119_finds_shall_and_optional() {
    let spec = "The service SHALL respond within 100ms. Caching is OPTIONAL.";
    let r = rfc2119_used(spec);
    assert!(r.passed);
    assert!(r.message.contains("SHALL"));
    assert!(r.message.contains("OPTIONAL"));
}

#[test]
fn scenarios_present_missing_only_then() {
    let spec = "Given a user\nWhen they login\nBut no then keyword here";
    let r = scenarios_present(spec);
    assert!(!r.passed);
    assert!(r.message.contains("Then"));
    assert!(!r.message.contains("Given"));
    assert!(!r.message.contains("When"));
}

#[test]
fn no_contradictions_with_different_items() {
    let spec = r#"
## ADDED
- feature alpha

## REMOVED
- feature beta
"#;
    let r = no_contradictions(spec);
    assert!(r.passed);
}

#[test]
fn no_contradictions_multiple_conflicts() {
    let spec = r#"
## ADDED
- auth module
- cache layer

## REMOVED
- auth module
- cache layer
"#;
    let r = no_contradictions(spec);
    assert!(!r.passed);
    assert!(r.message.contains("auth module"));
    assert!(r.message.contains("cache layer"));
}

#[test]
fn validate_spec_single_rule_passes() {
    let rules = vec![
        ValidationRule { name: "requirements_present", check: requirements_present },
    ];
    let result = validate_spec("## ADDED\n- something", &rules);
    assert!(result.passed);
    assert_eq!(result.results.len(), 1);
    assert!(result.warnings.is_empty());
}

#[test]
fn validate_spec_no_rules_passes() {
    let rules: Vec<ValidationRule> = vec![];
    let result = validate_spec("anything", &rules);
    assert!(result.passed);
    assert!(result.results.is_empty());
}

#[test]
fn requirements_present_with_modified_only() {
    let spec = "## MODIFIED\n- existing endpoint updated";
    let r = requirements_present(spec);
    assert!(r.passed);
}

#[test]
fn requirements_present_with_removed_only() {
    let spec = "## REMOVED\n- deprecated feature";
    let r = requirements_present(spec);
    assert!(r.passed);
}

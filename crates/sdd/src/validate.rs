//! Spec validation framework — pure functions for validating spec artifacts.
//!
//! No LLM dependency. Rules are simple `fn(&str) -> RuleResult` checks.

use serde::{Deserialize, Serialize};

/// Outcome of a single validation rule.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuleResult {
    pub rule: String,
    pub passed: bool,
    pub message: String,
}

/// Aggregate result of running all validation rules on a spec.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ValidationResult {
    pub passed: bool,
    pub results: Vec<RuleResult>,
    pub warnings: Vec<String>,
}

/// A validation rule: a named pure function over spec text.
pub struct ValidationRule {
    pub name: &'static str,
    pub check: fn(&str) -> RuleResult,
}

// ── Built-in Rules ───────────────────────────────────────────────────────

/// Checks for ADDED / MODIFIED / REMOVED sections in the spec.
pub fn requirements_present(spec: &str) -> RuleResult {
    let has_added = spec.contains("ADDED");
    let has_modified = spec.contains("MODIFIED");
    let has_removed = spec.contains("REMOVED");
    let found = has_added || has_modified || has_removed;

    RuleResult {
        rule: "requirements_present".into(),
        passed: found,
        message: if found {
            "Spec contains requirement sections".into()
        } else {
            "Missing ADDED/MODIFIED/REMOVED sections".into()
        },
    }
}

/// Checks for Given/When/Then scenario blocks.
pub fn scenarios_present(spec: &str) -> RuleResult {
    let has_given = spec.contains("Given");
    let has_when = spec.contains("When");
    let has_then = spec.contains("Then");
    let found = has_given && has_when && has_then;

    RuleResult {
        rule: "scenarios_present".into(),
        passed: found,
        message: if found {
            "Spec contains Given/When/Then scenarios".into()
        } else {
            let mut missing = Vec::new();
            if !has_given { missing.push("Given"); }
            if !has_when { missing.push("When"); }
            if !has_then { missing.push("Then"); }
            format!("Missing scenario keywords: {}", missing.join(", "))
        },
    }
}

/// Checks for RFC 2119 keywords (MUST, SHOULD, MAY).
pub fn rfc2119_used(spec: &str) -> RuleResult {
    let keywords = ["MUST NOT", "MUST", "SHALL NOT", "SHALL", "SHOULD NOT",
                     "SHOULD", "MAY", "REQUIRED", "RECOMMENDED", "OPTIONAL"];
    let found: Vec<&str> = keywords.iter().filter(|k| spec.contains(**k)).copied().collect();
    let passed = !found.is_empty();

    RuleResult {
        rule: "rfc2119_used".into(),
        passed,
        message: if passed {
            format!("RFC 2119 keywords found: {}", found.join(", "))
        } else {
            "No RFC 2119 keywords (MUST/SHOULD/MAY) found".into()
        },
    }
}

/// Detects contradictions: same item listed in both ADDED and REMOVED.
pub fn no_contradictions(spec: &str) -> RuleResult {
    let added = extract_items_after(spec, "ADDED");
    let removed = extract_items_after(spec, "REMOVED");

    let contradictions: Vec<String> = added.iter()
        .filter(|item| removed.contains(item))
        .cloned()
        .collect();

    let passed = contradictions.is_empty();

    RuleResult {
        rule: "no_contradictions".into(),
        passed,
        message: if passed {
            "No contradictions between ADDED and REMOVED".into()
        } else {
            format!("Items in both ADDED and REMOVED: {}", contradictions.join(", "))
        },
    }
}

/// Extract bullet/list items following a section keyword.
fn extract_items_after(text: &str, keyword: &str) -> Vec<String> {
    let mut items = Vec::new();
    let mut in_section = false;

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.contains(keyword) {
            in_section = true;
            continue;
        }
        if in_section {
            // Stop at next section or empty line
            if trimmed.is_empty() || trimmed.starts_with('#') ||
               trimmed.contains("ADDED") || trimmed.contains("MODIFIED") || trimmed.contains("REMOVED") {
                in_section = false;
                continue;
            }
            // Strip bullet markers
            let item = trimmed.trim_start_matches('-')
                .trim_start_matches('*')
                .trim_start_matches("- [ ]")
                .trim_start_matches("- [x]")
                .trim();
            if !item.is_empty() {
                items.push(item.to_lowercase());
            }
        }
    }
    items
}

// ── Built-in rule set ────────────────────────────────────────────────────

/// Returns the 4 built-in validation rules.
pub fn builtin_rules() -> Vec<ValidationRule> {
    vec![
        ValidationRule { name: "requirements_present", check: requirements_present },
        ValidationRule { name: "scenarios_present", check: scenarios_present },
        ValidationRule { name: "rfc2119_used", check: rfc2119_used },
        ValidationRule { name: "no_contradictions", check: no_contradictions },
    ]
}

/// Run a set of validation rules against spec text.
pub fn validate_spec(spec_text: &str, rules: &[ValidationRule]) -> ValidationResult {
    let results: Vec<RuleResult> = rules.iter().map(|r| (r.check)(spec_text)).collect();
    let warnings: Vec<String> = results.iter()
        .filter(|r| !r.passed)
        .map(|r| r.message.clone())
        .collect();
    let passed = results.iter().all(|r| r.passed);

    ValidationResult { passed, results, warnings }
}

//! Contract compatibility checking — track spec evolution and check
//! backward/forward compatibility between contract versions.

use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

/// How compatibility is enforced between contract versions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompatibilityMode {
    /// New version must not remove existing requirements.
    Backward,
    /// Old version must be able to satisfy new requirements.
    Forward,
    /// Both backward and forward compatible.
    Full,
    /// No compatibility enforcement.
    None,
}

/// A versioned contract with named requirements.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Contract {
    pub name: String,
    pub version: u32,
    pub requirements: BTreeSet<String>,
    pub mode: CompatibilityMode,
}

impl Contract {
    pub fn new(name: impl Into<String>, version: u32, mode: CompatibilityMode) -> Self {
        Self {
            name: name.into(),
            version,
            requirements: BTreeSet::new(),
            mode,
        }
    }

    pub fn with_requirements(mut self, reqs: impl IntoIterator<Item = impl Into<String>>) -> Self {
        self.requirements = reqs.into_iter().map(Into::into).collect();
        self
    }
}

/// Result of checking compatibility between two contract versions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompatibilityResult {
    pub compatible: bool,
    pub breaking_changes: Vec<String>,
    pub additions: Vec<String>,
    pub removals: Vec<String>,
}

/// Check compatibility between an old and new contract version.
///
/// Uses the **old** contract's `mode` to determine the check:
/// - `Backward`: removals are breaking (consumers depend on old requirements)
/// - `Forward`: additions are breaking (old consumers can't satisfy new)
/// - `Full`: both removals and additions are breaking
/// - `None`: always compatible
pub fn check_compatibility(old: &Contract, new: &Contract) -> CompatibilityResult {
    let additions: Vec<String> = new.requirements.difference(&old.requirements).cloned().collect();
    let removals: Vec<String> = old.requirements.difference(&new.requirements).cloned().collect();

    let breaking_changes = match old.mode {
        CompatibilityMode::Backward => removals.clone(),
        CompatibilityMode::Forward => additions.clone(),
        CompatibilityMode::Full => {
            let mut b = removals.clone();
            b.extend(additions.clone());
            b
        }
        CompatibilityMode::None => vec![],
    };

    let compatible = breaking_changes.is_empty();

    CompatibilityResult { compatible, breaking_changes, additions, removals }
}

/// Extract requirement IDs from spec text.
///
/// Looks for patterns like `REQ-001`, `REQ-auth-login`, or bracketed `[REQ-xxx]`.
pub fn extract_requirements(spec_text: &str) -> Vec<String> {
    let mut reqs = BTreeSet::new();

    for word in spec_text.split_whitespace() {
        let cleaned = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '_');
        if is_requirement_id(cleaned) {
            reqs.insert(cleaned.to_string());
        }
    }

    // Also check for bracketed form [REQ-xxx]
    let mut rest = spec_text;
    while let Some(start) = rest.find("[REQ-") {
        if let Some(end) = rest[start..].find(']') {
            let id = &rest[start + 1..start + end];
            if is_requirement_id(id) {
                reqs.insert(id.to_string());
            }
            rest = &rest[start + end..];
        } else {
            break;
        }
    }

    reqs.into_iter().collect()
}

fn is_requirement_id(s: &str) -> bool {
    s.starts_with("REQ-") && s.len() > 4
}

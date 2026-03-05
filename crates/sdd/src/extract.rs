//! JSON extraction utilities for parsing structured output from LLM text.
//!
//! Pure functions — no dependencies on other crate modules.

use serde_json::Value;

/// Try to extract a JSON value from LLM text using 4 strategies:
/// 1. Whole text as JSON
/// 2. ```json fenced blocks
/// 3. First `{...}` substring
/// 4. First `[...]` substring
pub fn extract_json(text: &str) -> Option<Value> {
    let trimmed = text.trim();

    // Strategy 1: whole text
    if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
        return Some(v);
    }

    // Strategy 2: ```json fences
    if let Some(start) = trimmed.find("```json") {
        let after = &trimmed[start + 7..];
        if let Some(end) = after.find("```") {
            let block = after[..end].trim();
            if let Ok(v) = serde_json::from_str::<Value>(block) {
                return Some(v);
            }
        }
    }

    // Strategy 3: first {...} substring
    if let Some(obj) = extract_balanced(trimmed, '{', '}') {
        if let Ok(v) = serde_json::from_str::<Value>(obj) {
            return Some(v);
        }
    }

    // Strategy 4: first [...] substring
    if let Some(arr) = extract_balanced(trimmed, '[', ']') {
        if let Ok(v) = serde_json::from_str::<Value>(arr) {
            return Some(v);
        }
    }

    None
}

/// Extract + validate that required top-level keys exist.
pub fn extract_validated(text: &str, required_keys: &[&str]) -> Option<Value> {
    let value = extract_json(text)?;
    let obj = value.as_object()?;
    for key in required_keys {
        if !obj.contains_key(*key) {
            return None;
        }
    }
    Some(value)
}

/// Find the first balanced substring delimited by `open`/`close`.
fn extract_balanced(text: &str, open: char, close: char) -> Option<&str> {
    let start = text.find(open)?;
    let mut depth = 0i32;
    let mut in_string = false;
    let mut escape_next = false;

    for (i, ch) in text[start..].char_indices() {
        if escape_next {
            escape_next = false;
            continue;
        }
        if ch == '\\' && in_string {
            escape_next = true;
            continue;
        }
        if ch == '"' {
            in_string = !in_string;
            continue;
        }
        if in_string {
            continue;
        }
        if ch == open {
            depth += 1;
        } else if ch == close {
            depth -= 1;
            if depth == 0 {
                return Some(&text[start..start + i + close.len_utf8()]);
            }
        }
    }
    None
}

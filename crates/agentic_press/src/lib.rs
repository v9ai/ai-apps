pub mod agent_teams;
pub mod pipeline;
pub mod prompts;
pub mod publisher;
pub mod research_phase;

pub use pipeline::{PipelineResult, TopicResult};

/// Convert a title/string into a URL-safe slug.
pub fn slugify(s: &str) -> String {
    let raw: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect();
    raw.split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Strip leading ` ```<tag>\n ` and trailing ` ``` ` markdown fences from a string.
/// Handles any fence type: ```json, ```markdown, ```md, ```text, bare ```, etc.
/// Returns the input unchanged if no fences are found.
pub fn strip_fences(s: &str) -> &str {
    let trimmed = s.trim();
    let body = if trimmed.starts_with("```") {
        trimmed.find('\n').map(|i| &trimmed[i + 1..]).unwrap_or(trimmed)
    } else {
        trimmed
    };
    body.strip_suffix("```").unwrap_or(body).trim()
}
